import Link from 'next/link';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { attendancePct } from '@/lib/portal';
import { Card, PageHeader, Stat, inputCls } from '@/components/ui';
import { inr0 } from '@/lib/format';

export const metadata = { title: 'Parent Portal' };
export const dynamic = 'force-dynamic';

export default async function ParentPortal({ searchParams }: { searchParams: Promise<{ student_id?: string }> }) {
  const user = await requireRole('parent');
  const { student_id } = await searchParams;
  // Parents only see wards linked to their account; admins preview the first two students.
  const children = await db.student.findMany({
    where: user.role?.slug === 'parent' ? { studentGuardians: { some: { parent_user_id: user.id } } } : {},
    include: { course: true, studentAttendances: true, studentFeeAccounts: true, examMarks: { include: { subject: true } } },
    orderBy: { id: 'asc' }, take: user.role?.slug === 'parent' ? undefined : 2,
  });
  const child = children.find((c) => String(c.id) === student_id) ?? children[0];
  const announcements = await db.announcement.findMany({ where: { target_audience: { in: ['All', 'Parents', 'Students'] } }, orderBy: { created_at: 'desc' }, take: 5 });
  if (!child) return <><PageHeader title="Parent Portal" /><Card><p className="text-sm text-slate-500">No ward is linked to this account yet. Please contact the college office.</p></Card></>;
  return (
    <div className="space-y-4">
      <PageHeader title="Parent / Guardian Portal" />
      <Card title="Linked Ward / Child Switcher">
        <form method="GET" className="flex gap-2">
          <select name="student_id" defaultValue={child.id} className={inputCls + ' w-auto'}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.unique_student_id})</option>)}
          </select>
          <button className="rounded-lg bg-slate-800 px-4 text-xs font-semibold text-white">Switch</button>
        </form>
      </Card>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Ward" value={child.full_name} hint={`${child.course.name} • Sem ${child.current_semester}`} />
        <Stat label="Attendance Status" value={`${attendancePct(child.studentAttendances)}%`} tone="emerald" />
        <Stat label="Outstanding Fees" value={inr0(child.studentFeeAccounts.reduce((s, a) => s + a.balance_amount, 0))} tone="rose" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recent Exam Results" actions={<Link href={`/students/${child.id}/marksheet`} target="_blank" className="text-xs text-indigo-600">Full marksheet →</Link>}>
          {child.examMarks.map((m) => <div key={m.id} className="flex justify-between border-b border-slate-100 py-1.5 text-sm last:border-0"><span>{m.subject.code} - {m.subject.name}</span><span className="font-medium">{m.total_marks}/100 ({m.grade})</span></div>)}
        </Card>
        <Card title="College Notices & Emergency Alerts">
          {announcements.map((a) => <div key={a.id} className="border-b border-slate-100 py-2 text-sm last:border-0"><strong>{a.title}</strong><div className="text-xs text-slate-600">{a.message}</div></div>)}
        </Card>
      </div>
    </div>
  );
}
