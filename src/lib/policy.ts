import 'server-only';
import { unstable_cache } from 'next/cache';
import { randomInt } from 'node:crypto';
import { db } from './db';

export type Policy = {
  min_password_length: number;
  require_complexity: boolean;
  max_failed_attempts: number;
  lockout_minutes: number;
  session_hours: number; // absolute maximum length of one sign-in
  idle_timeout_minutes: number; // auto sign-out after this much inactivity
  password_expiry_days: number; // 0 = never
  force_change_on_first_login: boolean;
  invite_valid_days: number;
};

export const POLICY_DEFAULTS: Policy = {
  min_password_length: 8,
  require_complexity: true,
  max_failed_attempts: 5,
  lockout_minutes: 15,
  session_hours: 10,
  idle_timeout_minutes: 10,
  password_expiry_days: 0,
  force_change_on_first_login: true,
  invite_valid_days: 7,
};

const KEY = (k: string) => `auth.${k}`;

export const getPolicy = unstable_cache(
  async (): Promise<Policy> => {
    const rows = await db.systemSetting.findMany({ where: { key: { startsWith: 'auth.' } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const out: Record<string, unknown> = { ...POLICY_DEFAULTS };
    for (const [k, def] of Object.entries(POLICY_DEFAULTS)) {
      const v = map[KEY(k)];
      if (v == null) continue;
      out[k] = typeof def === 'boolean' ? v === 'true' : Number.isFinite(Number(v)) ? Number(v) : def;
    }
    return out as Policy;
  },
  ['auth-policy'],
  { revalidate: 60, tags: ['policy'] },
);

export async function savePolicy(p: Policy) {
  for (const [k, v] of Object.entries(p)) {
    await db.systemSetting.upsert({
      where: { key: KEY(k) }, update: { value: String(v), group_name: 'auth' }, create: { key: KEY(k), group_name: 'auth', value: String(v) },
    });
  }
}

/** Returns an error message, or null when the password satisfies the policy. */
export function checkPassword(pw: string, p: Policy): string | null {
  if (pw.length < p.min_password_length) return `Password must be at least ${p.min_password_length} characters.`;
  if (p.require_complexity && !(/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)))
    return 'Password must include an uppercase letter, a lowercase letter, a number and a symbol.';
  return null;
}

export function describePolicy(p: Policy) {
  return `At least ${p.min_password_length} characters${p.require_complexity ? ', with upper & lower case, a number and a symbol' : ''}.`;
}

/** Random password that satisfies any policy (≥ 12 chars, all character classes). */
export function generatePassword(len = 12) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#$%&*!'];
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < Math.max(len, 12)) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}
