import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Card, Input, LinkButton, PageHeader, Select, Table, Td } from '@/components/ui';
import { issueCertificate } from '@/actions/career';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Certificates & Document Management' };
export const dynamic = 'force-dynamic';

export default async function Certificates() {
  await requireRole('super_admin');
  const [certs, students] = await Promise.all([db.certificate.findMany({ include: { student: true }, orderBy: { created_at: 'desc' } }), db.student.findMany()]);
  return (
    <div className="space-y-4">
      <PageHeader title="Certificates & QR Verification" />
      <Card title="Generate Digital Certificate">
        <ActionForm action={issueCertificate} className="grid gap-3 md:grid-cols-4 md:items-end">
          <Select label="Student" name="student_id" options={students.map((s) => ({ value: s.id, label: `${s.unique_student_id} - ${s.full_name}` }))} />
          <Select label="Type" name="certificate_type" options={['Bonafide', 'Transfer', 'Migration', 'Character', 'NOC', 'Course Completion', 'Provisional', 'Degree', 'Duplicate']} />
          <Input label="Purpose / Remarks" name="remarks" />
          <SubmitButton>Issue &amp; Generate QR</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <Table head={['Cert No', 'Student', 'Type', 'Issue Date', 'Actions']}>
          {certs.map((c) => (
            <tr key={c.id}>
              <Td className="font-mono text-xs">{c.certificate_no}</Td><Td>{c.student.full_name}</Td><Td>{c.certificate_type}</Td><Td>{fmtDate(c.issue_date)}</Td>
              <Td><div className="flex gap-1"><LinkButton href={`/certificates/${c.id}/print`} target="_blank">Print Certificate</LinkButton><LinkButton href={`/verify-certificate/${c.verification_token}`} target="_blank">QR Verify Link</LinkButton></div></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
