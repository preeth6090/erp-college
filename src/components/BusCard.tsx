import { Bus, ExternalLink, MapPin, Phone } from 'lucide-react';
import { db } from '@/lib/db';

/** "My bus" — shows a student's route, pickup stop, driver and a one-tap live-tracking button. Renders nothing if they don't use transport. */
export async function BusCard({ studentId, title = 'My bus' }: { studentId: number; title?: string }) {
  const rows = await db.transportAllocation.findMany({
    where: { student_id: studentId, status: 'Active' },
    include: { transportRoute: { include: { transportVehicle: true } } },
  });
  if (rows.length === 0) return null;
  return (
    <section className="min-w-0 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><Bus className="h-4 w-4" /></span>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-4">
        {rows.map((a) => {
          const v = a.transportRoute.transportVehicle;
          return (
            <div key={a.id} className="space-y-2 text-sm">
              <div className="font-medium text-slate-900">{a.transportRoute.route_name}</div>
              <div className="text-slate-600">Pickup: <strong>{a.pickup_stop}</strong>{v ? <> · Bus <strong>{v.registration_no}</strong></> : null}</div>
              {v && v.driver_name !== '—' && <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" />{v.driver_name} {v.driver_phone !== '—' && <>· <a className="font-medium text-indigo-600" href={`tel:${v.driver_phone.replace(/[^\d+]/g, '')}`}>{v.driver_phone}</a></>}</div>}
              {v?.tracking_url ? (
                <a href={v.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"><MapPin className="h-4 w-4" />Where is the bus now?<ExternalLink className="h-3.5 w-3.5" /></a>
              ) : <div className="text-xs text-slate-500">Live tracking isn’t set up for this bus yet.</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
