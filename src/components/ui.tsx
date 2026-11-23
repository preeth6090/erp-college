import Link from 'next/link';
import type { ReactNode } from 'react';

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = '', actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone = 'indigo' }: { label: string; value: ReactNode; hint?: string; tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky' }) {
  const tones = {
    indigo: 'text-indigo-700', emerald: 'text-emerald-700', amber: 'text-amber-700',
    rose: 'text-rose-700', slate: 'text-slate-800', sky: 'text-sky-700',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {!hasRows && <p className="px-3 py-6 text-center text-sm text-slate-400">{empty ?? 'No records yet.'}</p>}
    </div>
  );
}
export const Td = ({ children, className = '' }: { children?: ReactNode; className?: string }) => (
  <td className={`px-3 py-2 align-top ${className}`}>{children}</td>
);

const badgeTones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};
const statusTone = (s: string) => {
  const v = s.toLowerCase();
  if (/(paid|active|approved|completed|present|issued|selected|verified|resolved|returned|published|converted|pass|sent|admitted|granted|disbursed|allocated|closed)/.test(v)) return 'green';
  if (/(overdue|rejected|absent|failed|fail|lost|cancelled|inactive|withdrawn|expelled|critical|high)/.test(v)) return 'red';
  if (/(pending|partial|submitted|waiting|planned|review|follow|late|shortlisted|open|draft|ordered|medium|ongoing)/.test(v)) return 'amber';
  return 'slate';
};
export function Badge({ children, tone }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  const t = tone ?? (typeof children === 'string' ? statusTone(children) : 'slate');
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeTones[t]}`}>{children}</span>;
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
export function Input({ label, className = '', ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} className={className}>
      <input {...props} className={inputCls} />
    </Field>
  );
}
export function Textarea({ label, className = '', ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} className={className}>
      <textarea rows={2} {...props} className={inputCls} />
    </Field>
  );
}
export type Option = string | { value: string | number; label: string };
export function Select({ label, options, className = '', placeholder, ...props }: { label: string; options: readonly Option[]; placeholder?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} className={className}>
      <select {...props} className={inputCls}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </Field>
  );
}
export function Checkbox({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" {...props} className="rounded border-slate-300" />
      {label}
    </label>
  );
}

export const FormGrid = ({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) => (
  <div className={`grid gap-3 sm:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : cols === 4 ? 'lg:grid-cols-4' : ''}`}>{children}</div>
);

export function LinkButton({ href, children, tone = 'slate', target }: { href: string; children: ReactNode; tone?: 'slate' | 'indigo'; target?: string }) {
  const c = tone === 'indigo' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50';
  return (
    <Link href={href} target={target} className={`inline-block rounded-lg px-3 py-1.5 text-xs font-medium ${c}`}>
      {children}
    </Link>
  );
}

export function Tabs({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="no-print mb-4 flex flex-wrap gap-1 border-b border-slate-200">
      {items.map((t) => (
        <Link key={t.href} href={t.href} className={`-mb-px border-b-2 px-3 py-2 text-sm ${t.active ? 'border-indigo-600 font-semibold text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function Signature({ label = 'Authorised Signatory' }: { label?: string }) {
  return (
    <div className="mt-10 flex items-end justify-between text-xs text-slate-600">
      <div>Generated on {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
      <div className="text-center">
        <div className="mb-1 w-44 border-t border-slate-400" />
        {label}
      </div>
    </div>
  );
}
