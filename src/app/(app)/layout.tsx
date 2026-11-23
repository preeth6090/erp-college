import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser, hasRole } from '@/lib/auth';
import { NAV } from '@/lib/nav';
import { CREATOR_LINE } from '@/lib/brand';
import { Sidebar } from '@/components/Sidebar';
import { logout } from '@/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => hasRole(user, i.roles)) })).filter((g) => g.items.length);

  return (
    <div className="flex min-h-screen">
      <aside className="no-print flex w-64 flex-shrink-0 flex-col bg-slate-900 text-slate-200">
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="text-lg font-bold tracking-tight text-white">
            Webot<span className="text-amber-400">App</span> <span className="text-xs font-normal text-indigo-400">ERP</span>
          </div>
          <div className="text-[11px] text-slate-400">Indian Higher-Ed Suite (30 Modules)</div>
        </div>
        <Sidebar groups={groups} />
        <div className="border-t border-slate-800 px-5 py-3 text-[11px] text-slate-500">{CREATOR_LINE}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex flex-wrap items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 py-3 text-xs">
          {user.role?.slug === 'super_admin' && (
            <Link href="/apply" target="_blank" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-700 hover:bg-amber-100">
              Admission Form ↗
            </Link>
          )}
          <div className="text-right">
            <div className="font-semibold text-slate-800">{user.name}</div>
            <div className="text-[11px] text-slate-500">{user.role?.name ?? 'User'}</div>
          </div>
          <form action={logout}>
            <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-700">Logout</button>
          </form>
        </header>
        <main className="print-full flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
