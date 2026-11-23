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

export async function createSession(userId: number, remember: boolean) {
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const token = await new SignJWT({ uid: userId })
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
    const user = await db.user.findUnique({ where: { id: Number(payload.uid) }, include: { role: true } });
    if (!user || user.status !== 'Active') return null;
    const { password: _pw, ...safe } = user;
    return safe;
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
