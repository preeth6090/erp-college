import { NextResponse } from 'next/server';
import { destroySession, getUser } from '@/lib/auth';
import { audit } from '@/lib/action';

/**
 * Signs out and returns to the login page. Public on purpose: the browser calls this when the idle timer runs out,
 * at which moment the session may already have expired on the server.
 */
export async function GET(req: Request) {
  const idle = new URL(req.url).searchParams.get('reason') === 'idle';
  const user = await getUser();
  if (user) await audit(user, idle ? 'LOGOUT_IDLE' : 'LOGOUT', 'Auth', `${idle ? 'Signed out after inactivity' : 'User signed out'}: ${user.email}`);
  await destroySession();
  const res = NextResponse.redirect(new URL(idle ? '/login?reason=idle' : '/login', req.url));
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
