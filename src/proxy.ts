import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

// Gate + sliding idle timeout.
//  • anything outside the public routes needs a valid session;
//  • each real request (not link prefetches) pushes the session's expiry forward by the idle period,
//    but never beyond the hard cap set when the user signed in. After that the cookie simply expires.
// Real role/permission checks happen in getUser()/requireModule() on the server.
const PUBLIC = ['/login', '/apply', '/track-application', '/verify-certificate', '/forbidden', '/invite', '/api/leads', '/api/logout', '/api/cron']; // /api/leads checks its own bearer token
const COOKIE = 'erp_session';

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters.');
    return new TextEncoder().encode('dev-only-secret-change-me-please-0123456789');
  }
  return new TextEncoder().encode(s);
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === '/' || PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const token = req.cookies.get(COOKIE)?.value;

  if (!token) return isPublic ? NextResponse.next() : NextResponse.redirect(new URL('/login', req.url));

  let payload;
  try {
    ({ payload } = await jwtVerify(token, secret()));
  } catch {
    // expired (idle too long) or tampered
    const res = isPublic ? NextResponse.next() : NextResponse.redirect(new URL('/login?reason=idle', req.url));
    res.cookies.delete(COOKIE);
    return res;
  }

  const res = NextResponse.next();
  const prefetch = req.headers.get('next-router-prefetch') || req.headers.get('purpose') === 'prefetch' || req.headers.get('sec-purpose')?.includes('prefetch');
  if (!prefetch) {
    const now = Math.floor(Date.now() / 1000);
    const idle = Number(payload.idle ?? 600);
    const abs = Number(payload.abs ?? now + idle);
    const exp = Math.min(now + idle, abs);
    if (exp - now > 5) {
      const fresh = await new SignJWT({ uid: payload.uid, role: payload.role ?? null, idle, abs })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(payload.iat) // keep the original sign-in time (password changes invalidate older sessions)
        .setExpirationTime(exp)
        .sign(secret());
      res.cookies.set(COOKIE, fresh, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    }
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|icon.png|apple-icon.png).*)'] };
