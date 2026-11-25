import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { db } from '@/lib/db';
import { can, getUser } from '@/lib/auth';
import { MODULES, GROUPS, type ModuleKey } from '@/lib/modules';
import { ModuleIcon } from '@/components/icons';
import { addDays, todayDate } from '@/lib/format';

export const metadata = { title: 'My Home' };
export const dynamic = 'force-dynamic';

type Act = { label: string; href: string; edit?: boolean; external?: boolean };
/** The buttons people reach for most, per module. Every enabled module also gets its own tile below. */
const ACTIONS: Partial<Record<ModuleKey, Act[]>> = {
  admissions: [{ label: 'Review applications', href: '/admissions' }, { label: 'Track an application', href: '/track-application', external: true }],
  enquiries: [{ label: 'Add an enquiry', href: '/enquiries', edit: true }, { label: 'New website leads', href: '/enquiries?source=Website&status=New' }, { label: 'Morning digest settings', href: '/enquiries' }],
  students: [{ label: 'Find a student', href: '/students' }, { label: 'Add a student', href: '/students', edit: true }],
  attendance: [{ label: 'Mark today’s attendance', href: '/attendance', edit: true }, { label: 'Attendance reports', href: '/attendance' }],
  transport: [{ label: 'Where is the bus now?', href: '/transport' }, { label: 'Add a vehicle or route', href: '/transport', edit: true }],
  fees: [{ label: 'Collect a fee', href: '/fees', edit: true }, { label: 'Pending dues', href: '/fees' }],
  exams: [{ label: 'Enter marks', href: '/exams', edit: true }, { label: 'Exam schedule', href: '/exams' }],
  library: [{ label: 'Issue / return a book', href: '/library', edit: true }],
  hr: [{ label: 'Leave requests', href: '/hr' }],
  team: [{ label: 'Add a team member', href: '/team', edit: true }, { label: 'See the team', href: '/team' }],
  access: [{ label: 'Roles & login policy', href: '/access' }],
  communication: [{ label: 'Send an announcement', href: '/communication', edit: true }],
  settings: [{ label: 'Institution settings', href: '/settings' }],
};

export default async function Home() {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.must_change_password) redirect('/account/password');
  const mods = MODULES.filter((m) => m.key !== 'dashboard' && can(user, m.key));
  const showDash = can(user, 'dashboard');
  if (!mods.length && !showDash) redirect('/welcome');
  const on = (k: ModuleKey) => mods.some((m) => m.key === k);
  const today = todayDate();

  // live numbers, only for the modules this person can open
  const [pendingApps, newLeads, websiteToday, students, markedToday, vehicles, tracked, team] = await Promise.all([
    on('admissions') ? db.admissionApplication.count({ where: { status: { in: ['Submitted', 'Waiting List'] } } }) : null,
    on('enquiries') ? db.admissionEnquiry.count({ where: { status: 'New' } }) : null,
    on('enquiries') ? db.admissionEnquiry.count({ where: { source: 'Website', created_at: { gte: addDays(today, -1) } } }) : null,
    on('students') ? db.student.count({ where: { status: 'Active' } }) : null,
    on('attendance') ? db.studentAttendance.count({ where: { attendance_date: { gte: today, lt: addDays(today, 1) } } }) : null,
    on('transport') ? db.transportVehicle.count() : null,
    on('transport') ? db.transportVehicle.count({ where: { tracking_url: { not: null } } }) : null,
    on('team') ? db.user.count({ where: { status: 'Active', role: { slug: { notIn: ['owner', 'student', 'parent'] } } } }) : null,
  ]);
  const stats: { label: string; value: number; href: string; hint?: string }[] = [];
  if (pendingApps !== null) stats.push({ label: 'Applications to review', value: pendingApps, href: '/admissions' });
  if (newLeads !== null) stats.push({ label: 'New enquiries', value: newLeads, href: '/enquiries?status=New', hint: websiteToday ? `${websiteToday} from the website in the last day` : undefined });
  if (students !== null) stats.push({ label: 'Active students', value: students, href: '/students' });
  if (markedToday !== null) stats.push({ label: 'Attendance marked today', value: markedToday, href: '/attendance' });
  if (vehicles !== null) stats.push({ label: 'Vehicles', value: vehicles, href: '/transport', hint: `${tracked} with live tracking` });
  if (team !== null) stats.push({ label: 'Team members', value: team, href: '/team' });

  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(new Date()));
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = user.name.replace(/\(.*\)/, '').trim().split(/\s+/)[0];
  const actions = mods.flatMap((m) => (ACTIONS[m.key] ?? []).filter((a) => !a.edit || can(user, m.key, 'edit')).map((a) => ({ ...a, module: m.key })));
  const primary = actions.filter((a, i) => actions.findIndex((b) => b.label === a.label) === i);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#0f2a5c] to-[#274a98] p-5 text-white shadow-sm sm:p-6">
        <div className="text-xs font-medium text-white/70">{new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</div>
        <h2 className="mt-1 text-xl font-bold sm:text-2xl">{hello}, {first}</h2>
        <p className="mt-1 text-sm text-white/75">{user.institution ? `${user.institution} · ` : ''}{user.role?.name ?? 'Team member'}</p>
        {showDash && <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25">Open full analytics dashboard</Link>}
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs font-medium text-slate-600">{s.label}</div>
              {s.hint && <div className="mt-1 text-[11px] text-slate-400">{s.hint}</div>}
            </Link>
          ))}
        </div>
      )}

      {primary.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Quick actions</h3>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {primary.map((a) => (
              <Link key={a.label} href={a.href} {...(a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition hover:border-indigo-300 hover:shadow-md">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"><ModuleIcon name={a.module} className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0 flex-1 truncate">{a.label}</span>
                {a.external && <ExternalLink className="h-3.5 w-3.5 text-slate-400" />}
              </Link>
            ))}
            {can(user, 'admissions', 'edit') && (
              <Link href={user.applyUrl || '/apply'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 transition hover:bg-amber-100">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200"><ModuleIcon name="admissions" className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0 flex-1 truncate">Open the admission form</span><ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Your modules</h3>
        <div className="space-y-4">
          {GROUPS.map((g) => {
            const list = mods.filter((m) => m.group === g);
            if (!list.length) return null;
            return (
              <div key={g}>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((m) => (
                    <Link key={m.key} href={m.href} className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-700"><ModuleIcon name={m.key} className="h-[18px] w-[18px]" /></span>
                      <span className="min-w-0 leading-tight">{m.label}{!can(user, m.key, 'edit') && <span className="block text-[10px] font-normal text-slate-400">View only</span>}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
