import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { PrintButton } from '@/components/forms';
import { Signature, Table, Td } from '@/components/ui';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Marksheet & Transcript' };

export default async function Marksheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole('super_admin', 'faculty', 'student', 'parent');
  const s = await db.student.findUnique({
    where: { id: Number(id) },
    include: { college: true, course: true, department: true, examMarks: { include: { subject: true }, orderBy: { id: 'asc' } }, studentGuardians: true },
  });
  if (!s) notFound();
  if (user.role?.slug === 'student' && s.user_id !== user.id) notFound();
  if (user.role?.slug === 'parent' && !s.studentGuardians.some((g) => g.parent_user_id === user.id)) notFound();
  const marks = s.examMarks;
  const credits = marks.reduce((a, m) => a + (m.credits ?? 0), 0);
  const weighted = marks.reduce((a, m) => a + (m.credits ?? 0) * (m.grade_point ?? 0), 0);
  const sgpa = credits ? Math.round((weighted / credits) * 100) / 100 : 0;
  return (
    <div className="print-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-start justify-between border-b pb-3">
        <div>
          <h2 className="text-lg font-bold">{s.college.name}</h2>
          <p className="text-xs text-slate-500">{s.college.university_affiliation ?? 'Autonomous / Affiliated University'} • NEP 2020 CBCS Grade Card</p>
        </div>
        <PrintButton label="Print Transcript" />
      </div>
      <div className="mb-4 grid gap-1 text-sm sm:grid-cols-2">
        <div><strong>Student Name:</strong> {s.full_name}</div>
        <div><strong>Unique Student ID:</strong> {s.unique_student_id}</div>
        <div><strong>Registration No:</strong> {s.registration_number}</div>
        <div><strong>Programme:</strong> {s.course.name}</div>
        <div><strong>Department:</strong> {s.department.name}</div>
        <div><strong>Current Semester:</strong> {s.current_semester}</div>
      </div>
      <Table head={['Code', 'Subject Title', 'Credits', 'Internal', 'External', 'Total', 'Grade', 'GP', 'Result']}>
        {marks.map((m) => (
          <tr key={m.id}>
            <Td>{m.subject.code}</Td><Td>{m.subject.name}</Td><Td>{m.credits}</Td><Td>{m.internal_marks}</Td><Td>{m.external_marks}</Td>
            <Td>{m.total_marks}</Td><Td>{m.grade}</Td><Td>{m.grade_point}</Td><Td>{m.result_status}</Td>
          </tr>
        ))}
      </Table>
      <div className="mt-4 flex flex-wrap gap-6 text-sm font-semibold">
        <span>Total Credits Earned: {credits}</span><span>SGPA: {sgpa} / 10.00</span><span>CGPA: {sgpa} / 10.00</span><span>Date: {fmtDate(new Date())}</span>
      </div>
      <Signature label="Controller of Examinations • Principal" />
    </div>
  );
}
