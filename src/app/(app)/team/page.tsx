import { db } from '@/lib/db';
import { can, requireModule } from '@/lib/auth';
import { getPolicy } from '@/lib/policy';
import { ActionForm, SubmitButton } from '@/components/forms';
import { TeamAdd } from '@/components/TeamAdd';
import { Badge, Card, Input, PageHeader, Select, inputCls } from '@/components/ui';
import { renewInvite, resetMemberPassword, revokeInvite, unlockMember, updateMember } from '@/actions/team';
import { fmtDate, fmtDateTime, toInputDate } from '@/lib/format';

export const metadata = { title: 'Team Members' };
export const dynamic = 'force-dynamic';

const initials = (n: string) => n.replace(/\(.*\)/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default async function Team({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string }> }) {
  const me = await requireModule('team');
  const editable = can(me, 'team', 'edit');
  const { q, role, status } = await searchParams;
  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 86400000);
  const policy = await getPolicy();

  const [users, roles, colleges, invites, employees, students, guardians] = await Promise.all([
    db.user.findMany({
      where: {
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}),
        ...(role ? { role: { slug: role } } : {}),
        ...(status === 'inactive' ? { status: 'Inactive' } : status === 'locked' ? { locked_until: { gt: now } } : status === 'expiring' ? { access_expires_at: { lte: soon, gt: now } } : status === 'active' ? { status: 'Active' } : {}),
      },
      include: { role: true, college: true }, orderBy: [{ role_id: 'asc' }, { name: 'asc' }], take: 300,
    }),
    db.role.findMany({ orderBy: { id: 'asc' } }),
    db.college.findMany(),
    db.invite.findMany({ where: { status: { in: ['Pending', 'Revoked'] } }, include: { role: true }, orderBy: { created_at: 'desc' }, take: 30 }),
    editable ? db.employee.findMany({ where: { user_id: null, status: 'Active' }, orderBy: { full_name: 'asc' }, take: 100 }) : [],
    editable ? db.student.findMany({ where: { user_id: null, status: 'Active' }, orderBy: { full_name: 'asc' }, take: 100 }) : [],
    editable ? db.studentGuardian.findMany({ where: { parent_user_id: null }, include: { student: true }, orderBy: { name: 'asc' }, take: 100 }) : [],
  ]);
  const [total, active, locked, expiring, pending] = await Promise.all([
    db.user.count(), db.user.count({ where: { status: 'Active' } }), db.user.count({ where: { locked_until: { gt: now } } }),
    db.user.count({ where: { access_expires_at: { lte: soon, gt: now } } }), db.invite.count({ where: { status: 'Pending', expires_at: { gt: now } } }),
  ]);
  const assignable = roles; // server re-checks privileged roles on submit

  const stat = (label: string, value: number, tone: string, href: string) => (
    <a href={href} className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-0.5 text-2xl font-bold">{value}</div>
    </a>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Team Members" subtitle="Everyone who can sign in — staff, faculty, students and guardians" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stat('Members', total, 'border-slate-200', '/team')}
        {stat('Active', active, 'border-emerald-200 text-emerald-700', '/team?status=active')}
        {stat('Pending invites', pending, 'border-indigo-200 text-indigo-700', '#invites')}
        {stat('Locked', locked, 'border-rose-200 text-rose-700', '/team?status=locked')}
        {stat('Access ending ≤14d', expiring, 'border-amber-200 text-amber-700', '/team?status=expiring')}
      </div>

      {editable ? (
        <TeamAdd
          roles={assignable.map((r) => ({ id: r.id, name: r.name, slug: r.slug }))} colleges={colleges.map((c) => ({ id: c.id, name: c.name }))}
          employees={employees.map((e) => ({ id: e.id, name: e.full_name, email: e.email, sub: `${e.designation} • ${e.staff_id}` }))}
          students={students.map((s) => ({ id: s.id, name: s.full_name, email: s.email, sub: s.unique_student_id }))}
          guardians={guardians.map((g) => ({ id: g.id, name: g.name, email: g.email, sub: `${g.relation} of ${g.student.full_name}` }))}
          inviteDays={policy.invite_valid_days} forceChange={policy.force_change_on_first_login}
        />
      ) : <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">You can view the team but not add or change members.</div>}

      <Card title={`Pending & recent invites (${invites.length})`} className="scroll-mt-20" >
        <div id="invites" />
        {invites.length === 0 ? <p className="text-sm text-slate-400">No invites yet. Use “Invite link” above to create one.</p> : (
          <div className="divide-y divide-slate-100">
            {invites.map((i) => {
              const expired = i.status === 'Pending' && i.expires_at < now;
              return (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{i.email ?? i.name ?? 'Anyone with the link'} <span className="font-normal text-slate-500">→ {i.role.name}</span></div>
                    <div className="text-xs text-slate-500">{i.status === 'Revoked' ? 'Revoked' : expired ? `Expired ${fmtDate(i.expires_at)}` : `Valid until ${fmtDate(i.expires_at)}`}{i.note ? ` • ${i.note}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={i.status === 'Revoked' ? 'slate' : expired ? 'red' : 'blue'}>{expired ? 'Expired' : i.status}</Badge>
                    {editable && (
                      <>
                        <ActionForm action={renewInvite} hidden={{ id: i.id }} reset={false}><SubmitButton tone="slate">{i.status === 'Pending' && !expired ? 'New link' : 'Re-issue'}</SubmitButton></ActionForm>
                        {i.status === 'Pending' && !expired && <ActionForm action={revokeInvite} hidden={{ id: i.id }} reset={false} inline><SubmitButton tone="rose">Revoke</SubmitButton></ActionForm>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title={`Members (${users.length})`} actions={
        <form method="GET" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Search name or email…" className={inputCls + ' w-44 py-1 text-xs'} />
          <select name="role" defaultValue={role ?? ''} className={inputCls + ' w-auto py-1 text-xs'}><option value="">All roles</option>{roles.map((r) => <option key={r.id} value={r.slug}>{r.name}</option>)}</select>
          <select name="status" defaultValue={status ?? ''} className={inputCls + ' w-auto py-1 text-xs'}><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="locked">Locked</option><option value="expiring">Access ending</option></select>
          <button className="rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white">Filter</button>
        </form>
      }>
        <div className="divide-y divide-slate-100">
          {users.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No members match.</p>}
          {users.map((u) => {
            const lockedNow = !!u.locked_until && u.locked_until > now;
            const expired = !!u.access_expires_at && u.access_expires_at < now;
            return (
              <details key={u.id} className="group py-1">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-lg px-1 py-2 hover:bg-slate-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">{initials(u.name)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{u.name}</span><span className="block truncate text-xs text-slate-500">{u.email}</span></span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="indigo">{u.role?.name ?? 'No role'}</Badge>
                    {u.status !== 'Active' ? <Badge tone="slate">Inactive</Badge> : expired ? <Badge tone="red">Access expired</Badge> : lockedNow ? <Badge tone="red">Locked</Badge> : <Badge tone="green">Active</Badge>}
                    {u.must_change_password && <Badge tone="amber">Must change password</Badge>}
                    {u.access_expires_at && !expired && <Badge tone="amber">Until {fmtDate(u.access_expires_at)}</Badge>}
                  </span>
                  <span className="hidden w-36 text-right text-[11px] text-slate-400 md:block">{u.last_login_at ? `Last seen ${fmtDateTime(u.last_login_at)}` : 'Never signed in'}</span>
                </summary>
                {editable && (
                  <div className="grid gap-4 rounded-xl bg-slate-50 p-4 lg:grid-cols-3">
                    <ActionForm action={updateMember} hidden={{ id: u.id }} reset={false} className="space-y-2 lg:col-span-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input label="Name" name="name" defaultValue={u.name} required />
                        <Input label="Mobile" name="phone" defaultValue={u.phone ?? ''} />
                        <Select label="Role" name="role_id" defaultValue={u.role_id ?? ''} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
                        <Select label="Status" name="status" defaultValue={u.status} options={['Active', 'Inactive']} />
                        <Input label="Access ends on (blank = no end)" name="access_expires_at" type="date" defaultValue={toInputDate(u.access_expires_at)} />
                      </div>
                      <SubmitButton>Save changes</SubmitButton>
                    </ActionForm>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600">Sign-in help</div>
                      <ActionForm action={resetMemberPassword} hidden={{ id: u.id }} reset={false}><SubmitButton tone="slate">Reset password</SubmitButton></ActionForm>
                      {(lockedNow || u.failed_attempts > 0) && <ActionForm action={unlockMember} hidden={{ id: u.id }} reset={false} inline><SubmitButton tone="emerald">Unlock account</SubmitButton></ActionForm>}
                      <p className="text-[11px] text-slate-500">Failed attempts: {u.failed_attempts}{lockedNow ? ` • locked until ${fmtDateTime(u.locked_until)}` : ''}<br />Added {fmtDate(u.created_at)}{u.college ? ` • ${u.college.name}` : ''}</p>
                    </div>
                  </div>
                )}
              </details>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
