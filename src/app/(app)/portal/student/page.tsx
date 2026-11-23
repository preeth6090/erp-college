import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { attendancePct, studentFor } from '@/lib/portal';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, Input, LinkButton, PageHeader, Select, Stat } from '@/components/ui';
import { submitAssignment } from '@/actions/portals';
import { fmtDate, hhmm, inr0 } from '@/lib/format';

export const metadata = { title: 'Student Portal' };
export const dynamic = 'force-dynamic';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function StudentPortal() {
  const user = await requireRole('student');
  const base = await studentFor(user);
  if (!base) return <><PageHeader title="Student Self-Service Portal" /><Card><p className="text-sm text-slate-500">No student profile is linked to this account yet. Please contact the college office.</p></Card></>;
  const student = await db.student.findUniqueOrThrow({ where: { id: base.id }, include: { course: true, studentAttendances: true, studentFeeAccounts: { include: { feePayments: true } } } });
  const [slots, issues, assignments, announcements] = await Promise.all([
    student.class_section_id ? db.timetableSlot.findMany({ where: { class_section_id: student.class_section_id }, include: { subject: true }, orderBy: { start_time: 'asc' } }) : [],
    student.user_id ? db.libraryIssue.findMany({ where: { user_id: student.user_id }, include: { libraryBook: true } }) : [],
    db.lmsAssignment.findMany({ include: { subject: true }, orderBy: { created_at: 'desc' }, take: 6 }),
    db.announcement.findMany({ where: { target_audience: { in: ['All', 'Students'] } }, orderBy: { created_at: 'desc' }, take: 5 }),
  ]);
  const timetable = [...slots].sort((a, b) => DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week));
  const balance = student.studentFeeAccounts.reduce((s, a) => s + a.balance_amount, 0);
  const payments = student.studentFeeAccounts.flatMap((a) => a.feePayments);
  return (
    <div className="space-y-4">
      <PageHeader title={`Student Self-Service Portal — ${student.full_name}`} actions={<>
        <LinkButton href={`/students/${student.id}/id-card`} target="_blank">ID Card</LinkButton>
        <LinkButton href={`/students/${student.id}/marksheet`} target="_blank">Marksheet</LinkButton>
      </>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Student ID" value={student.unique_student_id} hint={`${student.course.code} • Sem ${student.current_semester}`} />
        <Stat label="Attendance" value={`${attendancePct(student.studentAttendances)}%`} hint="Min 75% required" tone="emerald" />
        <Stat label="Fee Balance" value={inr0(balance)} hint="Current Session" tone="rose" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="My Weekly Timetable">
          {timetable.length === 0 && <p className="text-sm text-slate-400">No timetable published yet.</p>}
          {timetable.map((s) => <div key={s.id} className="flex justify-between border-b border-slate-100 py-1.5 text-sm last:border-0"><span><strong>{s.day_of_week}</strong> ({hhmm(s.start_time)}-{hhmm(s.end_time)}) • {s.subject.name}</span><span className="text-xs text-slate-500">{s.room_no}</span></div>)}
        </Card>
        <Card title="Submit LMS Assignment">
          <ActionForm action={submitAssignment}>
            <Select label="Assignment" name="lms_assignment_id" options={assignments.map((a) => ({ value: a.id, label: `${a.subject.code} - ${a.title} (Due ${fmtDate(a.due_date)})` }))} />
            <Input label="Submission Link / Drive / GitHub URL *" name="submission_url" required />
            <Input label="Notes" name="submission_notes" />
            <SubmitButton>Submit Assignment</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Library Books & Fee Receipts">
          {issues.map((i) => <div key={i.id} className="flex justify-between py-1 text-sm"><span>{i.libraryBook.title}</span><span className="text-xs text-slate-500">{i.status} (Due: {fmtDate(i.due_date)})</span></div>)}
          {payments.map((p) => <div key={p.id} className="flex items-center justify-between py-1 text-sm"><span>Receipt {p.receipt_no} ({p.payment_mode})</span><LinkButton href={`/fees/payments/${p.id}/receipt`} target="_blank">{inr0(p.amount)} Print</LinkButton></div>)}
        </Card>
        <Card title="Notices & Announcements">
          {announcements.map((a) => <div key={a.id} className="border-b border-slate-100 py-2 text-sm last:border-0"><strong>{a.title}</strong> {a.is_emergency && <Badge tone="red">Emergency</Badge>}<div className="text-xs text-slate-600">{a.message}</div></div>)}
        </Card>
      </div>
    </div>
  );
}
