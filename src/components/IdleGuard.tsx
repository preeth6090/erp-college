'use client';

import { useEffect, useRef, useState } from 'react';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
const KEY = 'vidyaos:last-activity';

/**
 * Signs the user out after `minutes` of inactivity.
 * Warns 60 s before, keeps the server session alive while the user is active, and syncs activity across tabs.
 */
export function IdleGuard({ minutes }: { minutes: number }) {
  const idleMs = minutes * 60_000;
  const warnMs = Math.min(60_000, idleMs / 2);
  const [secs, setSecs] = useState<number | null>(null);
  const last = useRef(Date.now());
  const lastPing = useRef(Date.now());
  const warning = useRef(false);

  const ping = () => { lastPing.current = Date.now(); fetch('/api/ping', { cache: 'no-store', credentials: 'same-origin' }).catch(() => {}); };
  const touch = (force = false) => {
    if (warning.current && !force) return; // once warned, only the button keeps the session
    const now = Date.now();
    if (!force && now - last.current < 1000) return;
    last.current = now;
    try { localStorage.setItem(KEY, String(now)); } catch { /* private mode */ }
    if (now - lastPing.current > Math.min(60_000, idleMs / 3)) ping(); // refreshes the server-side idle clock well before it can lapse
  };

  useEffect(() => {
    const onAct = () => touch();
    EVENTS.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    const timer = setInterval(() => {
      let l = last.current;
      try { l = Math.max(l, Number(localStorage.getItem(KEY)) || 0); } catch { /* ignore */ }
      const idle = Date.now() - l;
      if (idle >= idleMs) { clearInterval(timer); window.location.assign('/api/logout?reason=idle'); }
      else if (idle >= idleMs - warnMs) { warning.current = true; setSecs(Math.max(1, Math.ceil((idleMs - idle) / 1000))); }
      else { warning.current = false; setSecs(null); }
    }, 1000);
    return () => { EVENTS.forEach((e) => window.removeEventListener(e, onAct)); clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleMs]);

  if (secs === null) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="idle-title" className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-600">⏱</div>
        <h2 id="idle-title" className="text-lg font-bold text-slate-900">Still there?</h2>
        <p className="mt-1 text-sm text-slate-600">For your security you will be signed out in <strong className="tabular-nums">{secs}</strong> second{secs === 1 ? '' : 's'}.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" autoFocus onClick={() => { warning.current = false; setSecs(null); touch(true); ping(); }} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Stay signed in</button>
          <button type="button" onClick={() => window.location.assign('/api/logout')} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Sign out now</button>
        </div>
      </div>
    </div>
  );
}
