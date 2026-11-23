import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { PrintButton } from '@/components/forms';

export const metadata = { title: 'Student ID Card' };

export default async function IdCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await db.student.findUnique({ where: { id: Number(id) }, include: { college: { include: { campus: true } }, department: true, course: true } });
  if (!s) notFound();
  const user = await requireRole('super_admin', 'student', 'parent', 'faculty');
  if (user.role?.slug === 'student' && s.user_id !== user.id) notFound();
  return (
    <div className="space-y-4">
      <div className="no-print text-center"><PrintButton label="Print ID Card" /></div>
      <div className="mx-auto w-80 overflow-hidden rounded-xl border-2 border-indigo-700 bg-white shadow">
        <div className="bg-indigo-700 px-4 py-3 text-center text-white">
          <div className="text-sm font-bold">{s.college.name}</div>
          <div className="text-[11px] text-indigo-200">{s.college.campus?.name}</div>
        </div>
        <div className="p-4 text-center">
          <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-3xl font-bold text-slate-500">{s.full_name.slice(0, 1)}</div>
          <div className="text-base font-bold">{s.full_name}</div>
          <div className="mb-3 text-xs text-slate-500">{s.unique_student_id} • {s.course.code}</div>
          <div className="space-y-0.5 text-left text-xs">
            <div><strong>Adm No:</strong> {s.admission_number}</div>
            <div><strong>Reg No:</strong> {s.registration_number}</div>
            <div><strong>Department:</strong> {s.department.name}</div>
            <div><strong>Blood Group:</strong> {s.blood_group ?? 'O+'}</div>
            <div><strong>Emergency:</strong> {s.emergency_contact_phone ?? s.phone}</div>
          </div>
        </div>
        <div className="bg-slate-100 py-2 text-center text-[10px] font-semibold text-slate-600">VALID FOR ACADEMIC SESSION 2026-27 • PRINCIPAL</div>
      </div>
    </div>
  );
}
