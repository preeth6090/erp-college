'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms';
import { saveRolePermissions } from '@/actions/access';
import { GROUPS, MODULES } from '@/lib/modules';

type Lvl = 'none' | 'view' | 'edit';

export function PermMatrix({ roleId, roleName, initial, locked, lockedNote, allowed }: { roleId: number; roleName: string; initial: string[]; locked: boolean; lockedNote?: string; allowed: string[] }) {
  const mods = MODULES.filter((m) => allowed.includes(m.key)); // only modules the owner has granted this institution
  const start: Record<string, Lvl> = {};
  for (const m of mods) start[m.key] = initial.includes(`${m.key}:edit`) ? 'edit' : initial.includes(`${m.key}:view`) ? 'view' : 'none';
  const [lv, setLv] = useState<Record<string, Lvl>>(start);
  const set = (keys: string[], l: Lvl) => setLv((s) => ({ ...s, ...Object.fromEntries(keys.map((k) => [k, l])) }));
  const count = Object.values(lv).filter((v) => v !== 'none').length;
  const seg = (k: string, l: Lvl, label: string, tone: string) => (
    <button type="button" disabled={locked} onClick={() => set([k], l)} aria-pressed={lv[k] === l}
      className={`px-3 py-1.5 text-xs font-medium first:rounded-l-lg last:rounded-r-lg border border-slate-200 -ml-px first:ml-0 ${lv[k] === l ? tone : 'bg-white text-slate-500 hover:bg-slate-50'} disabled:cursor-not-allowed`}>{label}</button>
  );
  return (
    <ActionForm action={saveRolePermissions} hidden={{ role_id: roleId }} reset={false} className="space-y-4">
      {Object.entries(lv).flatMap(([k, l]) => (l === 'none' ? [] : [<input key={k + 'v'} type="hidden" name="perm" value={`${k}:view`} />, ...(l === 'edit' ? [<input key={k + 'e'} type="hidden" name="perm" value={`${k}:edit`} />] : [])]))}
      {locked && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{lockedNote ?? 'This role is read-only.'}</div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-600"><strong>{roleName}</strong> can open <strong>{locked && roleName.startsWith('Super') ? 'every' : count}</strong> module{count === 1 ? '' : 's'}.</div>
        {!locked && <div className="flex gap-1.5 text-[11px]">
          <button type="button" onClick={() => set(mods.map((m) => m.key), 'none')} className="rounded-md border border-slate-300 px-2 py-1">Clear all</button>
          <button type="button" onClick={() => set(mods.map((m) => m.key), 'view')} className="rounded-md border border-slate-300 px-2 py-1">All view-only</button>
        </div>}
      </div>
      {GROUPS.filter((g) => mods.some((m) => m.group === g)).map((g) => {
        const gm = mods.filter((m) => m.group === g);
        return (
          <div key={g} className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between rounded-t-xl bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {g}
              {!locked && <span className="flex gap-2 normal-case tracking-normal"><button type="button" className="text-indigo-600" onClick={() => set(gm.map((m) => m.key), 'edit')}>all edit</button><button type="button" className="text-slate-500" onClick={() => set(gm.map((m) => m.key), 'none')}>none</button></span>}
            </div>
            <div className="divide-y divide-slate-100">
              {gm.map((m) => (
                <div key={m.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="text-sm">{m.label}</div>
                  <div className="flex">{seg(m.key, 'none', 'No access', 'bg-slate-200 text-slate-700')}{seg(m.key, 'view', 'View', 'bg-sky-600 text-white border-sky-600')}{seg(m.key, 'edit', 'View + Edit', 'bg-indigo-600 text-white border-indigo-600')}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!locked && <div className="sticky bottom-3 z-10 flex justify-end"><SubmitButton className="px-6 py-2.5 shadow-lg">Save permissions</SubmitButton></div>}
    </ActionForm>
  );
}
