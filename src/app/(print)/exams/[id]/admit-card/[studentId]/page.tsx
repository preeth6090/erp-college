import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PrintButton } from '@/components/forms';
import { Signature, Table, Td } from '@/components/ui';
import { fmtDate, hhmm } from '@/lib/format';

export const metadata = { title: 'Admit Card' };

export default async function AdmitCard({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const user = await requireAccess({ module: 'exams', roles: ['faculty', 'student'] });
  const [exam, s] = await Promise.all([
    db.exam.findUnique({ where: { id: Number(id) }, include: { course: true, examSchedules: { include: { subject: true }, orderBy: { exam_date: 'asc' } } } }),
    db.student.findUnique({ where: { id: Number(studentId) }, include: { college: true } }),
  ]);
  if (!exam || !s) notFound();
  if (user.role?.slug === 'student' && s.user_id !== user.id) notFound();
  const reg = (await db.examRegistration.findFirst({ where: { exam_id: exam.id, student_id: s.id } }))
    ?? (await db.examRegistration.create({ data: { exam_id: exam.id, student_id: s.id, seat_no: `SEAT-${100 + Math.floor(Math.random() * 900)}`, admit_card_number: `ADM-${exam.id}-${s.id}` } }));
  return (
    <div className="print-full rounded-xl border-2 border-slate-800 bg-white p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-lg font-bold">{s.college.name}</h2>
          <p className="text-sm font-semibold">{exam.name} — HALL TICKET</p>
        </div>
        <PrintButton label="Print Admit Card" />
      </div>
      <div className="mb-4 grid gap-1 text-sm sm:grid-cols-2">
        <div><strong>Student Name:</strong> {s.full_name}</div>
        <div><strong>Admit Card No:</strong> {reg.admit_card_number}</div>
        <div><strong>USN / ID:</strong> {s.unique_student_id}</div>
        <div><strong>Seat No:</strong> {reg.seat_no}</div>
        <div><strong>Programme:</strong> {exam.course.name}</div>
        <div><strong>Semester:</strong> {exam.semester}</div>
      </div>
      <Table head={['Date', 'Time', 'Subject', 'Hall / Room']}>
        {exam.examSchedules.map((sc) => (
          <tr key={sc.id}><Td>{fmtDate(sc.exam_date)}</Td><Td>{hhmm(sc.start_time)} - {hhmm(sc.end_time)}</Td><Td>{sc.subject.code} - {sc.subject.name}</Td><Td>{sc.room_no}</Td></tr>
        ))}
      </Table>
      <div className="mt-10 flex justify-between text-xs"><span className="border-t border-slate-400 pt-1">Signature of Candidate</span><span className="border-t border-slate-400 pt-1">Controller of Examinations</span></div>
      <Signature label="Authorised Signatory" />
    </div>
  );
}
