import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { storeSection, storeTimetableSlot } from '@/actions/academics';
import { hhmm } from '@/lib/format';

export const metadata = { title: 'Class & Timetable Management' };
export const dynamic = 'force-dynamic';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function Timetable() {
  await requireModule('timetable');
  const [sections, slotsRaw, courses, subjects, faculty] = await Promise.all([
    db.classSection.findMany({ include: { course: true } }),
    db.timetableSlot.findMany({ include: { classSection: { include: { course: true } }, subject: true, faculty: true, substituteFaculty: true }, orderBy: { start_time: 'asc' } }),
    db.course.findMany(), db.subject.findMany(),
    db.employee.findMany({ where: { employee_type: 'Faculty', status: 'Active' } }),
  ]);
  const slots = [...slotsRaw].sort((a, b) => DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week));
  const facOpts = faculty.map((f) => ({ value: f.id, label: f.full_name }));
  return (
    <div className="space-y-4">
      <PageHeader title="Class Sections & Timetable Management (with Conflict Detection)" />
      <Card title="Create Class / Section">
        <ActionForm action={storeSection}>
          <FormGrid cols={4}>
            <Select label="Course" name="course_id" options={courses.map((c) => ({ value: c.id, label: c.code }))} />
            <Input label="Semester" name="semester" type="number" defaultValue={1} />
            <Input label="Section" name="section_name" defaultValue="A" />
            <Input label="Classroom No" name="room_no" placeholder="e.g. CS-301" />
            <Select label="Class Teacher / Mentor" name="class_teacher_id" placeholder="Class Teacher / Mentor" options={facOpts} />
          </FormGrid>
          <SubmitButton>Create Section</SubmitButton>
        </ActionForm>
      </Card>
      <Card title="Schedule Lecture / Practical / Special Class (Auto Conflict Check)">
        <ActionForm action={storeTimetableSlot}>
          <FormGrid cols={4}>
            <Select label="Class Section" name="class_section_id" required options={sections.map((s) => ({ value: s.id, label: `${s.course.code} Sem ${s.semester} - ${s.section_name}` }))} />
            <Select label="Subject" name="subject_id" required options={subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))} />
            <Select label="Faculty" name="faculty_id" required options={facOpts} />
            <Select label="Day" name="day_of_week" options={DAYS} />
            <Input label="Start" name="start_time" type="time" defaultValue="11:00" required />
            <Input label="End" name="end_time" type="time" defaultValue="12:00" required />
            <Input label="Room / Lab No *" name="room_no" required />
            <Select label="Type" name="slot_type" options={['Lecture', 'Practical', 'Lab', 'Special']} />
            <Select label="Substitute Faculty" name="substitute_faculty_id" placeholder="Substitute Faculty (Optional)" options={facOpts} />
          </FormGrid>
          <SubmitButton>Check Conflicts &amp; Schedule Slot</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <Table head={['Day & Time', 'Class Section', 'Subject', 'Faculty / Substitute', 'Room & Type']}>
          {slots.map((s) => (
            <tr key={s.id}>
              <Td><div className="font-medium">{s.day_of_week}</div><div className="text-xs text-slate-500">{hhmm(s.start_time)} - {hhmm(s.end_time)}</div></Td>
              <Td>{s.classSection.course.code} Sem {s.classSection.semester} ({s.classSection.section_name})</Td>
              <Td>{s.subject.code} - {s.subject.name}</Td>
              <Td>{s.faculty.full_name} {s.substituteFaculty && <span className="text-xs text-amber-700">(Sub: {s.substituteFaculty.full_name})</span>}</Td>
              <Td>{s.room_no} • <Badge tone="blue">{s.slot_type}</Badge></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
