'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/action';

export function SubmitButton({ children = 'Save', tone = 'indigo', className = '' }: { children?: ReactNode; tone?: 'indigo' | 'slate' | 'emerald' | 'rose'; className?: string }) {
  const { pending } = useFormStatus();
  const tones = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700', slate: 'bg-slate-700 hover:bg-slate-800',
    emerald: 'bg-emerald-600 hover:bg-emerald-700', rose: 'bg-rose-600 hover:bg-rose-700',
  };
  return (
    <button type="submit" disabled={pending} className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 ${tones[tone]} ${className}`}>
      {pending ? 'Working…' : children}
    </button>
  );
}

export type ResultData = {
  credentials?: { label: string; value: string }[];
  link?: { label: string; url: string; share?: { whatsapp?: string; mailto?: string } };
  table?: { head: string[]; rows: string[][]; csvName: string; note?: string };
};

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50">{done ? 'Copied ✓' : label}</button>
  );
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function Result({ data }: { data: ResultData }) {
  return (
    <div className="space-y-2">
      {data.credentials && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="mb-1 font-semibold">Share these sign-in details securely — the password is shown only once.</div>
          {data.credentials.map((c) => (
            <div key={c.label} className="flex items-center justify-between gap-2 py-0.5"><span><span className="text-amber-700">{c.label}:</span> <code className="font-mono text-sm">{c.value}</code></span><CopyButton text={c.value} /></div>
          ))}
          <div className="mt-1.5"><CopyButton label="Copy all" text={data.credentials.map((c) => `${c.label}: ${c.value}`).join('\n')} /></div>
        </div>
      )}
      {data.link && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900">
          <div className="mb-1 font-semibold">{data.link.label}</div>
          <div className="break-all rounded bg-white px-2 py-1 font-mono text-[11px]">{data.link.url}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <CopyButton text={data.link.url} label="Copy link" />
            {data.link.share?.whatsapp && <a href={data.link.share.whatsapp} target="_blank" rel="noreferrer" className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-medium text-emerald-700">Share on WhatsApp</a>}
            {data.link.share?.mailto && <a href={data.link.share.mailto} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">Send by email</a>}
          </div>
        </div>
      )}
      {data.table && (
        <div className="rounded-lg border border-slate-200 bg-white text-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <span className="text-slate-600">{data.table.note}</span>
            <button type="button" className="rounded-md bg-slate-800 px-2.5 py-1 font-medium text-white"
              onClick={() => { const csv = [data.table!.head, ...data.table!.rows].map((r) => r.map(csvCell).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = data.table!.csvName; a.click(); }}>
              Download CSV
            </button>
          </div>
          <div className="max-h-64 overflow-auto"><table className="w-full text-left"><thead><tr className="text-[10px] uppercase text-slate-500">{data.table.head.map((h) => <th key={h} className="px-3 py-1.5">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{data.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-1.5 font-mono">{c}</td>)}</tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}

/** A form bound to a server action; shows success / error feedback and resets on success. */
export function ActionForm({
  action, children, className = 'space-y-3', hidden, reset = true, inline = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  hidden?: Record<string, string | number>;
  reset?: boolean;
  inline?: boolean;
}) {
  const lastData = useRef<FormData | null>(null);
  const [state, formAction] = useActionState(async (prev: ActionState, fd: FormData) => { lastData.current = fd; return action(prev, fd); }, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
    // React clears uncontrolled fields after every form action; put back what the user typed when the action failed.
    if (state && !state.ok && ref.current && lastData.current) {
      const fd = lastData.current;
      for (const el of Array.from(ref.current.elements) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[]) {
        if (!el.name || el.type === 'file' || el.type === 'hidden' || el.type === 'submit') continue;
        const v = fd.getAll(el.name);
        if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) el.checked = v.includes(el.value);
        else if (v.length) el.value = String(v[0]);
      }
    }
  }, [state, reset]);
  return (
    <form ref={ref} action={formAction} className={className} data-edit="true">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      {state && !inline && (
        <div role="status" className={`rounded-lg border px-3 py-2 text-xs ${state.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {state.ok ? state.message : (
            <ul className="list-disc space-y-0.5 pl-4">{state.errors?.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
        </div>
      )}
      {state?.ok && !inline && state.data ? <Result data={state.data as ResultData} /> : null}
      {state && inline && !state.ok && <span className="text-xs text-rose-700">{state.errors?.[0]}</span>}
    </form>
  );
}

export function PrintButton({ label = 'Print' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="no-print rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
      {label}
    </button>
  );
}
