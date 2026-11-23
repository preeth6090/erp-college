'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
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
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && reset) ref.current?.reset();
  }, [state, reset]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      {state && !inline && (
        <div role="status" className={`rounded-lg border px-3 py-2 text-xs ${state.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {state.ok ? state.message : (
            <ul className="list-disc space-y-0.5 pl-4">{state.errors?.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
        </div>
      )}
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
