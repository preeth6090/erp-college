import Link from 'next/link';
import { redirect } from 'next/navigation';
import { can, getUser, isAdmin, isOwner } from '@/lib/auth';
import { MODULES } from '@/lib/modules';
import { NAV } from '@/lib/nav';
import { CREATOR_LINE } from '@/lib/brand';
import { Sidebar } from '@/components/Sidebar';
import { AppShell } from '@/components/AppShell';
import { Logo } from '@/components/Logo';
import { LogOut, KeyRound, ExternalLink } from 'lucide-react';
import { logout } from '@/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.must_change_password) redirect('/account/password');
  const slug = user.role?.slug ?? '';
  const groups = NAV.map((g) => ({
    ...g,
    // admins preview every portal; everyone else sees only their own role's portal
    items: g.items.filter((i) => i.home ? !isOwner(user) && MODULES.some((m) => can(user, m.key)) : (i.ownerOnly ? isOwner(user) : i.module ? can(user, i.module) : isOwner(user) || (i.roles ?? []).includes(slug))),
  })).filter((g) => g.items.length);
  const viewOnly = MODULES.filter((m) => can(user, m.key) && !can(user, m.key, 'edit')).map((m) => m.key);

  return (
    <AppShell
      viewOnly={viewOnly}
      idleMinutes={user.idleMinutes}
      brand={<div className="min-w-0"><Logo />{user.institution && <div className="mt-1.5 truncate pl-0.5 text-[11px] font-medium text-slate-400">{user.institution}</div>}</div>}
      nav={<Sidebar groups={groups} />}
      footer={<div className="border-t border-white/5 px-5 py-3 text-[11px] text-slate-500">{CREATOR_LINE}</div>}
      header={
        <>
          {can(user, 'admissions', 'edit') && (
            <Link href={user.applyUrl || '/apply'} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 sm:inline-flex">
              Admission form <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <Link href="/account/password" title="Change password" className="hidden rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:inline-flex"><KeyRound className="h-4 w-4" /></Link>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-sm">
              {user.name.replace(/\(.*\)/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
            </span>
            <div className="hidden min-w-0 text-left leading-tight sm:block">
              <div className="truncate text-sm font-semibold text-slate-800">{user.name.replace(/\(.*\)/, '').trim()}</div>
              <div className="truncate text-[11px] text-slate-500">{user.role?.name ?? 'User'}</div>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" title="Sign out" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></button>
          </form>
        </>
      }
    >
      {children}
    </AppShell>
  );
}
