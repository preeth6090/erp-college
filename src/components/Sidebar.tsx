'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/lib/nav';

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4 text-sm">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</div>
          {g.items.map((i) => {
            const active = path === i.href || path.startsWith(i.href + '/');
            return (
              <Link key={i.href} href={i.href} className={`block rounded-lg px-3 py-2 ${active ? 'bg-indigo-600 font-medium text-white' : 'hover:bg-slate-800'}`}>
                {i.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
