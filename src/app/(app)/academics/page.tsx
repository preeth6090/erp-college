import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, Checkbox, FormGrid, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { storeCalendar, storeCourse, storeDepartment, storeSubject } from '@/actions/academics';
import { ENUMS } from '@/lib/enums';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Course & Academic Management' };
export const dynamic = 'force-dynamic';

export default async function Academics() {
  await requireModule('academics');
  const [departments, courses, sessions, calendars, colleges] = await Promise.all([
    db.department.findMany(),
    db.course.findMany({ include: { department: true } }),
    db.academicSession.findMany(),
    db.academicCalendar.findMany({ orderBy: { start_date: 'asc' } }),
    db.college.findMany(),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Course, Curriculum (NEP 2020 / CBCS) & Academic Calendar" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Create Department">
          <ActionForm action={storeDepartment}>
            <FormGrid cols={2}>
              <Select label="College" name="college_id" options={colleges.map((c) => ({ value: c.id, label: c.code }))} />
              <Input label="Dept Code" name="code" required placeholder="e.g. MECH" />
              <Input label="Department Name" name="name" required />
              <Input label="HOD Name" name="hod_name" />
            </FormGrid>
            <SubmitButton>Add Department</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Academic Calendar">
          <ActionForm action={storeCalendar}>
            <FormGrid cols={2}>
              <Select label="Session" name="academic_session_id" options={sessions.map((s) => ({ value: s.id, label: s.name }))} />
              <Select label="Type" name="event_type" options={ENUMS.academic_calendars.event_type} />
              <Input label="Event / Holiday Title" name="title" required />
              <Input label="Start Date" name="start_date" type="date" required />
            </FormGrid>
            <SubmitButton>Add to Calendar</SubmitButton>
          </ActionForm>
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm">
            {calendars.map((c) => (
              <div key={c.id} className="flex justify-between border-b border-slate-100 py-1"><span><strong>{c.title}</strong> ({c.event_type})</span><span className="text-xs text-slate-500">{fmtDate(c.start_date)}</span></div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Create Course / Programme (UG / PG / Diploma / Certificate)">
        <ActionForm action={storeCourse}>
          <FormGrid cols={4}>
            <Select label="Department" name="department_id" options={departments.map((d) => ({ value: d.id, label: d.code }))} />
            <Input label="Course Code" name="code" required />
            <Select label="Level" name="level" options={ENUMS.courses.level} />
            <Input label="Programme Name" name="name" required />
            <Input label="Years" name="duration_years" type="number" defaultValue={3} />
            <Input label="Semesters" name="total_semesters" type="number" defaultValue={6} />
            <Input label="Credits" name="total_credits" type="number" defaultValue={120} />
            <Input label="Intake" name="intake_capacity" type="number" defaultValue={60} />
            <Input label="Cut-off %" name="cutoff_percentage" type="number" step="0.1" defaultValue={60} />
          </FormGrid>
          <div className="flex gap-4"><Checkbox label="NEP 2020" name="nep_2020_enabled" defaultChecked /><Checkbox label="CBCS" name="cbcs_enabled" defaultChecked /></div>
          <SubmitButton>Create Course</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Add Subject to Curriculum">
        <ActionForm action={storeSubject}>
          <FormGrid cols={4}>
            <Select label="Course" name="course_id" options={courses.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))} />
            <Input label="Semester" name="semester" type="number" defaultValue={1} />
            <Input label="Subject Code" name="code" required />
            <Input label="Subject Name" name="name" required />
            <Select label="Type" name="subject_type" options={ENUMS.subjects.subject_type} />
            <Input label="Credits" name="credits" type="number" step="0.5" defaultValue={4} />
            <Input label="Internal Marks" name="max_internal_marks" type="number" defaultValue={30} />
            <Input label="External Marks" name="max_external_marks" type="number" defaultValue={70} />
          </FormGrid>
          <SubmitButton>Add Subject</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Programmes">
        <Table head={['Code', 'Programme', 'Department', 'Level', 'Credits / Sem', 'NEP / CBCS']}>
          {courses.map((c) => (
            <tr key={c.id}>
              <Td className="font-mono text-xs">{c.code}</Td><Td className="font-medium">{c.name}</Td><Td>{c.department.code}</Td><Td>{c.level}</Td>
              <Td>{c.total_credits} Credits / {c.total_semesters} Sem</Td>
              <Td>{c.nep_2020_enabled && <Badge tone="indigo">NEP 2020</Badge>} {c.cbcs_enabled && <Badge tone="blue">CBCS</Badge>}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
