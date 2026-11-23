import Link from 'next/link';
import type { ReactNode } from 'react';

/** Tiny inline SVG sparkline (server-renderable). */
export function Sparkline({ data, color = '#4f46e5' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 96, h = 32, max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / (max - min || 1)) * (h - 6)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-24" aria-hidden>
      <polyline points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={color} fillOpacity="0.12" stroke="none" />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const accent = {
  indigo: 'from-indigo-500 to-violet-500', emerald: 'from-emerald-500 to-teal-500', amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-500', sky: 'from-sky-500 to-cyan-500', violet: 'from-violet-500 to-fuchsia-500',
} as const;
export type Accent = keyof typeof accent;

export function Kpi({ label, value, sub, icon, tone = 'indigo', spark, trend, href }: {
  label: string; value: ReactNode; sub?: string; icon: string; tone?: Accent; spark?: number[]; trend?: { pct: number; goodWhenUp?: boolean }; href?: string;
}) {
  const hex = { indigo: '#4f46e5', emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e', sky: '#0ea5e9', violet: '#8b5cf6' }[tone];
  const up = trend ? trend.pct >= 0 : false;
  const good = trend ? (trend.goodWhenUp === false ? !up : up) : true;
  const body = (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent[tone]}`} />
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent[tone]} text-base text-white shadow-sm`}>{icon}</div>
        {spark && <Sparkline data={spark} color={hex} />}
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {trend && <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{up ? '▲' : '▼'} {Math.abs(trend.pct)}%</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

export function Panel({ title, subtitle, action, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div><h3 className="text-sm font-semibold text-slate-900">{title}</h3>{subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Progress({ value, max, tone = 'indigo', label, right }: { value: number; max: number; tone?: Accent; label: string; right?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const danger = pct >= 90 ? 'rose' : tone;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-slate-700">{label}</span><span className="text-slate-500">{right ?? `${pct}%`}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-gradient-to-r ${accent[danger]}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  const shades = ['bg-indigo-600', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-emerald-500'];
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 text-xs text-slate-600">{s.label}</div>
          <div className="h-7 flex-1 rounded-lg bg-slate-100">
            <div className={`flex h-7 items-center rounded-lg px-2 text-xs font-semibold text-white ${shades[i % shades.length]}`} style={{ width: `${Math.max(8, (s.value / max) * 100)}%` }}>{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActionItem({ icon, label, count, href, tone = 'amber' }: { icon: string; label: string; count: number; href: string; tone?: 'amber' | 'rose' | 'sky' | 'emerald' }) {
  const tones = { amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700', sky: 'bg-sky-50 text-sky-700', emerald: 'bg-emerald-50 text-emerald-700' };
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-slate-300 hover:bg-slate-50">
      <span className="flex items-center gap-2.5 text-sm text-slate-700"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</span>{label}</span>
      <span className={`min-w-8 rounded-full px-2 py-0.5 text-center text-xs font-bold ${count > 0 ? tones[tone] : 'bg-slate-100 text-slate-400'}`}>{count}</span>
    </Link>
  );
}
