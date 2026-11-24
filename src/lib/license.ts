import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from './db';
import { UserError } from './errors';
import { MODULE_KEYS } from './modules';

/** What the software owner has granted this institution. Stored as system settings (license.*). */
export type License = {
  status: 'Active' | 'Suspended';
  valid_until: string | null; // YYYY-MM-DD, null = no end
  max_students: number | null; // null = unlimited
  max_users: number | null; // staff logins; null = unlimited
  modules: string[] | null; // null = every module
  type: string;
  institution_name: string;
};

const K = (k: string) => `license.${k}`;

export const getLicense = unstable_cache(
  async (): Promise<License> => {
    const rows = await db.systemSetting.findMany({ where: { OR: [{ key: { startsWith: 'license.' } }, { key: 'institution_name' }] } });
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
    const num = (v?: string) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
    return {
      status: m[K('status')] === 'Suspended' ? 'Suspended' : 'Active',
      valid_until: m[K('valid_until')] || null,
      max_students: num(m[K('max_students')]),
      max_users: num(m[K('max_users')]),
      modules: m[K('modules')] ? m[K('modules')].split(',').filter((x) => MODULE_KEYS.includes(x as never)) : null,
      type: m[K('type')] || 'college',
      institution_name: m['institution_name'] || '',
    };
  },
  ['license'],
  { revalidate: 60, tags: ['license'] },
);

export async function saveLicense(patch: Partial<License>) {
  const cur = await getLicense();
  const l = { ...cur, ...patch };
  const rows: [string, string][] = [
    [K('status'), l.status], [K('valid_until'), l.valid_until ?? ''], [K('max_students'), l.max_students ? String(l.max_students) : ''],
    [K('max_users'), l.max_users ? String(l.max_users) : ''], [K('modules'), l.modules ? l.modules.join(',') : ''], [K('type'), l.type],
  ];
  for (const [key, value] of rows) await db.systemSetting.upsert({ where: { key }, update: { value, group_name: 'license' }, create: { key, value, group_name: 'license' } });
  if (patch.institution_name !== undefined) {
    await db.systemSetting.upsert({ where: { key: 'institution_name' }, update: { value: l.institution_name }, create: { key: 'institution_name', group_name: 'general', value: l.institution_name } });
  }
}

/** A reason the institution cannot currently use the system, or null when all is well. */
export function licenseProblem(l: License): string | null {
  if (l.status === 'Suspended') return 'This institution’s access is currently suspended. Please contact the software provider.';
  if (l.valid_until && new Date(l.valid_until + 'T23:59:59+05:30') < new Date()) return 'This institution’s subscription has ended. Please contact the software provider to renew.';
  return null;
}

export function daysLeft(l: License): number | null {
  if (!l.valid_until) return null;
  return Math.ceil((new Date(l.valid_until + 'T23:59:59+05:30').getTime() - Date.now()) / 86400000);
}

const NON_STAFF = ['student', 'parent', 'owner'];

export async function usage() {
  const [students, staff] = await Promise.all([
    db.student.count({ where: { status: { not: 'Withdrawn' } } }),
    db.user.count({ where: { status: 'Active', NOT: { role: { slug: { in: NON_STAFF } } } } }),
  ]);
  return { students, staff };
}

export async function assertStudentCapacity(add = 1) {
  const l = await getLicense();
  if (!l.max_students) return;
  const n = await db.student.count({ where: { status: { not: 'Withdrawn' } } });
  if (n + add > l.max_students) throw new UserError(`Student limit reached (${n} of ${l.max_students}). Ask the software owner to raise the limit.`);
}

export async function assertStaffCapacity(roleSlug: string | undefined, add = 1) {
  if (roleSlug && NON_STAFF.includes(roleSlug)) return;
  const l = await getLicense();
  if (!l.max_users) return;
  const n = await db.user.count({ where: { status: 'Active', NOT: { role: { slug: { in: NON_STAFF } } } } });
  if (n + add > l.max_users) throw new UserError(`Staff login limit reached (${n} of ${l.max_users}). Ask the software owner to raise the limit.`);
}
