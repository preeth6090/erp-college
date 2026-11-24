import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';
import { MODULES, type Level, type ModuleKey } from './modules';
import { getLicense, licenseProblem } from './license';

const COOKIE = 'erp_session';
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters.');
    return new TextEncoder().encode('dev-only-secret-change-me-please-0123456789');
  }
  return new TextEncoder().encode(s);
};

export type Role = 'super_admin' | 'faculty' | 'student' | 'parent' | 'accountant' | 'librarian' | (string & {});
type RoleClaim = { id: number; slug: string; name: string };

/** Permissions granted to a role, e.g. ["fees:view","fees:edit"]. Cached briefly; cleared when roles are edited. */
export const permsForRole = unstable_cache(
  async (roleId: number): Promise<string[]> => {
    const rows = await db.rolePermission.findMany({ where: { role_id: roleId }, select: { permission: { select: { slug: true } } } });
    return rows.map((r) => r.permission.slug);
  },
  ['role-perms'],
  { revalidate: 60, tags: ['perms'] },
);

export async function createSession(userId: number, opts: { role?: RoleClaim | null; hours: number; idleMinutes: number }) {
  const now = Math.floor(Date.now() / 1000);
  const idle = Math.max(1, Math.round(opts.idleMinutes)) * 60;
  const abs = now + Math.round(opts.hours * 3600); // hard cap on one sign-in
  // The role is embedded in the signed token so normal requests need only ONE database lookup.
  const token = await new SignJWT({ uid: userId, role: opts.role ?? null, idle, abs })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.min(now + idle, abs)) // slides forward with activity (see proxy.ts)
    .sign(secret());
  // No maxAge: a session cookie, so closing the browser signs the user out. Nothing is remembered between visits.
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Current signed-in user with role and permissions, or null. Cached per request. */
export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const claim = (payload.role ?? null) as RoleClaim | null;
    const row = await db.user.findUnique({
      where: { id: Number(payload.uid) },
      select: {
        id: true, name: true, email: true, phone: true, status: true, role_id: true, campus_id: true, college_id: true,
        must_change_password: true, password_changed_at: true, access_expires_at: true, last_login_at: true,
      },
    });
    if (!row || row.status !== 'Active') return null;
    if (row.access_expires_at && row.access_expires_at < new Date()) return null; // temporary access ended
    // A password change/reset signs everyone else out.
    if (row.password_changed_at && Number(payload.iat ?? 0) < Math.floor(row.password_changed_at.getTime() / 1000)) return null;
    // Trust the signed role claim while it still matches the user's current role; otherwise reload it.
    let role: RoleClaim | null = claim && claim.id === row.role_id ? claim : null;
    if (!role && row.role_id) role = await db.role.findUnique({ where: { id: row.role_id }, select: { id: true, slug: true, name: true } });
    const perms = role ? await permsForRole(role.id) : [];
    // The software owner can grant/withdraw modules and end an institution's access; owners themselves are never locked out.
    const license = await getLicense();
    const owner = role?.slug === 'owner';
    if (!owner && licenseProblem(license)) return null;
    const enabled = owner || !license.modules ? null : new Set(license.modules);
    return { ...row, role, perms: new Set(perms), enabled, institution: license.institution_name, applyUrl: license.apply_url, idleMinutes: Math.max(1, Math.round(Number(payload.idle ?? 600) / 60)) };
  } catch {
    return null;
  }
});
export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export const isOwner = (u: { role: { slug: string } | null }) => u.role?.slug === 'owner';
/** College administrators and the software owner can do everything their licence allows. */
export const isAdmin = (u: { role: { slug: string } | null }) => u.role?.slug === 'super_admin' || u.role?.slug === 'owner';

/** Can the user open (view) / change (edit) a module? Super admins can do everything. */
export function can(u: SessionUser, module: ModuleKey, level: Level = 'view') {
  if (isOwner(u)) return true;
  if (u.enabled && !u.enabled.has(module)) return false; // module not granted to this institution
  return isAdmin(u) || u.perms.has(`${module}:${level}`);
}

/** Where a user lands after signing in. `enabled` = modules the institution has been granted (null = all). */
export function homeFor(u: { role: { slug: string } | null; perms: Set<string>; enabled?: Set<string> | null }) {
  const slug = u.role?.slug;
  const on = (k: string) => !u.enabled || u.enabled.has(k);
  if (slug === 'owner') return '/owner';
  if (slug === 'student') return '/portal/student';
  if (slug === 'faculty') return '/portal/faculty';
  if (slug === 'parent') return '/portal/parent';
  if (slug === 'super_admin') return (MODULES.find((m) => on(m.key)) ?? { href: '/welcome' }).href;
  // land on the first module they can *work in*, otherwise the first they can view
  const first = MODULES.find((m) => on(m.key) && u.perms.has(`${m.key}:edit`)) ?? MODULES.find((m) => on(m.key) && u.perms.has(`${m.key}:view`));
  return first ? first.href : '/welcome';
}

export function hasRole(user: SessionUser, roles: Role[]) {
  const slug = user.role?.slug;
  return !!slug && (slug === 'super_admin' || slug === 'owner' || roles.includes(slug));
}

/** Page guard for self-service portals: restricts by role slug (these pages are bound to the user's own record). */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.must_change_password) redirect('/account/password');
  if (roles.length && !hasRole(user, roles)) redirect('/forbidden');
  return user;
}

/** Page guard: the user needs `view` (or `edit`) access to a module. */
export async function requireModule(module: ModuleKey, level: Level = 'view'): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.must_change_password) redirect('/account/password');
  if (!can(user, module, level)) redirect('/forbidden');
  return user;
}

/** Page guard for documents/pages shared by staff (module access) and self-service users (roles). */
export async function requireAccess(opts: { module?: ModuleKey; roles?: Role[] }): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.must_change_password) redirect('/account/password');
  const ok = isAdmin(user) || (opts.module && can(user, opts.module)) || (opts.roles && hasRole(user, opts.roles));
  if (!ok) redirect('/forbidden');
  return user;
}

/** Page guard for the owner console. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  if (!isOwner(user)) redirect('/forbidden');
  return user;
}
