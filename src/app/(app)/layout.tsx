import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { NAV } from '@/lib/nav';
import { CREATOR_LINE } from '@/lib/brand';
import { Sidebar } from '@/components/Sidebar';
import { AppShell } from '@/components/AppShell';
import { logout } from '@/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => hasRole(user, i.roles)) })).filter((g) => g.items.length);

  return (
    <AppShell
      brand={
        <>
          <div className="text-lg font-bold tracking-tight text-white">College <span className="text-xs font-normal text-indigo-400">ERP</span></div>
          <div className="text-[11px] text-slate-400">Indian Higher-Ed Suite (30 Modules)</div>
        </>
      }
      nav={<Sidebar groups={groups} />}
      footer={<div className="border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500">{CREATOR_LINE}</div>}
      header={
        <>
          {user.role?.slug === 'super_admin' && (
            <Link href="/apply" target="_blank" className="hidden rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-700 hover:bg-amber-100 sm:inline-block">
              Admission Form ↗
            </Link>
          )}
          <div className="min-w-0 text-right">
            <div className="truncate font-semibold text-slate-800">{user.name}</div>
            <div className="truncate text-[11px] text-slate-500">{user.role?.name ?? 'User'}</div>
          </div>
          <form action={logout}>
            <button type="submit" className="rounded-md bg-slate-800 px-3 py-2 text-white hover:bg-slate-700">Logout</button>
          </form>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
