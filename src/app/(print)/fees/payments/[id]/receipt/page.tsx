import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { PrintButton } from '@/components/forms';
import { Signature } from '@/components/ui';
import { fmtDate, inr } from '@/lib/format';

export const metadata = { title: 'Fee Receipt' };

export default async function FeeReceipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole('super_admin', 'accountant', 'student', 'parent');
  const p = await db.feePayment.findUnique({ where: { id: Number(id) }, include: { student: { include: { college: true, course: true, studentGuardians: true } }, studentFeeAccount: true } });
  if (!p) notFound();
  if (user.role?.slug === 'student' && p.student.user_id !== user.id) notFound();
  if (user.role?.slug === 'parent' && !p.student.studentGuardians.some((g) => g.parent_user_id === user.id)) notFound();
  return (
    <div className="print-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-5 flex items-start justify-between border-b pb-4">
        <div><h2 className="text-lg font-bold">{p.student.college.name}</h2><p className="text-xs text-slate-500">Official Student Fee Receipt</p></div>
        <PrintButton label="Print Receipt" />
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div><strong>Receipt No:</strong> {p.receipt_no}</div>
        <div><strong>Payment Date:</strong> {fmtDate(p.payment_date)}</div>
        <div><strong>Student Name:</strong> {p.student.full_name}</div>
        <div><strong>Student ID:</strong> {p.student.unique_student_id}</div>
        <div><strong>Programme:</strong> {p.student.course.name}</div>
        <div><strong>Payment Mode:</strong> {p.payment_mode} ({p.transaction_ref})</div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium">Amount Received</span><span className="text-xl font-bold">{inr(p.amount)}</span>
      </div>
      <div className="mt-2 text-xs text-slate-600">Balance Remaining: {inr(p.studentFeeAccount?.balance_amount ?? 0)}</div>
      <Signature label="Accounts Officer" />
    </div>
  );
}
