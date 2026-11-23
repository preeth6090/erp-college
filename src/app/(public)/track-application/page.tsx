import { db } from '@/lib/db';
import { Badge } from '@/components/ui';
import { inputCls } from '@/components/ui';

export const metadata = { title: 'Track Application' };
export const dynamic = 'force-dynamic';

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ application_no?: string; submitted?: string }> }) {
  const { application_no, submitted } = await searchParams;
  const no = application_no?.trim();
  const app = no ? await db.admissionApplication.findUnique({ where: { application_no: no }, include: { course: true } }) : null;
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {submitted && app && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Application submitted! Your Application Number is <strong>{app.application_no}</strong>.
        </div>
      )}
      <h1 className="text-xl font-bold text-slate-900">Application Tracking Portal</h1>
      <p className="mb-4 mt-1 text-xs text-slate-500">Enter your Application Number (e.g. <code>APP-2026-1001</code>) to check verification, merit rank, and admission status.</p>
      <form method="GET" className="flex flex-wrap gap-2">
        <input name="application_no" defaultValue={no} placeholder="Enter Application Number..." className={inputCls} />
        <button className="rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white">Track Status</button>
      </form>
      {app && (
        <div className="mt-5 rounded-lg border border-slate-200 p-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">{app.full_name} ({app.application_no})</div>
            <Badge>{app.status}</Badge>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div><strong>Programme:</strong> {app.course.name}</div>
            <div><strong>Category:</strong> {app.category}</div>
            <div><strong>Merit Score:</strong> {app.merit_score}%</div>
            <div><strong>Merit Rank:</strong> {app.merit_rank ?? 'Pending'}</div>
            <div><strong>Fee Status:</strong> {app.application_fee_status} ({app.payment_txn_id})</div>
            <div><strong>Registration No:</strong> {app.registration_number ?? 'Pending Confirmation'}</div>
          </div>
        </div>
      )}
      {!app && no && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">No application found with number &quot;{no}&quot;.</div>}
    </div>
  );
}
