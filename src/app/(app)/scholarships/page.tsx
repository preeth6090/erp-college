import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, Input, PageHeader, Select, Table, Td, inputCls } from '@/components/ui';
import { applyScholarship, updateScholarshipStatus } from '@/actions/career';
import { inr0 } from '@/lib/format';

export const metadata = { title: 'Scholarships & Financial Aid' };
export const dynamic = 'force-dynamic';

export default async function Scholarships() {
  await requireRole('super_admin');
  const [schemes, applications, students] = await Promise.all([
    db.scholarship.findMany(),
    db.scholarshipApplication.findMany({ include: { scholarship: true, student: true }, orderBy: { created_at: 'desc' } }),
    db.student.findMany({ where: { status: 'Active' } }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Scholarships & Financial Aid (NSP / Institutional)" />
      <Card title="Submit Scholarship Application">
        <ActionForm action={applyScholarship} className="grid gap-3 md:grid-cols-4 md:items-end">
          <Select label="Scheme" name="scholarship_id" options={schemes.map((s) => ({ value: s.id, label: `${s.name} (${inr0(s.amount)})` }))} />
          <Select label="Student" name="student_id" options={students.map((s) => ({ value: s.id, label: `${s.unique_student_id} - ${s.full_name} (${s.category})` }))} />
          <Input label="Income / Merit Remarks" name="remarks" />
          <SubmitButton>Apply for Scholarship</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <Table head={['Student', 'Scheme', 'Amount', 'Status', 'Workflow']}>
          {applications.map((a) => (
            <tr key={a.id}>
              <Td>{a.student.full_name} ({a.student.category})</Td><Td>{a.scholarship.name}<div className="text-xs text-slate-500">{a.scholarship.scheme_type}</div></Td>
              <Td>{inr0(a.scholarship.amount)}</Td><Td><Badge>{a.status}</Badge></Td>
              <Td>
                <ActionForm action={updateScholarshipStatus} hidden={{ id: a.id }} className="flex gap-1" reset={false} inline>
                  <select name="status" defaultValue={a.status} className={inputCls + ' w-auto py-1 text-xs'}>{['Applied', 'Verified', 'Approved', 'Disbursed', 'Rejected'].map((s) => <option key={s}>{s}</option>)}</select>
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
