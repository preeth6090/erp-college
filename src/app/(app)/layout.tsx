import Link from 'next/link';
import { redirect } from 'next/navigation';
import { can, getUser, isAdmin } from '@/lib/auth';
import { MODULES } from '@/lib/modules';
import { NAV } from '@/lib/nav';
import { CREATOR_LINE } from '@/lib/brand';
import { Sidebar } from '@/components/Sidebar';
import { AppShell } from '@/components/AppShell';
import { logout } from '@/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.must_change_password) redirect('/account/password');
  const slug = user.role?.slug ?? '';
  const groups = NAV.map((g) => ({
    ...g,
    // admins preview every portal; everyone else sees only their own role's portal
    items: g.items.filter((i) => (i.module ? can(user, i.module) : isAdmin(user) || (i.roles ?? []).includes(slug))),
  })).filter((g) => g.items.length);
  const viewOnly = MODULES.filter((m) => can(user, m.key) && !can(user, m.key, 'edit')).map((m) => m.key);

  return (
    <AppShell
      viewOnly={viewOnly}
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
          {can(user, 'admissions', 'edit') && (
            <Link href="/apply" target="_blank" className="hidden rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-700 hover:bg-amber-100 sm:inline-block">
              Admission Form ↗
            </Link>
          )}
          <div className="min-w-0 text-right">
            <div className="truncate font-semibold text-slate-800">{user.name}</div>
            <div className="truncate text-[11px] text-slate-500">{user.role?.name ?? 'User'}</div>
          </div>
          <Link href="/account/password" className="hidden rounded-md px-2 py-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:inline-block">Change password</Link>
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
