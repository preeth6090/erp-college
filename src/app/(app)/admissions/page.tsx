import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, LinkButton, PageHeader, Table, Td, inputCls } from '@/components/ui';
import { generateMeritList, updateApplicationStatus } from '@/actions/admissions';

export const metadata = { title: 'Online Admission Management' };
export const dynamic = 'force-dynamic';
const STATUSES = ['Submitted', 'Verified', 'Merit Listed', 'Waiting List', 'Approved', 'Rejected', 'Confirmed', 'Cancelled'];

export default async function Admissions({ searchParams }: { searchParams: Promise<{ status?: string; course_id?: string }> }) {
  await requireRole('super_admin');
  const { status, course_id } = await searchParams;
  const [apps, courses] = await Promise.all([
    db.admissionApplication.findMany({
      where: { ...(status ? { status } : {}), ...(course_id ? { course_id: Number(course_id) } : {}) },
      include: { course: true },
      orderBy: { created_at: 'desc' },
    }),
    db.course.findMany(),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Online Admission Management & Merit List" actions={<LinkButton href="/apply" target="_blank">Public Application Form ↗</LinkButton>} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="GET" className="flex flex-wrap gap-2">
          <select name="course_id" defaultValue={course_id ?? ''} className={inputCls + ' w-auto'}>
            <option value="">All Programmes</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
          <select name="status" defaultValue={status ?? ''} className={inputCls + ' w-auto'}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="rounded-lg bg-slate-800 px-4 text-xs font-semibold text-white">Filter</button>
        </form>
        <ActionForm action={generateMeritList} className="flex flex-wrap gap-2" reset={false}>
          <input type="hidden" name="course_id" value={course_id ?? ''} />
          <SubmitButton tone="emerald">Generate Merit &amp; Waiting List</SubmitButton>
        </ActionForm>
      </div>
      <Card>
        <Table head={['App No', 'Applicant', 'Programme', '12th % / Merit', 'Rank', 'Status', 'Actions']}>
          {apps.map((a) => (
            <tr key={a.id}>
              <Td className="font-mono text-xs">{a.application_no}</Td>
              <Td><div className="font-medium">{a.full_name}</div><div className="text-xs text-slate-500">{a.category} • {a.phone}</div></Td>
              <Td>{a.course.code}</Td>
              <Td>{a.class_12_percentage ?? '-'}% / <strong>{a.merit_score}</strong></Td>
              <Td>{a.merit_rank ? `#${a.merit_rank}` : '-'}</Td>
              <Td><Badge>{a.status}</Badge>{a.registration_number && <div className="mt-1 text-[11px] text-slate-500">{a.registration_number}</div>}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <ActionForm action={updateApplicationStatus} hidden={{ id: a.id }} className="flex flex-wrap items-center gap-1" reset={false} inline>
                    <select name="status" defaultValue={a.status} className={inputCls + ' w-auto py-1 text-xs'}>
                      {['Verified', 'Merit Listed', 'Waiting List', 'Approved', 'Confirmed', 'Rejected', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <SubmitButton tone="slate">Update</SubmitButton>
                  </ActionForm>
                  <LinkButton href={`/admissions/${a.id}/receipt`} target="_blank">Receipt</LinkButton>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
