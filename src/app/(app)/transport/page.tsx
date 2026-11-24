import { Bus, ExternalLink, MapPin, Navigation, Phone, Route as RouteIcon, ShieldAlert, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td, Textarea } from '@/components/ui';
import { Progress } from '@/components/dash';
import { allocateTransport } from '@/actions/facilities';
import { addRoute, addVehicle, cancelAllocation, deleteVehicle, saveFleetLink, updateRoute, updateVehicle } from '@/actions/transport';
import { fmtDate, toInputDate } from '@/lib/format';

export const metadata = { title: 'Transport & Live Tracking' };
export const dynamic = 'force-dynamic';

const stopsOf = (json?: string | null): string[] => { try { const v = JSON.parse(json ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const DAY = 86400000;
/** Colour a document expiry: red when overdue / within 30 days. */
function Expiry({ label, date }: { label: string; date: Date | null }) {
  if (!date) return <span className="text-slate-400">{label}: —</span>;
  const days = Math.ceil((date.getTime() - Date.now()) / DAY);
  const tone = days < 0 ? 'red' : days <= 30 ? 'amber' : 'green';
  return <span className="inline-flex items-center gap-1">{label}: <Badge tone={tone}>{days < 0 ? `expired ${fmtDate(date)}` : fmtDate(date)}</Badge></span>;
}

export default async function Transport() {
  await requireModule('transport');
  const [vehicles, routes, allocations, students, fleet] = await Promise.all([
    db.transportVehicle.findMany({ include: { transportRoutes: { include: { _count: { select: { transportAllocations: { where: { status: 'Active' } } } } } } }, orderBy: { registration_no: 'asc' } }),
    db.transportRoute.findMany({ include: { transportVehicle: true }, orderBy: { route_name: 'asc' } }),
    db.transportAllocation.findMany({ where: { status: 'Active' }, include: { transportRoute: { include: { transportVehicle: true } }, student: true }, orderBy: { created_at: 'desc' } }),
    db.student.findMany({ where: { status: 'Active' }, orderBy: { full_name: 'asc' } }),
    db.systemSetting.findUnique({ where: { key: 'transport.fleet_url' } }),
  ]);
  const fleetUrl = fleet?.value || '';
  const linked = vehicles.filter((v) => v.tracking_url).length;
  const vehOpts = vehicles.map((v) => ({ value: v.id, label: `${v.registration_no} (${v.vehicle_type})` }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transport & Live Tracking"
        subtitle="Vehicles, routes and students — with a live map link for every bus"
        actions={fleetUrl ? <a href={fleetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"><Navigation className="h-4 w-4" />Open OneLap live map<ExternalLink className="h-3.5 w-3.5" /></a> : undefined}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([[Bus, 'Vehicles', vehicles.length], [RouteIcon, 'Routes', routes.length], [Users, 'Students on transport', allocations.length], [MapPin, 'Vehicles with live link', `${linked} / ${vehicles.length}`]] as const).map(([Icon, label, value]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"><Icon className="h-5 w-5" /></span>
            <div className="min-w-0"><div className="text-xl font-bold leading-tight">{value}</div><div className="truncate text-xs text-slate-500">{label}</div></div>
          </div>
        ))}
      </div>

      {/* ── Live tracking ── */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Navigation className="h-4 w-4 text-emerald-600" />Where is each vehicle?</h3>
        {vehicles.length === 0 ? (
          <Card><p className="text-sm text-slate-500">No vehicles yet. Add your first vehicle below and paste its OneLap tracking link — then a one-tap “Track live” button appears here, for staff and for parents.</p></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v) => {
              const onboard = v.transportRoutes.reduce((s, r) => s + r._count.transportAllocations, 0);
              const hasDriver = v.driver_name !== '—';
              const driverTel = v.driver_phone.replace(/[^\d+]/g, '');
              return (
                <div key={v.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100"><Bus className="h-5 w-5" /></span>
                      <div className="min-w-0"><div className="truncate font-semibold tracking-wide">{v.registration_no}</div><div className="text-xs text-slate-500">{v.vehicle_type} · {v.capacity} seats</div></div>
                    </div>
                    {v.tracking_url ? <Badge tone="green">Live link set</Badge> : <Badge tone="amber">No link</Badge>}
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex flex-wrap items-center gap-x-2 text-slate-600"><RouteIcon className="h-4 w-4 shrink-0 text-slate-400" />{v.transportRoutes.length ? v.transportRoutes.map((r) => r.route_name).join(' · ') : <span className="text-slate-400">No route assigned</span>}</div>
                    <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 shrink-0 text-slate-400" />{hasDriver ? <><span className="truncate">{v.driver_name}</span>{v.driver_phone !== '—' && <a href={`tel:${driverTel}`} className="shrink-0 text-xs font-medium text-indigo-600 hover:underline">{v.driver_phone}</a>}</> : <span className="text-slate-400">Driver not added yet</span>}</div>
                  </div>
                  <div className="mt-3"><Progress label="Seats used" value={onboard} max={v.capacity} right={`${onboard} / ${v.capacity}`} tone="sky" /></div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><Expiry label="Insurance" date={v.insurance_expiry} /><Expiry label="Fitness" date={v.fitness_expiry} /></div>
                  {v.tracking_url ? (
                    <a href={v.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"><MapPin className="h-4 w-4" />Track live on OneLap<ExternalLink className="h-3.5 w-3.5" /></a>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-800">Paste this vehicle’s OneLap link under “Edit” to enable live tracking.</div>
                  )}
                  <details className="mt-3 border-t border-slate-100 pt-2">
                    <summary className="cursor-pointer py-1 text-xs font-medium text-indigo-700">Edit vehicle</summary>
                    <ActionForm action={updateVehicle} hidden={{ id: v.id }} reset={false} className="mt-2 space-y-2">
                      <VehicleFields v={v} />
                      <SubmitButton>Save changes</SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteVehicle} hidden={{ id: v.id }} reset={false} className="mt-2" inline><SubmitButton tone="rose">Remove vehicle</SubmitButton></ActionForm>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Add a vehicle">
          <ActionForm action={addVehicle}>
            <VehicleFields />
            <SubmitButton>Add vehicle</SubmitButton>
          </ActionForm>
        </Card>
        <div className="space-y-4">
          <Card title="Add a route">
            <ActionForm action={addRoute}>
              <FormGrid cols={2}>
                <Input label="Route name *" name="route_name" required placeholder="e.g. Route 1 — City Centre" />
                <Select label="Vehicle" name="transport_vehicle_id" placeholder="Assign later" options={vehOpts} />
                <Input label="Monthly fee (₹)" name="monthly_fee" type="number" min={0} defaultValue={1800} />
              </FormGrid>
              <Textarea label="Stops in order (one per line, or comma-separated)" name="stops" rows={3} placeholder={'Bus Stand\nMarket Circle\nCollege Gate'} />
              <SubmitButton>Add route</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Fleet map link (optional)">
            <ActionForm action={saveFleetLink} reset={false}>
              <Input label="OneLap link that shows ALL vehicles on one map" name="fleet_url" type="url" defaultValue={fleetUrl} placeholder="https://…" />
              <p className="text-xs text-slate-500">Shows as an “Open OneLap live map” button at the top of this page.</p>
              <SubmitButton tone="slate">Save</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>

      <Card title="Routes">
        <Table head={['Route', 'Vehicle', 'Stops', 'Students', 'Fee / month', 'Edit']} empty="No routes yet.">
          {routes.map((r) => {
            const st = stopsOf(r.stops_json);
            const count = allocations.filter((a) => a.transport_route_id === r.id).length;
            return (
              <tr key={r.id}>
                <Td className="font-medium">{r.route_name}</Td>
                <Td>{r.transportVehicle?.registration_no ?? <span className="text-slate-400">—</span>}</Td>
                <Td className="text-xs text-slate-600">{st.length ? st.join(' → ') : '—'}</Td>
                <Td>{count}</Td><Td>₹{r.monthly_fee}</Td>
                <Td>
                  <details><summary className="cursor-pointer text-xs font-medium text-indigo-700">Edit</summary>
                    <ActionForm action={updateRoute} hidden={{ id: r.id }} reset={false} className="mt-2 w-72 max-w-full space-y-2">
                      <Input label="Route name" name="route_name" defaultValue={r.route_name} required />
                      <Select label="Vehicle" name="transport_vehicle_id" defaultValue={r.transport_vehicle_id ?? ''} placeholder="No vehicle" options={vehOpts} />
                      <Input label="Monthly fee (₹)" name="monthly_fee" type="number" min={0} defaultValue={r.monthly_fee} />
                      <Textarea label="Stops" name="stops" rows={3} defaultValue={st.join('\n')} />
                      <SubmitButton>Save route</SubmitButton>
                    </ActionForm>
                  </details>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Card title="Put a student on a route">
        <ActionForm action={allocateTransport} className="grid gap-3 md:grid-cols-4 md:items-end">
          <Select label="Route" name="transport_route_id" required options={routes.map((r) => ({ value: r.id, label: `${r.route_name} (₹${r.monthly_fee}/mo)` }))} />
          <Select label="Student" name="student_id" required options={students.map((s) => ({ value: s.id, label: `${s.unique_student_id} - ${s.full_name}` }))} />
          <Input label="Pickup stop *" name="pickup_stop" required />
          <SubmitButton>Allocate</SubmitButton>
        </ActionForm>
      </Card>

      <Card title={`Students on transport (${allocations.length})`}>
        <Table head={['Student', 'Route', 'Pickup stop', 'Vehicle', 'Live', '']} empty="No students allocated yet.">
          {allocations.map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">{a.student.full_name}</Td><Td>{a.transportRoute.route_name}</Td><Td>{a.pickup_stop}</Td>
              <Td>{a.transportRoute.transportVehicle?.registration_no ?? '—'}</Td>
              <Td>{a.transportRoute.transportVehicle?.tracking_url ? <a href={a.transportRoute.transportVehicle.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"><MapPin className="h-3.5 w-3.5" />Track</a> : <span className="text-xs text-slate-400">—</span>}</Td>
              <Td><ActionForm action={cancelAllocation} hidden={{ id: a.id }} reset={false} inline><SubmitButton tone="slate">Cancel</SubmitButton></ActionForm></Td>
            </tr>
          ))}
        </Table>
      </Card>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><ShieldAlert className="h-3.5 w-3.5" />Tracking links open in a new tab on OneLap’s own site. Anyone holding a link can see that vehicle, so share links only with staff and the parents of children on that bus.</p>
    </div>
  );
}

type V = { registration_no: string; vehicle_type: string; capacity: number; driver_name: string; driver_phone: string; driver_license: string | null; gps_device_id: string | null; tracking_url: string | null; insurance_expiry: Date | null; fitness_expiry: Date | null };
function VehicleFields({ v }: { v?: V }) {
  return (
    <>
      <FormGrid cols={2}>
        <Input label="Vehicle name / number *" name="registration_no" required defaultValue={v?.registration_no} placeholder="e.g. KA 01 AB 1234 or Omni SLN" />
        <Select label="Type" name="vehicle_type" defaultValue={v?.vehicle_type ?? 'Bus'} options={['Bus', 'Mini Bus', 'Van']} />
        <Input label="Seats" name="capacity" type="number" min={1} defaultValue={v?.capacity ?? 45} />
        <Input label="Driver name" name="driver_name" defaultValue={v?.driver_name === '—' ? '' : v?.driver_name} />
        <Input label="Driver phone" name="driver_phone" defaultValue={v?.driver_phone === '—' ? '' : v?.driver_phone} />
        <Input label="Driver licence no." name="driver_license" defaultValue={v?.driver_license ?? ''} />
        <Input label="GPS device ID" name="gps_device_id" defaultValue={v?.gps_device_id ?? ''} />
        <Input label="Insurance valid until" name="insurance_expiry" type="date" defaultValue={toInputDate(v?.insurance_expiry)} />
        <Input label="Fitness valid until" name="fitness_expiry" type="date" defaultValue={toInputDate(v?.fitness_expiry)} />
      </FormGrid>
      <Input label="OneLap live-tracking link" name="tracking_url" type="url" defaultValue={v?.tracking_url ?? ''} placeholder="https://… (paste the link OneLap gives you for this vehicle)" />
    </>
  );
}
