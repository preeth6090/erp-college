import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';

const COOKIE = 'erp_session';
const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters.');
    return new TextEncoder().encode('dev-only-secret-change-me-please-0123456789');
  }
  return new TextEncoder().encode(s);
};

export type Role = 'super_admin' | 'faculty' | 'student' | 'parent' | 'accountant' | 'librarian';

type RoleClaim = { id: number; slug: string; name: string };

export async function createSession(userId: number, remember: boolean, role?: RoleClaim | null) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  // The role is embedded in the signed token so normal requests need only ONE database lookup.
  const token = await new SignJWT({ uid: userId, role: role ?? null })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Current signed-in user (with role), or null. Cached per request. */
export const getUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const claim = (payload.role ?? null) as RoleClaim | null;
    const row = await db.user.findUnique({
      where: { id: Number(payload.uid) },
      select: { id: true, name: true, email: true, phone: true, status: true, role_id: true, campus_id: true, college_id: true },
    });
    if (!row || row.status !== 'Active') return null;
    // Trust the signed role claim while it still matches the user's current role; otherwise reload it.
    let role: RoleClaim | null = claim && claim.id === row.role_id ? claim : null;
    if (!role && row.role_id) {
      const r = await db.role.findUnique({ where: { id: row.role_id }, select: { id: true, slug: true, name: true } });
      role = r;
    }
    return { ...row, role };
  } catch {
    return null;
  }
});
export type SessionUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

export function homeForRole(slug?: string | null) {
  switch (slug) {
    case 'student': return '/portal/student';
    case 'faculty': return '/portal/faculty';
    case 'parent': return '/portal/parent';
    case 'accountant': return '/fees';
    case 'librarian': return '/library';
    default: return '/dashboard';
  }
}

export function hasRole(user: SessionUser, roles: Role[]) {
  const slug = user.role?.slug as Role | undefined;
  return !!slug && (slug === 'super_admin' || roles.includes(slug));
}

/** Use at the top of a page: redirects to login / forbidden when access is not allowed. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  if (roles.length && !hasRole(user, roles)) redirect('/forbidden');
  return user;
}
