import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, LinkButton, PageHeader, Select, Table, Td } from '@/components/ui';
import { storeExam, storeMark, storeSchedule, togglePublish } from '@/actions/exams';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Examination Management' };
export const dynamic = 'force-dynamic';

export default async function Exams() {
  await requireModule('exams');
  const [exams, courses, sessions, subjects, faculty, students, marks] = await Promise.all([
    db.exam.findMany({ include: { course: true }, orderBy: { created_at: 'desc' } }),
    db.course.findMany(), db.academicSession.findMany(), db.subject.findMany(),
    db.employee.findMany({ where: { employee_type: 'Faculty' } }),
    db.student.findMany({ where: { status: 'Active' } }),
    db.examMark.findMany({ include: { student: true, subject: true }, orderBy: { created_at: 'desc' }, take: 50 }),
  ]);
  const examOpts = exams.map((e) => ({ value: e.id, label: e.name }));
  const subjOpts = subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
  return (
    <div className="space-y-4">
      <PageHeader title="Examination Management, Marks Entry & SGPA/CGPA" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Create Examination">
          <ActionForm action={storeExam}>
            <FormGrid cols={2}>
              <Input label="Exam Name" name="name" required placeholder="e.g. End-Sem Nov 2026" />
              <Select label="Type" name="exam_type" options={['End-Semester', 'Mid-Semester', 'Internal', 'Practical', 'Supplementary', 'Backlog']} />
              <Select label="Session" name="academic_session_id" options={sessions.map((s) => ({ value: s.id, label: s.name }))} />
              <Select label="Course" name="course_id" options={courses.map((c) => ({ value: c.id, label: c.code }))} />
              <Input label="Semester" name="semester" type="number" defaultValue={3} />
              <div />
              <Input label="Start Date" name="start_date" type="date" required />
              <Input label="End Date" name="end_date" type="date" required />
            </FormGrid>
            <SubmitButton>Create Exam</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Schedule & Invigilator Allocation">
          <ActionForm action={storeSchedule}>
            <FormGrid cols={2}>
              <Select label="Exam" name="exam_id" options={examOpts} />
              <Select label="Subject" name="subject_id" options={subjOpts} />
              <Input label="Date" name="exam_date" type="date" required />
              <Input label="Exam Hall" name="room_no" required />
              <Input label="Start" name="start_time" type="time" defaultValue="10:00" />
              <Input label="End" name="end_time" type="time" defaultValue="13:00" />
              <Select label="Invigilator" name="invigilator_id" placeholder="Invigilator" options={faculty.map((f) => ({ value: f.id, label: f.full_name }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Max" name="max_marks" type="number" defaultValue={100} />
                <Input label="Pass" name="passing_marks" type="number" defaultValue={40} />
              </div>
            </FormGrid>
            <SubmitButton>Schedule Paper</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card title="Marks Entry & Auto Grade/SGPA">
        <ActionForm action={storeMark}>
          <FormGrid cols={4}>
            <Select label="Exam" name="exam_id" options={examOpts} />
            <Select label="Student" name="student_id" options={students.map((s) => ({ value: s.id, label: `${s.unique_student_id} - ${s.full_name}` }))} />
            <Select label="Subject" name="subject_id" options={subjOpts} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Internal" name="internal_marks" type="number" step="0.5" required />
              <Input label="External" name="external_marks" type="number" step="0.5" required />
            </div>
          </FormGrid>
          <SubmitButton>Save Marks &amp; Compute Grade</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Active Examinations & Admit Cards">
        <div className="grid gap-3 md:grid-cols-2">
          {exams.map((e) => (
            <div key={e.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-semibold">{e.name} <span className="font-normal text-slate-500">({e.exam_type})</span></div>
              <div className="text-xs text-slate-500">{e.course.code} Sem {e.semester} • {fmtDate(e.start_date)} to {fmtDate(e.end_date)}</div>
              <div className="mt-2 flex items-center gap-2">
                <ActionForm action={togglePublish} hidden={{ id: e.id }} reset={false} inline>
                  <SubmitButton tone={e.is_published ? 'emerald' : 'slate'}>{e.is_published ? 'Results Published ✓' : 'Publish Results'}</SubmitButton>
                </ActionForm>
                {students[0] && <LinkButton href={`/exams/${e.id}/admit-card/${students[0].id}`} target="_blank">Sample Admit Card</LinkButton>}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Recent Marks">
        <Table head={['Student', 'Subject', 'Internal / External', 'Total & Grade', 'Status', 'Marksheet']}>
          {marks.map((m) => (
            <tr key={m.id}>
              <Td>{m.student.full_name}</Td><Td>{m.subject.code} - {m.subject.name}</Td><Td>{m.internal_marks} + {m.external_marks}</Td>
              <Td>{m.total_marks} ({m.grade} / {m.grade_point} GP)</Td><Td><Badge>{m.result_status}</Badge></Td>
              <Td><LinkButton href={`/students/${m.student_id}/marksheet`} target="_blank">View Marksheet</LinkButton></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
