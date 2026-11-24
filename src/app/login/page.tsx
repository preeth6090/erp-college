import { redirect } from 'next/navigation';
import { GraduationCap, ShieldCheck, Wallet, CalendarCheck } from 'lucide-react';
import { getUser, homeFor } from '@/lib/auth';
import { getPolicy } from '@/lib/policy';
import { CREATOR_LINE } from '@/lib/brand';
import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign In' };

const FEATURES = [
  { icon: GraduationCap, t: 'Students, admissions & exams', d: 'From enquiry to transcript in one place.' },
  { icon: Wallet, t: 'Fees, finance & payroll', d: 'Receipts, ledgers, PF / ESI / TDS ready.' },
  { icon: CalendarCheck, t: 'Attendance & timetable', d: 'Conflict-free scheduling and 75% alerts.' },
  { icon: ShieldCheck, t: 'Role-based access', d: 'Everyone sees only what they should.' },
];

export default async function LoginPage() {
  const [user, policy] = await Promise.all([getUser(), getPolicy()]);
  if (user) redirect(homeFor(user));
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <Logo className="relative" />
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">Run your entire college from one calm dashboard.</h2>
          <p className="mt-3 text-indigo-100/80">NEP 2020 &amp; NAAC-ready. Thirty modules, built for Indian higher education.</p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, t, d }) => (
              <li key={t} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"><Icon className="h-[18px] w-[18px] text-indigo-200" /></span>
                <span><span className="block text-sm font-semibold">{t}</span><span className="block text-xs text-indigo-100/70">{d}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-100/60">{CREATOR_LINE}</p>
      </aside>

      <main className="flex flex-col bg-slate-50">
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">
            <Logo dark className="mb-8 lg:hidden" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to continue to College ERP.</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><LoginForm allowRemember={policy.allow_remember} /></div>
            <p className="mt-4 text-center text-xs text-slate-400">Trouble signing in? Ask your administrator to reset your password.</p>
          </div>
        </div>
        <p className="py-4 text-center text-xs text-slate-400 lg:hidden">{CREATOR_LINE}</p>
      </main>
    </div>
  );
}
