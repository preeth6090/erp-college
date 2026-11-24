import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { BarChart, DoughnutChart, LineChart, PieChart } from '@/components/Charts';
import { ActionItem, Funnel, Kpi, Panel, PanelLink, Progress, Ring, Tile } from '@/components/dash';
import {
  Activity, AlertTriangle, Award, BadgeCheck, BedDouble, BookOpen, Briefcase, Bus, CalendarCheck, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, FileText,
  GraduationCap, Hourglass, KeyRound, Landmark, LogIn, Megaphone, MessageSquare, Package, PartyPopper, Receipt, ShieldAlert, Sparkles, Trophy, UserCheck, UserPlus, Users, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { addDays, fmtDate, fmtDateTime, inr0, num0, todayDate } from '@/lib/format';

export const metadata = { title: 'Dashboard & Analytics' };
export const dynamic = 'force-dynamic';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** All dashboard numbers, cached for 60 s so refreshes don't hammer the (free-tier) database. */
const loadDashboard = unstable_cache(async () => {
  const today = todayDate();
  const tomorrow = addDays(today, 1);
  const from10 = addDays(today, -9);
  const sixMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

  const [
    totalStudents, newStudents30, faculty, staff, enquiries, convertedEnq, applications, appsByStatus,
    attendance10, feePayments, feeAgg, books, overdue, issued, drives, placementApps, selected, vouchers,
    courses, depts, upcomingExams, events, announcements, grades, budgets, audit,
    pendingLeaves, openGrievances, pendingAdmissions, pendingScholarships, lowStock, pendingReq,
  ] = await Promise.all([
    db.student.count({ where: { status: 'Active' } }),
    db.student.count({ where: { admission_date: { gte: addDays(today, -30) } } }),
    db.employee.count({ where: { employee_type: 'Faculty', status: 'Active' } }),
    db.employee.count({ where: { employee_type: { not: 'Faculty' }, status: 'Active' } }),
    db.admissionEnquiry.count(),
    db.admissionEnquiry.count({ where: { status: 'Converted' } }),
    db.admissionApplication.count(),
    db.admissionApplication.groupBy({ by: ['status'], _count: { _all: true } }),
    db.studentAttendance.findMany({ where: { attendance_date: { gte: from10, lt: tomorrow } }, select: { attendance_date: true, status: true } }),
    db.feePayment.findMany({ where: { status: 'Completed', payment_date: { gte: sixMonthsAgo } }, select: { payment_date: true, amount: true } }),
    db.studentFeeAccount.aggregate({ _sum: { balance_amount: true, paid_amount: true, total_amount: true }, _count: { _all: true } }),
    db.libraryBook.aggregate({ _sum: { total_copies: true } }),
    db.libraryIssue.count({ where: { status: { not: 'Returned' }, due_date: { lt: today } } }),
    db.libraryIssue.count({ where: { status: { not: 'Returned' } } }),
    db.placementDrive.count(),
    db.placementApplication.count(),
    db.placementApplication.count({ where: { status: 'Selected' } }),
    db.financialVoucher.groupBy({ by: ['voucher_type'], _sum: { amount: true } }),
    db.course.findMany({ include: { _count: { select: { students: true } } } }),
    db.department.findMany({ include: { _count: { select: { students: true } } } }),
    db.exam.findMany({ where: { end_date: { gte: today } }, orderBy: { start_date: 'asc' }, take: 4, include: { course: true } }),
    db.campusEvent.findMany({ where: { event_date: { gte: today } }, orderBy: { event_date: 'asc' }, take: 3 }),
    db.announcement.findMany({ orderBy: { created_at: 'desc' }, take: 3 }),
    db.examMark.groupBy({ by: ['grade'], _count: { _all: true } }),
    db.departmentBudget.findMany({ include: { department: true } }),
    db.auditLog.findMany({ orderBy: { created_at: 'desc' }, take: 6, include: { user: true } }),
    db.employeeLeave.count({ where: { status: 'Pending' } }),
    db.grievance.count({ where: { status: { in: ['Submitted', 'Under Review'] } } }),
    db.admissionApplication.count({ where: { status: { in: ['Submitted', 'Waiting List'] } } }),
    db.scholarshipApplication.count({ where: { status: { in: ['Applied', 'Verified'] } } }),
    db.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
    db.purchaseRequisition.count({ where: { status: 'Pending' } }),
  ]);

  // ── derived numbers ──
  const statusCount = (s: string) => appsByStatus.find((x) => x.status === s)?._count._all ?? 0;
  const confirmed = statusCount('Confirmed');
  const meritListed = statusCount('Merit Listed') + statusCount('Approved') + confirmed;
  const verified = statusCount('Verified') + meritListed;

  const days = Array.from({ length: 10 }, (_, i) => addDays(from10, i));
  const attPct = days.map((d) => {
    const rows = attendance10.filter((a) => dayKey(a.attendance_date) === dayKey(d));
    return pct(rows.filter((r) => r.status === 'Present' || r.status === 'Late').length, rows.length);
  });
  const todayAtt = attPct[attPct.length - 1] || attPct.filter(Boolean).at(-1) || 0;

  const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + i, 1)));
  const monthLabel = (d: Date) => d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
  const feeByMonth = months.map((m) => feePayments.filter((p) => p.payment_date.getUTCFullYear() === m.getUTCFullYear() && p.payment_date.getUTCMonth() === m.getUTCMonth()).reduce((s, p) => s + p.amount, 0));
  const last = feeByMonth[5], prev = feeByMonth[4];
  const feeTrend = prev ? Math.round(((last - prev) / prev) * 100) : 0;

  const collected = feeAgg._sum.paid_amount ?? 0;
  const outstanding = feeAgg._sum.balance_amount ?? 0;
  const billed = feeAgg._sum.total_amount ?? 0;
  const vsum = (t: string) => vouchers.find((v) => v.voucher_type === t)?._sum.amount ?? 0;
  const income = vsum('Receipt') + collected;
  const expense = vsum('Payment');
  const conv = pct(convertedEnq, enquiries);
  const pendingTotal = pendingLeaves + openGrievances + pendingAdmissions + pendingScholarships + overdue + pendingReq;
  const monthLabels = months.map(monthLabel);
  const dayLabels = days.map((d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }));
  return { totalStudents, newStudents30, faculty, staff, enquiries, applications, attPct, todayAtt, feeByMonth, feeTrend, collected, outstanding, billed, feeAgg, income, expense, conv, books, overdue, issued, drives, placementApps, selected, courses, depts, upcomingExams, events, announcements, grades, budgets, audit, pendingLeaves, openGrievances, pendingAdmissions, pendingScholarships, lowStock, pendingReq, verified, meritListed, confirmed, pendingTotal, monthLabels, dayLabels };
}, ['dashboard-v2'], { revalidate: 60 });

