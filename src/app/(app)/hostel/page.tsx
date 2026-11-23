import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select } from '@/components/ui';
import { allocateHostel, storeHostelActivity } from '@/actions/facilities';
import { inr0 } from '@/lib/format';

export const metadata = { title: 'Hostel Management' };
export const dynamic = 'force-dynamic';

export default async function Hostel() {
  await requireRole('super_admin');
  const [hostels, rooms, allocations, activities, students] = await Promise.all([
    db.hostel.findMany({ include: { warden: true } }),
    db.hostelRoom.findMany({ include: { hostel: true } }),
    db.hostelAllocation.findMany({ include: { hostel: true, hostelRoom: true, student: true }, orderBy: { created_at: 'desc' } }),
    db.hostelActivity.findMany({ include: { hostel: true, student: true }, orderBy: { created_at: 'desc' } }),
    db.student.findMany({ where: { status: 'Active' } }),
  ]);
  const stuOpts = students.map((s) => ({ value: s.id, label: `${s.unique_student_id} - ${s.full_name}` }));
  return (
    <div className="space-y-4">
      <PageHeader title="Hostel, Mess & Room Allocation" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Allocate Hostel Room & Bed">
          <ActionForm action={allocateHostel}>
            <Select label="Room" name="hostel_room_id" options={rooms.map((r) => ({ value: r.id, label: `${r.hostel.name} - Room ${r.room_no} (${r.occupied_beds}/${r.capacity} beds)` }))} />
            <Select label="Student" name="student_id" options={stuOpts} />
            <Input label="Bed No" name="bed_no" required placeholder="e.g. B2" />
            <SubmitButton>Allocate Bed</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Log Visitor / Complaint / Outing / Maintenance">
          <ActionForm action={storeHostelActivity}>
            <FormGrid cols={2}>
              <Select label="Hostel" name="hostel_id" options={hostels.map((h) => ({ value: h.id, label: h.name }))} />
              <Select label="Type" name="activity_type" options={['Complaint', 'Outing Request', 'Visitor', 'Maintenance', 'Attendance']} />
              <Select label="Student" name="student_id" placeholder="Select Student (Optional)" options={students.map((s) => ({ value: s.id, label: s.full_name }))} />
              <Input label="Title / Summary *" name="title" required />
            </FormGrid>
            <Input label="Details" name="details" />
            <SubmitButton>Submit Log</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card title="Hostels & Active Allocations">
        <div className="grid gap-3 md:grid-cols-2">
          {hostels.map((h) => (
            <div key={h.id} className="flex justify-between rounded-lg border border-slate-200 p-3 text-sm">
              <div><strong>{h.name}</strong> ({h.type})<div className="text-xs text-slate-500">Warden: {h.warden?.full_name ?? 'Assigned'}</div></div>
              <div className="text-right">Fee: {inr0(h.monthly_fee)}/mo<div className="text-xs text-slate-500">Mess: {inr0(h.mess_fee)}/mo</div></div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs font-semibold uppercase text-slate-500">Allocated Students</div>
        <div className="mt-1 divide-y divide-slate-100">
          {allocations.map((a) => (
            <div key={a.id} className="flex justify-between py-1.5 text-sm"><span>{a.student.full_name}</span><span className="text-xs text-slate-500">{a.hostel.name} • Room {a.hostelRoom.room_no} ({a.bed_no})</span></div>
          ))}
        </div>
      </Card>
      <Card title="Visitor, Outing & Complaint Register">
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between"><strong>{a.title}</strong><span className="text-xs text-slate-500">{a.activity_type} • <Badge>{a.status}</Badge></span></div>
              <div className="text-xs text-slate-500">{a.hostel.name} {a.student ? `• ${a.student.full_name}` : ''}</div>
              <div className="text-xs">{a.details}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
