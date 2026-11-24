import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { employeeFor } from '@/lib/portal';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, LinkButton, PageHeader, Select, Stat } from '@/components/ui';
import { applyLeave } from '@/actions/portals';
import { fmtDate, hhmm } from '@/lib/format';

export const metadata = { title: 'Faculty Portal' };
export const dynamic = 'force-dynamic';

export default async function FacultyPortal() {
  const user = await requireRole('faculty');
  const base = await employeeFor(user);
  if (!base) return <><PageHeader title="Faculty Portal" /><Card><p className="text-sm text-slate-500">No employee profile is linked to this account yet.</p></Card></>;
  const f = await db.employee.findUniqueOrThrow({ where: { id: base.id }, include: { department: true, subjectAllocations: true, employeeLeaves: { orderBy: { created_at: 'desc' } } } });
  const slots = await db.timetableSlot.findMany({ where: { faculty_id: f.id }, include: { subject: true }, orderBy: { start_time: 'asc' } });
  return (
    <div className="space-y-4">
      <PageHeader title={`Faculty Portal — ${f.full_name}`} actions={<>
        <LinkButton href="/attendance">Mark Attendance</LinkButton><LinkButton href="/exams">Enter Marks</LinkButton><LinkButton href="/lms">Upload LMS Notes</LinkButton>
      </>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Faculty ID" value={f.staff_id} hint={f.designation} />
        <Stat label="Department" value={f.department?.code ?? 'All'} hint={f.specialization ?? ''} tone="sky" />
        <Stat label="Assigned Subjects" value={f.subjectAllocations.length} tone="emerald" />
        <Stat label="Weekly Workload" value={`${f.weekly_workload_hours} hrs`} tone="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="My Teaching Timetable">
          {slots.map((s) => <div key={s.id} className="row border-b border-slate-100 py-1.5 text-sm last:border-0"><span><strong>{s.day_of_week}</strong> ({hhmm(s.start_time)}-{hhmm(s.end_time)}) • {s.subject.name}</span><span className="text-xs text-slate-500">{s.room_no}</span></div>)}
        </Card>
        <Card title="Apply for Leave">
          <ActionForm action={applyLeave} hidden={{ employee_id: f.id }}>
            <FormGrid cols={2}>
              <Select label="Type" name="leave_type" options={['Casual', 'Medical', 'Earned', 'Duty']} />
              <Input label="Reason *" name="reason" required />
              <Input label="From" name="from_date" type="date" required />
              <Input label="To" name="to_date" type="date" required />
            </FormGrid>
            <SubmitButton>Submit Leave Request</SubmitButton>
          </ActionForm>
          <div className="mt-3 space-y-1">
            {f.employeeLeaves.map((l) => <div key={l.id} className="flex justify-between text-sm"><span>{l.leave_type} ({fmtDate(l.from_date)} to {fmtDate(l.to_date)})</span><Badge>{l.status}</Badge></div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
