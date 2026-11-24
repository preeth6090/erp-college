/** Brand mark: a graduation cap on a gradient tile. Pure SVG, so it is crisp at any size. */
export function LogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-label="College ERP">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#6366f1" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient>
        <linearGradient id="lg-sh" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill="url(#lg-bg)" />
      <rect width="48" height="48" rx="13" fill="url(#lg-sh)" />
      <path d="M24 12 6.5 20.2 24 28.4l14.5-6.8v9.2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 24.4v6.1c0 2.2 5 5.2 11 5.2s11-3 11-5.2v-6.1L24 30.1Z" fill="#fff" fillOpacity=".95" />
      <circle cx="38.5" cy="31.2" r="1.9" fill="#fbbf24" />
    </svg>
  );
}

export function Logo({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={34} />
      <span className="leading-none">
        <span className={`block text-[17px] font-bold tracking-tight ${dark ? 'text-slate-900' : 'text-white'}`}>College <span className="text-indigo-400">ERP</span></span>
        <span className={`mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Higher-Ed Suite</span>
      </span>
    </span>
  );
}
