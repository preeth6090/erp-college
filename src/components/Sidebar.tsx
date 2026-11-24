'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/lib/nav';
import { ModuleIcon } from '@/components/icons';

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4 text-sm">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{g.title}</div>
          <div className="space-y-0.5">
            {g.items.map((i) => {
              const active = path === i.href || path.startsWith(i.href + '/');
              return (
                <Link key={i.href} href={i.href} aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2 transition ${active ? 'bg-gradient-to-r from-indigo-600 to-violet-600 font-medium text-white shadow-lg shadow-indigo-900/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                  <ModuleIcon name={i.icon} className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-300'}`} />
                  <span className="truncate">{i.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
