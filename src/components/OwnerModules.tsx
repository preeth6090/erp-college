'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms';
import { saveModules } from '@/actions/owner';
import { GROUPS, MODULES, PRESETS } from '@/lib/modules';

export function OwnerModules({ initial }: { initial: string[] }) {
  const [on, setOn] = useState<Set<string>>(new Set(initial));
  const set = (keys: readonly string[]) => setOn(new Set(keys));
  const toggle = (k: string) => setOn((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  return (
    <ActionForm action={saveModules} reset={false} className="space-y-4">
      {[...on].map((k) => <input key={k} type="hidden" name="module" value={k} />)}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Start from:</span>
        {Object.entries(PRESETS).filter(([k]) => k !== 'college').map(([k, p]) => (
          <button key={k} type="button" title={p.hint} onClick={() => set(p.modules)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:bg-indigo-50">{p.label}</button>
        ))}
        <button type="button" onClick={() => set([])} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-500">Clear</button>
        <span className="ml-auto text-xs font-semibold text-indigo-700">{on.size} of {MODULES.length} enabled</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {GROUPS.map((g) => {
          const mods = MODULES.filter((m) => m.group === g);
          const all = mods.every((m) => on.has(m.key));
          return (
            <div key={g} className="rounded-xl border border-slate-200">
              <div className="flex items-center justify-between rounded-t-xl bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {g}
                <button type="button" className="normal-case tracking-normal text-indigo-600" onClick={() => setOn((s) => { const n = new Set(s); mods.forEach((m) => (all ? n.delete(m.key) : n.add(m.key))); return n; })}>{all ? 'none' : 'all'}</button>
              </div>
              <div className="divide-y divide-slate-100">
                {mods.map((m) => (
                  <label key={m.key} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                    <span>{m.label}</span>
                    <input type="checkbox" checked={on.has(m.key)} onChange={() => toggle(m.key)} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Unticked modules disappear for everyone at the institution, including its administrator. Keep <em>Team</em>, <em>Roles</em> and <em>Settings</em> on so the college admin can manage their own people.</p>
      <SubmitButton>Save modules</SubmitButton>
    </ActionForm>
  );
}
