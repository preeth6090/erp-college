import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td, inputCls } from '@/components/ui';
import { applyDrive, storeDrive, updatePlacementStatus } from '@/actions/career';

export const metadata = { title: 'Placement & Career' };
export const dynamic = 'force-dynamic';

export default async function Placements() {
  await requireRole('super_admin');
  const [companies, drives, applications, students] = await Promise.all([
    db.placementCompany.findMany(),
    db.placementDrive.findMany({ include: { placementCompany: true }, orderBy: { created_at: 'desc' } }),
    db.placementApplication.findMany({ include: { placementDrive: { include: { placementCompany: true } }, student: { include: { course: true } } }, orderBy: { created_at: 'desc' } }),
    db.student.findMany({ where: { status: 'Active' } }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Placement & Career Management" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Schedule Placement / Internship Drive">
          <ActionForm action={storeDrive}>
            <FormGrid cols={2}>
              <Select label="Company" name="placement_company_id" options={companies.map((c) => ({ value: c.id, label: c.name }))} />
              <Select label="Type" name="drive_type" options={['Full-Time', 'Internship']} />
              <Input label="Job Role *" name="job_title" required />
              <Input label="Package (LPA) *" name="package_lpa" type="number" step="0.1" required />
              <Input label="Min CGPA" name="eligibility_cgpa" type="number" step="0.1" defaultValue={6.5} />
              <Input label="Drive Date" name="drive_date" type="date" required />
            </FormGrid>
            <SubmitButton>Publish Drive</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Nominate / Register Student for Drive">
          <ActionForm action={applyDrive}>
            <Select label="Drive" name="placement_drive_id" options={drives.map((d) => ({ value: d.id, label: `${d.placementCompany.name} - ${d.job_title} (${d.package_lpa} LPA)` }))} />
            <Select label="Student" name="student_id" options={students.map((s) => ({ value: s.id, label: `${s.unique_student_id} - ${s.full_name}` }))} />
            <SubmitButton>Register Student</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card title="Campus Recruitment & Selection Tracker">
        <Table head={['Student', 'Company & Role', 'Package', 'Status', 'Update']}>
          {applications.map((a) => (
            <tr key={a.id}>
              <Td>{a.student.full_name}<div className="text-xs text-slate-500">{a.student.course.code}</div></Td>
              <Td>{a.placementDrive.placementCompany.name} • {a.placementDrive.job_title}</Td><Td>{a.placementDrive.package_lpa} LPA</Td><Td><Badge>{a.status}</Badge></Td>
              <Td>
                <ActionForm action={updatePlacementStatus} hidden={{ id: a.id }} className="flex gap-1" reset={false} inline>
                  <select name="status" defaultValue={a.status} className={inputCls + ' w-auto py-1 text-xs'}>{['Applied', 'Shortlisted', 'Interviewed', 'Selected', 'Rejected'].map((s) => <option key={s}>{s}</option>)}</select>
                  <SubmitButton tone="slate">Save</SubmitButton>
                </ActionForm>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
