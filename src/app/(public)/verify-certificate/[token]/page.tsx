import { db } from '@/lib/db';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Verify Certificate' };
export const dynamic = 'force-dynamic';

export default async function Verify({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await db.certificate.findUnique({ where: { verification_token: token }, include: { student: { include: { course: true } } } });
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {c ? (
        <>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
          <h1 className="text-xl font-bold">Authentic Digital Certificate</h1>
          <p className="mb-4 text-xs text-slate-500">Verified by College ERP Institutional Registry</p>
          <div className="space-y-1 text-left text-sm">
            <div><strong>Certificate No:</strong> {c.certificate_no}</div>
            <div><strong>Type:</strong> {c.certificate_type} Certificate</div>
            <div><strong>Student:</strong> {c.student.full_name} ({c.student.unique_student_id})</div>
            <div><strong>Programme:</strong> {c.student.course.name}</div>
            <div><strong>Issue Date:</strong> {fmtDate(c.issue_date)}</div>
            <div><strong>Status:</strong> {c.status}</div>
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-3xl text-rose-600">✕</div>
          <h1 className="text-xl font-bold">Invalid Verification Token</h1>
          <p className="text-sm text-slate-500">No matching certificate found for this token.</p>
        </>
      )}
    </div>
  );
}
