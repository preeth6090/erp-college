import { NextResponse, type NextRequest } from 'next/server';

// Lightweight gate: anything outside the public routes needs a session cookie.
// Real verification + role checks happen in getUser()/requireRole() on the server.
const PUBLIC = ['/login', '/apply', '/track-application', '/verify-certificate', '/forbidden'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/' || PUBLIC.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (!req.cookies.get('erp_session')) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
