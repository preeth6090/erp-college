import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, Checkbox, Input, PageHeader, Select, Table, Td, Textarea, inputCls } from '@/components/ui';
import { resolveGrievance, storeDisciplinary, storeGrievance } from '@/actions/career';
import { toInputDate } from '@/lib/format';

export const metadata = { title: 'Grievance & Discipline' };
export const dynamic = 'force-dynamic';

export default async function Grievances() {
  await requireModule('grievances');
  const [grievances, students] = await Promise.all([db.grievance.findMany({ include: { student: true }, orderBy: { created_at: 'desc' } }), db.student.findMany()]);
  const stu = students.map((s) => ({ value: s.id, label: s.full_name }));
  return (
    <div className="space-y-4">
      <PageHeader title="Grievance Redressal & Discipline (Anti-Ragging)" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Submit Grievance / Anti-Ragging Complaint">
          <ActionForm action={storeGrievance}>
            <Select label="Student" name="student_id" placeholder="Anonymous / Student" options={stu} />
            <Select label="Category" name="category" options={['General', 'Anti-Ragging', 'Harassment', 'Academic', 'Hostel', 'Fee']} />
            <Input label="Complaint Subject *" name="subject" required />
            <Textarea label="Describe incident" name="description" required />
            <Checkbox label="Confidential Committee Handling" name="is_confidential" />
            <SubmitButton>Submit Complaint</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Log Disciplinary & Counselling Record">
          <ActionForm action={storeDisciplinary}>
            <Select label="Student" name="student_id" options={stu} />
            <Input label="Incident Date" name="incident_date" type="date" defaultValue={toInputDate(new Date())} />
            <Input label="Action Taken / Warning *" name="action_taken" required />
            <Textarea label="Incident & Counselling notes" name="description" required />
            <SubmitButton>Save Disciplinary Record</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card>
        <Table head={['Ticket', 'Category', 'Subject', 'Status', 'Resolution']}>
          {grievances.map((g) => (
            <tr key={g.id}>
              <Td className="font-mono text-xs">{g.ticket_no}</Td><Td><Badge tone="indigo">{g.category}</Badge></Td>
              <Td><div className="font-medium">{g.subject}</div><div className="text-xs text-slate-500">{g.is_confidential ? 'Confidential' : (g.student?.full_name ?? 'Anonymous')}</div></Td>
              <Td><Badge>{g.status}</Badge></Td>
              <Td>
                <ActionForm action={resolveGrievance} hidden={{ id: g.id }} className="flex flex-wrap items-center gap-1" reset={false} inline>
                  <input name="resolution_notes" defaultValue={g.resolution_notes ?? ''} placeholder="Resolution note..." className={inputCls + ' py-1 text-xs'} />
                  <select name="status" defaultValue={g.status} className={inputCls + ' w-auto py-1 text-xs'}>{['Under Review', 'Resolved', 'Closed'].map((s) => <option key={s}>{s}</option>)}</select>
                  <SubmitButton tone="slate">Update</SubmitButton>
                </ActionForm>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
