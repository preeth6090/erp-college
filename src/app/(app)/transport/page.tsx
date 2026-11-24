import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { allocateTransport } from '@/actions/facilities';

export const metadata = { title: 'Transport Management' };
export const dynamic = 'force-dynamic';

function stops(json?: string | null): string[] {
  try { const v = JSON.parse(json ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

export default async function Transport() {
  await requireModule('transport');
  const [routes, allocations, students] = await Promise.all([
    db.transportRoute.findMany({ include: { transportVehicle: true } }),
    db.transportAllocation.findMany({ include: { transportRoute: true, student: true }, orderBy: { created_at: 'desc' } }),
    db.student.findMany({ where: { status: 'Active' } }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Transport, Routes & GPS Tracking" />
      <Card title="Allocate Student Transport Route">
        <ActionForm action={allocateTransport} className="grid gap-3 md:grid-cols-4 md:items-end">
          <Select label="Route" name="transport_route_id" options={routes.map((r) => ({ value: r.id, label: `${r.route_name} (₹${r.monthly_fee}/mo)` }))} />
          <Select label="Student" name="student_id" options={students.map((s) => ({ value: s.id, label: `${s.unique_student_id} - ${s.full_name}` }))} />
          <Input label="Pickup Bus Stop *" name="pickup_stop" required />
          <SubmitButton>Allocate Transport</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Vehicles & Routes">
        <div className="space-y-3">
          {routes.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-semibold">{r.route_name}</div>
              <div className="text-xs text-slate-500">Bus: {r.transportVehicle?.registration_no} • Driver: {r.transportVehicle?.driver_name} ({r.transportVehicle?.driver_phone}) • GPS: {r.transportVehicle?.gps_device_id}</div>
              <div className="mt-1 text-xs">Stops: {stops(r.stops_json).join(' → ')}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Route-wise Student Allocations">
        <Table head={['Student', 'Route', 'Pickup Stop', 'Status']}>
          {allocations.map((a) => <tr key={a.id}><Td>{a.student.full_name}</Td><Td>{a.transportRoute.route_name}</Td><Td>{a.pickup_stop}</Td><Td><Badge>{a.status}</Badge></Td></tr>)}
        </Table>
      </Card>
    </div>
  );
}
