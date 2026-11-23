import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td, inputCls } from '@/components/ui';
import { markEmployeeAttendance, markStudentAttendance, sendShortageAlerts, updateCorrection } from '@/actions/attendance';
import { fmtDate, toInputDate } from '@/lib/format';

export const metadata = { title: 'Attendance Management' };
export const dynamic = 'force-dynamic';

export default async function Attendance({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireRole('super_admin', 'faculty');
  const sp = await searchParams;
  const date = sp.date || toInputDate(new Date());
  const day = new Date(date + 'T00:00:00.000Z');
  const [subjects, students, employees, corrections] = await Promise.all([
    db.subject.findMany(),
    db.student.findMany({ where: { status: 'Active' }, include: { studentAttendances: true } }),
    db.employee.findMany({ where: { status: 'Active' } }),
    db.attendanceCorrection.findMany({ include: { user: true }, orderBy: { created_at: 'desc' } }),
  ]);
  const summary = students.map((s) => {
    const total = s.studentAttendances.length;
    const present = s.studentAttendances.filter((a) => ['Present', 'Late'].includes(a.status)).length;
    const pct = total ? Math.round((present / total) * 1000) / 10 : 100;
    return { s, total, present, pct, shortage: pct < 75 };
  });
  const shortage = summary.filter((r) => r.shortage);
  void day;
  return (
    <div className="space-y-4">
      <PageHeader title="Student & Faculty Attendance (Manual / QR / Biometric / RFID)" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`Mark Student Attendance (${date})`} className="lg:col-span-2" actions={
          <ActionForm action={sendShortageAlerts} inline reset={false} className="inline"><SubmitButton tone="rose">Send Shortage Alerts (&lt;75%)</SubmitButton></ActionForm>
        }>
          <ActionForm action={markStudentAttendance} reset={false}>
            <FormGrid>
              <Input label="Date" name="attendance_date" type="date" defaultValue={date} required />
              <Select label="Subject" name="subject_id" options={subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))} />
              <Select label="Method" name="method" options={['Manual', 'QR', 'Biometric', 'RFID']} />
            </FormGrid>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {students.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                  <span><span className="font-mono text-xs text-slate-500">{s.unique_student_id}</span> — {s.full_name}</span>
                  <select name={`statuses[${s.id}]`} className={inputCls + ' w-auto py-1 text-xs'}>
                    {['Present', 'Absent', 'Late', 'Excused'].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <SubmitButton>Save Student Attendance</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Faculty / Staff Biometric Log">
          <ActionForm action={markEmployeeAttendance}>
            <Select label="Employee" name="employee_id" options={employees.map((e) => ({ value: e.id, label: `${e.staff_id} - ${e.full_name}` }))} />
            <Input label="Date" name="attendance_date" type="date" defaultValue={date} required />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Check-in" name="check_in" type="time" defaultValue="09:00" />
              <Input label="Check-out" name="check_out" type="time" defaultValue="17:00" />
            </div>
            <Select label="Status" name="status" options={['Present', 'Late', 'Half Day', 'Absent', 'On Leave']} />
            <Select label="Method" name="method" options={['Biometric', 'RFID', 'Manual']} />
            <SubmitButton>Log Staff Attendance</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card title="Shortage Alert List (<75%)">
        {shortage.length === 0 ? <p className="text-sm text-emerald-700">All students have ≥ 75% attendance.</p> : (
          <div className="flex flex-wrap gap-2">{shortage.map((r) => <Badge key={r.s.id} tone="red">{r.s.full_name} — {r.pct}%</Badge>)}</div>
        )}
      </Card>
      <Card title="Attendance Summary">
        <Table head={['Student ID', 'Name', 'Total Classes', 'Present', 'Percentage', 'Eligibility']}>
          {summary.map((r) => (
            <tr key={r.s.id}>
              <Td className="font-mono text-xs">{r.s.unique_student_id}</Td><Td>{r.s.full_name}</Td><Td>{r.total}</Td><Td>{r.present}</Td><Td>{r.pct}%</Td>
              <Td>{r.shortage ? <Badge tone="red">Shortage Alert</Badge> : <Badge tone="green">Eligible</Badge>}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      {corrections.length > 0 && (
        <Card title="Attendance Correction Requests">
          <Table head={['Requested By', 'Date', 'Reason', 'Status', 'Action']}>
            {corrections.map((c) => (
              <tr key={c.id}>
                <Td>{c.user?.name ?? '—'}</Td><Td>{fmtDate(c.attendance_date)}</Td><Td>{c.reason}</Td><Td><Badge>{c.status}</Badge></Td>
                <Td>
                  <ActionForm action={updateCorrection} hidden={{ id: c.id }} className="flex flex-wrap items-center gap-1" reset={false} inline>
                    <select name="status" className={inputCls + ' w-auto py-1 text-xs'}><option>Approved</option><option>Rejected</option></select>
                    <SubmitButton tone="slate">Set</SubmitButton>
                  </ActionForm>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
