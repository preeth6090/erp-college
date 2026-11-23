/** Shown instantly while a page's data loads, so navigation feels immediate. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-64 max-w-full rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-200/70" />)}
      </div>
      <div className="h-64 rounded-2xl bg-slate-200/70" />
      <div className="h-40 rounded-2xl bg-slate-200/70" />
    </div>
  );
}
