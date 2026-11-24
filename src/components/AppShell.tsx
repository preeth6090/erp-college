'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MODULES } from '@/lib/modules';
import { Logo } from '@/components/Logo';

/** Responsive frame: fixed sidebar on desktop, slide-out drawer with a hamburger on phones/tablets. */
export function AppShell({ brand, nav, footer, header, viewOnly = [], children }: { brand: ReactNode; nav: ReactNode; footer: ReactNode; header: ReactNode; viewOnly?: string[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  const current = MODULES.find((m) => path === m.href || path.startsWith(m.href + '/'));
  const readOnly = !!current && viewOnly.includes(current.key);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="flex min-h-dvh">
      {open && <div className="no-print fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        id="sidebar"
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-shrink-0 flex-col bg-gradient-to-b from-indigo-900 via-indigo-950 to-[#070f26] text-slate-200 transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:max-w-none lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>{brand}</div>
          <button type="button" onClick={() => setOpen(false)} className="-mr-2 rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden" aria-label="Close menu">✕</button>
        </div>
        {nav}
        {footer}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden" aria-label="Open menu" aria-controls="sidebar" aria-expanded={open}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h14M3 10h14M3 15h14" /></svg>
          </button>
          <Logo dark height={28} className="lg:hidden" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-xs sm:gap-4">{header}</div>
        </header>
        <main data-readonly={readOnly} className="print-full min-w-0 flex-1 overflow-x-hidden p-3 sm:p-5 lg:p-6">
          {readOnly && <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">👁️ You have <strong>view-only</strong> access to this module. Ask an administrator if you need to make changes.</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