export default async function Dashboard() {
  const user = await requireModule('dashboard');
  const {
    totalStudents,
    newStudents30,
    faculty,
    staff,
    enquiries,
    applications,
    attPct,
    todayAtt,
    feeByMonth,
    feeTrend,
    collected,
    outstanding,
    billed,
    feeAgg,
    income,
    expense,
    conv,
    books,
    overdue,
    issued,
    drives,
    placementApps,
    selected,
    courses,
    depts,
    upcomingExams,
    events,
    announcements,
    grades,
    budgets,
    audit,
    pendingLeaves,
    openGrievances,
    pendingAdmissions,
    pendingScholarships,
    lowStock,
    pendingReq,
    verified,
    meritListed,
    confirmed,
    pendingTotal,
    monthLabels,
    dayLabels,
  } = await loadDashboard();
  const hour = new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' });
  const greet = Number(hour) < 12 ? 'Good morning' : Number(hour) < 17 ? 'Good afternoon' : 'Good evening';

  const auditIcon = (a: string): LucideIcon => (/FAILED|BLOCKED|LOCKED/.test(a) ? ShieldAlert : a === 'LOGIN' || a === 'INVITE_ACCEPTED' ? LogIn : /MEMBER|INVITE|ROLE/.test(a) ? UserPlus : /PASSWORD/.test(a) ? KeyRound : Activity);
  const feePct = pct(collected, billed);

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-5 text-white shadow-xl shadow-indigo-900/20 sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <CalendarDays className="h-3.5 w-3.5" />{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{greet}, {user.name.split(' (')[0]}</h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-indigo-100">
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4" />{pendingTotal > 0 ? `${pendingTotal} items need your attention` : 'Everything is up to date'}</span>
              <span className="hidden text-indigo-300 sm:inline">•</span><span>Academic Year 2026-27 · Odd Semester</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {([[UserPlus, 'Enrol student', '/students'], [Wallet, 'Collect fee', '/fees'], [CalendarCheck, 'Mark attendance', '/attendance'], [Megaphone, 'Post notice', '/communication']] as [LucideIcon, string, string][]).map(([Icon, l, h]) => (
                <Link key={h} href={h} className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"><Icon className="h-4 w-4" />{l}</Link>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-around gap-6 rounded-2xl bg-white/10 p-4 backdrop-blur sm:justify-center sm:gap-8 sm:p-5">
            <Ring value={todayAtt} label="Attendance today" />
            <Ring value={feePct} label="Fees collected" color="#fcd34d" />
            <Ring value={conv} label="Enquiry conversion" color="#6ee7b7" />
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active students" value={num0(totalStudents)} sub={`+${newStudents30} joined in the last 30 days`} icon={GraduationCap} tone="indigo" href="/students" />
        <Kpi label="Faculty & staff" value={<>{faculty}<span className="text-base font-medium text-slate-400"> / {staff}</span></>} sub="Teaching / non-teaching" icon={Users} tone="sky" href="/hr" />
        <Kpi label="Today's attendance" value={`${todayAtt}%`} sub="Campus average" icon={UserCheck} tone="emerald" spark={attPct} href="/attendance" />
        <Kpi label="Fees collected" value={inr0(collected)} sub={`${feePct}% of ${inr0(billed)} billed`} icon={Wallet} tone="violet" spark={feeByMonth} trend={{ pct: feeTrend }} href="/fees" />
        <Kpi label="Outstanding fees" value={inr0(outstanding)} sub={`${feeAgg._count._all} student accounts`} icon={Hourglass} tone="rose" href="/fees" />
        <Kpi label="Admissions" value={applications} sub={`${pendingAdmissions} pending · ${conv}% enquiry conversion`} icon={FileText} tone="amber" href="/admissions" />
        <Kpi label="Library" value={<>{issued}<span className="text-base font-medium text-slate-400"> issued</span></>} sub={`${overdue} overdue · ${num0(books._sum.total_copies)} copies`} icon={BookOpen} tone="sky" href="/library" />
        <Kpi label="Placements" value={<>{selected}<span className="text-base font-medium text-slate-400"> selected</span></>} sub={`${drives} drives · ${placementApps} applications`} icon={Briefcase} tone="emerald" href="/placements" />
      </div>

      {/* ── Jump to ── */}
      <div>
        <div className="mb-3 text-sm font-semibold text-slate-900">Jump to</div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <Tile href="/students" icon={GraduationCap} label="Students" tone="indigo" />
          <Tile href="/exams" icon={ClipboardCheck} label="Exams" tone="violet" />
          <Tile href="/timetable" icon={CalendarDays} label="Timetable" tone="sky" />
          <Tile href="/finance" icon={Landmark} label="Finance" tone="emerald" />
          <Tile href="/hostel" icon={BedDouble} label="Hostel" tone="amber" />
          <Tile href="/transport" icon={Bus} label="Transport" tone="rose" />
          <Tile href="/certificates" icon={BadgeCheck} label="Certificates" tone="indigo" />
          <Tile href="/scholarships" icon={Award} label="Scholarships" tone="violet" />
        </div>
      </div>

      {/* ── Trends ── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Fee collection" subtitle="Last 6 months · completed payments" icon={Receipt} className="xl:col-span-2">
          <div className="h-64"><LineChart labels={monthLabels} series={[{ label: 'Collected', data: feeByMonth, color: '#6366f1' }]} money /></div>
        </Panel>
        <Panel title="Finance snapshot" subtitle="Revenue vs expense vs dues" icon={Landmark}>
          <div className="h-64"><DoughnutChart labels={['Revenue', 'Expense', 'Outstanding fees']} data={[income, expense, outstanding]} colors={['#10b981', '#f43f5e', '#f59e0b']} money /></div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Attendance trend" subtitle="Last 10 days · present + late" icon={CalendarCheck}>
          <div className="h-56"><LineChart labels={dayLabels} series={[{ label: 'Attendance', data: attPct, color: '#10b981' }]} percent /></div>
        </Panel>
        <Panel title="Students by programme" subtitle="Active enrolment" icon={GraduationCap}>
          <div className="h-56"><BarChart labels={courses.map((c) => c.code)} data={courses.map((c) => c._count.students)} horizontal /></div>
        </Panel>
        <Panel title="Grade distribution" subtitle="All published results" icon={Trophy}>
          <div className="h-56">{grades.length ? <PieChart labels={grades.map((g) => g.grade ?? 'N/A')} data={grades.map((g) => g._count._all)} /> : <p className="pt-20 text-center text-sm text-slate-400">No marks entered yet.</p>}</div>
        </Panel>
      </div>

      {/* ── Funnel + attention ── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Admissions funnel" subtitle="From enquiry to confirmed seat" icon={ClipboardList} className="xl:col-span-2">
          <Funnel steps={[
            { label: 'Enquiries', value: enquiries, icon: MessageSquare }, { label: 'Applications', value: applications, icon: FileText }, { label: 'Verified', value: verified, icon: CheckCircle2 },
            { label: 'Merit listed', value: meritListed, icon: Trophy }, { label: 'Confirmed', value: confirmed, icon: BadgeCheck },
          ]} />
          <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-4 text-center">
            <div><div className="text-xl font-bold text-slate-900">{conv}%</div><div className="text-[11px] text-slate-500">Enquiry conversion</div></div>
            <div><div className="text-xl font-bold text-slate-900">{pct(confirmed, applications)}%</div><div className="text-[11px] text-slate-500">Application yield</div></div>
            <div><div className="text-xl font-bold text-slate-900">{pct(selected, placementApps)}%</div><div className="text-[11px] text-slate-500">Placement rate</div></div>
          </div>
        </Panel>
        <Panel title="Needs your attention" subtitle={`${pendingTotal} open item${pendingTotal === 1 ? '' : 's'}`} icon={AlertTriangle}>
          <div className="space-y-2">
            <ActionItem icon={FileText} label="Applications to verify" count={pendingAdmissions} href="/admissions" />
            <ActionItem icon={CalendarDays} label="Leave requests" count={pendingLeaves} href="/hr" />
            <ActionItem icon={ShieldAlert} label="Open grievances" count={openGrievances} href="/grievances" tone="rose" />
            <ActionItem icon={Award} label="Scholarships in review" count={pendingScholarships} href="/scholarships" tone="sky" />
            <ActionItem icon={BookOpen} label="Overdue library books" count={overdue} href="/library" tone="rose" />
            <ActionItem icon={Receipt} label="Requisitions pending" count={pendingReq} href="/procurement" tone="sky" />
            <ActionItem icon={Package} label="Low-stock items" count={lowStock} href="/procurement" tone="emerald" />
          </div>
        </Panel>
      </div>

      {/* ── Schedule, budgets, notices ── */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Upcoming" subtitle="Exams and campus events" icon={CalendarDays} action={<PanelLink href="/exams">Manage</PanelLink>}>
          <div className="space-y-3">
            {upcomingExams.length + events.length === 0 && <p className="text-sm text-slate-400">Nothing scheduled.</p>}
            {upcomingExams.map((e) => (
              <div key={`e${e.id}`} className="flex items-center gap-3">
                <div className="w-12 shrink-0 rounded-xl bg-indigo-50 py-1.5 text-center ring-1 ring-indigo-100"><div className="text-[10px] font-semibold uppercase text-indigo-500">{new Date(e.start_date).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })}</div><div className="text-lg font-bold leading-none text-indigo-700">{new Date(e.start_date).getUTCDate()}</div></div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{e.name}</div><div className="text-xs text-slate-500">{e.course.code} · Sem {e.semester} · {e.exam_type}</div></div>
                <ClipboardCheck className="h-4 w-4 shrink-0 text-indigo-300" />
              </div>
            ))}
            {events.map((e) => (
              <div key={`v${e.id}`} className="flex items-center gap-3">
                <div className="w-12 shrink-0 rounded-xl bg-amber-50 py-1.5 text-center ring-1 ring-amber-100"><div className="text-[10px] font-semibold uppercase text-amber-600">{new Date(e.event_date).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })}</div><div className="text-lg font-bold leading-none text-amber-700">{new Date(e.event_date).getUTCDate()}</div></div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{e.title}</div><div className="text-xs text-slate-500">{e.venue} · {e.category}</div></div>
                <PartyPopper className="h-4 w-4 shrink-0 text-amber-300" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Department budgets" subtitle="Utilisation · FY 2026-27" icon={Landmark}>
          <div className="space-y-4">
            {budgets.length === 0 && <p className="text-sm text-slate-400">No budgets configured.</p>}
            {budgets.map((b) => <Progress key={b.id} label={b.department.name} value={b.utilized_amount} max={b.allocated_amount} right={`${inr0(b.utilized_amount)} / ${inr0(b.allocated_amount)}`} />)}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Students by department</div>
            <div className="space-y-3">{depts.map((d) => <Progress key={d.id} label={d.code} value={d._count.students} max={Math.max(totalStudents, 1)} tone="sky" right={`${d._count.students}`} />)}</div>
          </div>
        </Panel>
        <Panel title="Notices & activity" icon={Megaphone} action={<PanelLink href="/communication">All</PanelLink>}>
          <div className="space-y-2.5">
            {announcements.map((a) => (
              <div key={a.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{a.title}</span><Badge tone={a.is_emergency ? 'red' : 'blue'}>{a.channel}</Badge></div>
                <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.message}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent activity</div>
            <ul className="space-y-2.5">
              {audit.map((l) => {
                const Icon = auditIcon(l.action);
                const bad = /FAILED|BLOCKED|LOCKED/.test(l.action);
                return (
                  <li key={l.id} className="flex gap-2.5 text-xs">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${bad ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}><Icon className="h-3.5 w-3.5" /></span>
                    <span className="text-slate-600"><span className="font-medium text-slate-800">{l.user?.name.split(' (')[0] ?? 'System'}</span> — {l.description} <span className="text-slate-400">· {fmtDateTime(l.created_at)}</span></span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Panel>
      </div>
      <p className="pb-2 text-center text-[11px] text-slate-400">Data as of {fmtDate(new Date())} · Created by Timestamp India</p>
    </div>
  );
}
