import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireAccess } from '@/lib/auth';
import { PrintButton } from '@/components/forms';
import { Signature } from '@/components/ui';
import { inr } from '@/lib/format';

export const metadata = { title: 'Admission Receipt' };

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess({ module: 'admissions' });
  const { id } = await params;
  const a = await db.admissionApplication.findUnique({ where: { id: Number(id) }, include: { course: { include: { department: { include: { college: true } } } } } });
  if (!a) notFound();
  return (
    <div className="print-full rounded-xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-lg font-bold">{a.course.department.college.name}</h2>
          <p className="text-xs text-slate-500">Official Admission &amp; Application Fee Receipt</p>
        </div>
        <PrintButton label="Print Receipt" />
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div><strong>Application No:</strong> {a.application_no}</div>
        <div><strong>Status:</strong> {a.status}</div>
        <div><strong>Applicant Name:</strong> {a.full_name}</div>
        <div><strong>Category:</strong> {a.category}</div>
        <div><strong>Programme:</strong> {a.course.name}</div>
        <div><strong>Registration No:</strong> {a.registration_number ?? 'Pending'}</div>
        <div><strong>Transaction ID:</strong> {a.payment_txn_id}</div>
        <div><strong>Amount Paid:</strong> {inr(a.application_fee_amount)}</div>
      </div>
      <Signature label="Authorized Signatory (Admissions)" />
    </div>
  );
}
