import { redirect } from 'next/navigation';
import { getUser, homeFor } from '@/lib/auth';
import { getPolicy } from '@/lib/policy';
import { CREATOR_LINE } from '@/lib/brand';
import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign In' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const [user, policy, sp] = await Promise.all([getUser(), getPolicy(), searchParams]);
  if (user) redirect(homeFor(user));
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 p-12 text-white lg:flex lg:items-center lg:justify-center">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative"><Logo height={110} /></div>
        <p className="absolute bottom-8 left-12 text-xs text-indigo-100/60">{CREATOR_LINE}</p>
      </aside>

      <main className="flex flex-col bg-slate-50">
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            <Logo dark className="mb-8 lg:hidden" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to continue to VidyaOS.</p>
            {sp.reason === 'idle' && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">For your security you were signed out after {policy.idle_timeout_minutes} minutes of inactivity. Please sign in again.</div>}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><LoginForm /></div>
            <p className="mt-4 text-center text-xs text-slate-400">Trouble signing in? Ask your administrator to reset your password.</p>
          </div>
        </div>
        <p className="py-4 text-center text-xs text-slate-400 lg:hidden">{CREATOR_LINE}</p>
      </main>
    </div>
  );
}
