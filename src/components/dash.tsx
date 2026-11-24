import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronRight, type LucideIcon } from 'lucide-react';

/** Tiny inline SVG sparkline (server-renderable). */
export function Sparkline({ data, color = '#274a98' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 96, h = 34, max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 4 - ((v - min) / (max - min || 1)) * (h - 8)}`);
  const id = `sp${color.slice(1)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-24" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const tones = {
  indigo: { tile: 'bg-indigo-50 text-indigo-600 ring-indigo-100', hex: '#274a98', bar: 'from-indigo-500 to-violet-500' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600 ring-emerald-100', hex: '#5a9a3f', bar: 'from-emerald-500 to-teal-500' },
  amber: { tile: 'bg-amber-50 text-amber-600 ring-amber-100', hex: '#f59e0b', bar: 'from-amber-500 to-orange-500' },
  rose: { tile: 'bg-rose-50 text-rose-600 ring-rose-100', hex: '#f43f5e', bar: 'from-rose-500 to-pink-500' },
  sky: { tile: 'bg-sky-50 text-sky-600 ring-sky-100', hex: '#0ea5e9', bar: 'from-sky-500 to-cyan-500' },
  violet: { tile: 'bg-violet-50 text-violet-600 ring-violet-100', hex: '#5a9a3f', bar: 'from-violet-500 to-fuchsia-500' },
} as const;
export type Tone = keyof typeof tones;

export function Kpi({ label, value, sub, icon: Icon, tone = 'indigo', spark, trend, href }: {
  label: string; value: ReactNode; sub?: string; icon: LucideIcon; tone?: Tone; spark?: number[]; trend?: { pct: number; goodWhenUp?: boolean }; href?: string;
}) {
  const t = tones[tone];
  const up = trend ? trend.pct >= 0 : false;
  const good = trend ? (trend.goodWhenUp === false ? !up : up) : true;
  const body = (
    <div className="group relative h-full min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${t.tile}`}><Icon className="h-5 w-5" strokeWidth={1.9} /></span>
        {spark ? <Sparkline data={spark} color={t.hex} /> : <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />}
      </div>
      <div className="mt-3 text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <div className="text-[26px] font-bold leading-tight tracking-tight text-slate-900">{value}</div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(trend.pct)}%
          </span>
        )}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl">{body}</Link> : body;
}

export function Panel({ title, subtitle, icon: Icon, action, children, className = '' }: { title: string; subtitle?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" strokeWidth={1.9} /></span>}
          <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-900">{title}</h3>{subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}</div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">{children}<ChevronRight className="h-3.5 w-3.5" /></Link>;
}

export function Progress({ value, max, tone = 'indigo', label, right }: { value: number; max: number; tone?: Tone; label: string; right?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = tones[pct >= 90 ? 'rose' : tone].bar;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs"><span className="font-medium text-slate-700">{label}</span><span className="text-slate-500">{right ?? `${pct}%`}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-gradient-to-r ${bar}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/** Circular progress used in the hero banner. */
export function Ring({ value, label, size = 84, color = '#fff' }: { value: number; label: string; size?: number; color?: string }) {
  const r = 34, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="7" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">{Math.round(v)}%</div>
      </div>
      <div className="text-[11px] font-medium text-indigo-100">{label}</div>
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number; icon: LucideIcon }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  const shades = ['from-indigo-700 to-indigo-600', 'from-indigo-600 to-indigo-500', 'from-violet-600 to-violet-500', 'from-fuchsia-600 to-fuchsia-500', 'from-violet-500 to-violet-400'];
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="flex w-32 shrink-0 items-center gap-2 text-xs font-medium text-slate-600"><s.icon className="h-4 w-4 text-slate-400" strokeWidth={1.9} />{s.label}</div>
          <div className="h-8 flex-1 rounded-lg bg-slate-100">
            <div className={`flex h-8 items-center rounded-lg bg-gradient-to-r px-2.5 text-xs font-bold text-white ${shades[i % shades.length]}`} style={{ width: `${Math.max(9, (s.value / max) * 100)}%` }}>{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActionItem({ icon: Icon, label, count, href, tone = 'amber' }: { icon: LucideIcon; label: string; count: number; href: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <Link href={href} className="group flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-slate-300 hover:bg-slate-50">
      <span className="flex items-center gap-3 text-sm text-slate-700"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${count > 0 ? t.tile : 'bg-slate-50 text-slate-400 ring-slate-100'}`}><Icon className="h-4 w-4" strokeWidth={1.9} /></span>{label}</span>
      <span className="flex items-center gap-1.5"><span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold ${count > 0 ? t.tile + ' ring-1' : 'bg-slate-100 text-slate-400'}`}>{count}</span><ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5" /></span>
    </Link>
  );
}

/** "Jump to" tile. */
export function Tile({ href, icon: Icon, label, tone = 'indigo' }: { href: string; icon: LucideIcon; label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <Link href={href} className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-2 py-4 text-center shadow-[0_1px_2px_rgba(15,23,42,.04)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 transition group-hover:scale-105 ${t.tile}`}><Icon className="h-5 w-5" strokeWidth={1.9} /></span>
      <span className="text-xs font-medium text-slate-700">{label}</span>
    </Link>
  );
}
