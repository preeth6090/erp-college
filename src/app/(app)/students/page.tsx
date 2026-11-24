import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, LinkButton, PageHeader, Select, Table, Td, inputCls } from '@/components/ui';
import { enrollStudent } from '@/actions/students';

export const metadata = { title: 'Student Information System' };
export const dynamic = 'force-dynamic';

export default async function Students({ searchParams }: { searchParams: Promise<{ search?: string; course_id?: string; status?: string }> }) {
  await requireModule('students');
  const { search, course_id, status } = await searchParams;
  const [students, courses, departments, colleges] = await Promise.all([
    db.student.findMany({
      where: {
        ...(search ? { OR: [{ full_name: { contains: search, mode: 'insensitive' } }, { unique_student_id: { contains: search, mode: 'insensitive' } }, { admission_number: { contains: search, mode: 'insensitive' } }] } : {}),
        ...(course_id ? { course_id: Number(course_id) } : {}),
        ...(status ? { status } : {}),
      },
      include: { course: true },
      orderBy: { created_at: 'desc' },
    }),
    db.course.findMany(), db.department.findMany(), db.college.findMany(),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Student Information Management System (SIS)" />
      <Card title="Enroll New Student">
        <ActionForm action={enrollStudent}>
          <FormGrid cols={4}>
            <Select label="College" name="college_id" required options={colleges.map((c) => ({ value: c.id, label: c.code }))} />
            <Select label="Department" name="department_id" required options={departments.map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` }))} />
            <Select label="Course" name="course_id" required options={courses.map((c) => ({ value: c.id, label: c.code }))} />
            <Input label="Semester" name="current_semester" type="number" defaultValue={1} min={1} max={10} />
            <Input label="Student Full Name *" name="full_name" required />
            <Input label="Email *" name="email" type="email" required />
            <Input label="Mobile *" name="phone" required />
            <Select label="Gender" name="gender" options={['Male', 'Female', 'Other']} />
            <Select label="Category" name="category" options={['General', 'OBC', 'SC', 'ST', 'EWS']} />
            <Input label="Parent / Guardian Name" name="guardian_name" />
            <Input label="Guardian Mobile" name="guardian_phone" />
          </FormGrid>
          <SubmitButton>Enroll Student</SubmitButton>
        </ActionForm>
      </Card>
      <form method="GET" className="flex flex-wrap gap-2">
        <input name="search" defaultValue={search} placeholder="Search Name / ID / Adm No..." className={inputCls + ' w-full sm:w-64'} />
        <select name="course_id" defaultValue={course_id ?? ''} className={inputCls + ' w-auto'}>
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <select name="status" defaultValue={status ?? ''} className={inputCls + ' w-auto'}>
          <option value="">All Status</option>
          {['Active', 'Passed Out', 'Suspended', 'Withdrawn'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="rounded-lg bg-slate-800 px-4 text-xs font-semibold text-white">Search</button>
      </form>
      <Card>
        <Table head={['Student ID', 'Name & Contact', 'Course / Sem', 'Category', 'Status', 'Actions']}>
          {students.map((s) => (
            <tr key={s.id}>
              <Td><span className="font-mono text-xs">{s.unique_student_id}</span><div className="text-[11px] text-slate-500">{s.admission_number}</div></Td>
              <Td><div className="font-medium">{s.full_name}</div><div className="text-xs text-slate-500">{s.email} • {s.phone}</div></Td>
              <Td>{s.course.code} • Sem {s.current_semester}</Td>
              <Td>{s.category}</Td>
              <Td><Badge>{s.status}</Badge></Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1">
                  <LinkButton href={`/students/${s.id}`}>Profile</LinkButton>
                  <LinkButton href={`/students/${s.id}/id-card`} target="_blank">ID Card</LinkButton>
                  <LinkButton href={`/students/${s.id}/marksheet`} target="_blank">Transcript</LinkButton>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
