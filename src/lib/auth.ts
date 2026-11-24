import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';
import { MODULES, type Level, type ModuleKey } from './modules';

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

export async function createSession(userId: number, opts: { role?: RoleClaim | null; hours: number }) {
  const maxAge = Math.round(opts.hours * 3600);
  // The role is embedded in the signed token so normal requests need only ONE database lookup.
  const token = await new SignJWT({ uid: userId, role: opts.role ?? null })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge });
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
    return { ...row, role, perms: new Set(perms) };
  } catch {
    return null;
  }
});
export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export const isAdmin = (u: { role: { slug: string } | null }) => u.role?.slug === 'super_admin';

/** Can the user open (view) / change (edit) a module? Super admins can do everything. */
export function can(u: SessionUser, module: ModuleKey, level: Level = 'view') {
  return isAdmin(u) || u.perms.has(`${module}:${level}`);
}

/** Where a user lands after signing in. */
export function homeFor(u: { role: { slug: string } | null; perms: Set<string> }) {
  const slug = u.role?.slug;
  if (slug === 'super_admin') return '/dashboard';
  if (slug === 'student') return '/portal/student';
  if (slug === 'faculty') return '/portal/faculty';
  if (slug === 'parent') return '/portal/parent';
  // land on the first module they can *work in*, otherwise the first they can view
  const first = MODULES.find((m) => u.perms.has(`${m.key}:edit`)) ?? MODULES.find((m) => u.perms.has(`${m.key}:view`));
  return first ? first.href : '/welcome';
}

export function hasRole(user: SessionUser, roles: Role[]) {
  const slug = user.role?.slug;
  return !!slug && (slug === 'super_admin' || roles.includes(slug));
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
