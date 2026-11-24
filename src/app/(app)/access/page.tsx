import Link from 'next/link';
import { db } from '@/lib/db';
import { can, homeFor, requireModule } from '@/lib/auth';
import { getPolicy, describePolicy } from '@/lib/policy';
import { ActionForm, SubmitButton } from '@/components/forms';
import { PermMatrix } from '@/components/PermMatrix';
import { Badge, Card, Checkbox, Input, PageHeader, Select, Table, Td, Textarea, Tabs } from '@/components/ui';
import { createRole, deleteRole, saveLoginPolicy, updateRoleInfo } from '@/actions/access';
import { MODULES } from '@/lib/modules';
import { fmtDateTime } from '@/lib/format';

export const metadata = { title: 'Roles & Login Policy' };
export const dynamic = 'force-dynamic';

const TABS = [['roles', 'Roles & permissions'], ['scenarios', 'Login scenarios'], ['policy', 'Login policy'], ['activity', 'Sign-in activity']] as const;

export default async function Access({ searchParams }: { searchParams: Promise<{ tab?: string; role?: string }> }) {
  const me = await requireModule('access');
  const editable = can(me, 'access', 'edit');
  const sp = await searchParams;
  const tab = (TABS.find((t) => t[0] === sp.tab)?.[0] ?? 'roles') as (typeof TABS)[number][0];
  const roles = await db.role.findMany({ include: { _count: { select: { users: true } }, rolePermissions: { include: { permission: true } } }, orderBy: { id: 'asc' } });
  const policy = await getPolicy();

  return (
    <div className="space-y-4">
      <PageHeader title="Roles & Login Policy" subtitle="Decide who can open what, and how people are allowed to sign in" actions={<Link href="/team" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">+ Add team member</Link>} />
      <Tabs items={TABS.map(([id, label]) => ({ href: `/access?tab=${id}`, label, active: tab === id }))} />

      {tab === 'roles' && (() => {
        const sel = roles.find((r) => r.slug === sp.role) ?? roles.find((r) => r.slug !== 'super_admin') ?? roles[0];
        const isAdminRole = sel.slug === 'super_admin';
        const portalRole = ['student', 'parent'].includes(sel.slug);
        return (
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <div className="space-y-3">
              <Card title="Roles">
                <div className="-m-2 space-y-1">
                  {roles.map((r) => (
                    <Link key={r.id} href={`/access?tab=roles&role=${r.slug}`} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${r.id === sel.id ? 'bg-indigo-50 font-semibold text-indigo-700' : 'hover:bg-slate-50'}`}>
                      <span className="truncate">{r.name}</span><span className="ml-2 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{r._count.users}</span>
                    </Link>
                  ))}
                </div>
              </Card>
              {editable && (
                <Card title="New role">
                  <ActionForm action={createRole}>
                    <Input label="Role name *" name="name" required placeholder="e.g. Front Office" />
                    <Input label="What is it for?" name="description" />
                    <Select label="Start from" name="copy_from" placeholder="Empty (no access)" options={roles.filter((r) => r.slug !== 'super_admin').map((r) => ({ value: r.id, label: `Copy of ${r.name}` }))} />
                    <SubmitButton>Create role</SubmitButton>
                  </ActionForm>
                </Card>
              )}
            </div>
            <div className="space-y-4">
              <Card title={sel.name} actions={<Badge tone={sel.is_system ? 'slate' : 'indigo'}>{sel.is_system ? 'Built-in' : 'Custom'}</Badge>}>
                <p className="mb-3 text-sm text-slate-600">{sel.description || 'No description.'} <span className="text-slate-400">• {sel._count.users} member{sel._count.users === 1 ? '' : 's'}</span></p>
                {portalRole && <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">This role signs in to a self-service portal that only ever shows the person&apos;s own records. Module access below is for any extra staff-style screens.</div>}
                <PermMatrix key={sel.id} roleId={sel.id} roleName={sel.name} initial={sel.rolePermissions.map((p) => p.permission.slug)} locked={isAdminRole || !editable}
                  lockedNote={isAdminRole ? 'Super Administrators always have full access to every module. This cannot be changed.' : 'You can view this role but not change it.'} />
              </Card>
              {editable && !isAdminRole && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Rename / describe">
                    <ActionForm action={updateRoleInfo} hidden={{ role_id: sel.id }} reset={false}>
                      <Input label="Name" name="name" defaultValue={sel.name} required />
                      <Textarea label="Description" name="description" defaultValue={sel.description ?? ''} />
                      <SubmitButton tone="slate">Save</SubmitButton>
                    </ActionForm>
                  </Card>
                  <Card title="Delete role">
                    {sel.is_system ? <p className="text-sm text-slate-500">Built-in roles can&apos;t be deleted.</p> : sel._count.users > 0 ? <p className="text-sm text-slate-500">Move the {sel._count.users} member(s) with this role to another role first (Team page).</p> : (
                      <ActionForm action={deleteRole} hidden={{ role_id: sel.id }} reset={false}><p className="mb-2 text-sm text-slate-600">No one uses this role, so it can be removed.</p><SubmitButton tone="rose">Delete role</SubmitButton></ActionForm>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {tab === 'scenarios' && (
        <>
          <p className="text-sm text-slate-600">What each kind of person sees when they sign in — built from the permissions above, so it always matches reality.</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {await Promise.all(roles.map(async (r) => {
              const perms = new Set(r.rolePermissions.map((p) => p.permission.slug));
              const home = homeFor({ role: { slug: r.slug }, perms });
              const edit = MODULES.filter((m) => r.slug === 'super_admin' || perms.has(`${m.key}:edit`));
              const view = MODULES.filter((m) => r.slug !== 'super_admin' && perms.has(`${m.key}:view`) && !perms.has(`${m.key}:edit`));
              const sample = await db.user.findFirst({ where: { role_id: r.id }, orderBy: { id: 'asc' } });
              return (
                <Card key={r.id} title={r.name} actions={<Link href={`/access?tab=roles&role=${r.slug}`} className="text-xs font-medium text-indigo-600">Edit →</Link>}>
                  <p className="mb-3 text-xs text-slate-500">{r.description}</p>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2"><dt className="text-slate-500">Lands on</dt><dd className="font-mono text-xs">{home === '/welcome' ? 'Welcome (no modules)' : home}</dd></div>
                    <div><dt className="mb-1 text-slate-500">Can change</dt><dd className="flex flex-wrap gap-1">{r.slug === 'super_admin' ? <Badge tone="green">Everything</Badge> : edit.length ? edit.map((m) => <Badge key={m.key} tone="green">{m.label}</Badge>) : <span className="text-xs text-slate-400">—</span>}</dd></div>
                    {view.length > 0 && <div><dt className="mb-1 text-slate-500">Can only view</dt><dd className="flex flex-wrap gap-1">{view.map((m) => <Badge key={m.key} tone="blue">{m.label}</Badge>)}</dd></div>}
                    <div className="flex justify-between gap-2 border-t border-slate-100 pt-2"><dt className="text-slate-500">Members</dt><dd>{r._count.users}</dd></div>
                    {sample && <div className="flex justify-between gap-2"><dt className="text-slate-500">Example login</dt><dd className="truncate font-mono text-xs">{sample.email}</dd></div>}
                  </dl>
                </Card>
              );
            }))}
          </div>
          <Card title="How sign-in works for everyone">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>{describePolicy(policy)}</li>
              <li>{policy.max_failed_attempts > 0 ? `Accounts lock for ${policy.lockout_minutes} minutes after ${policy.max_failed_attempts} wrong passwords.` : 'Accounts never lock after wrong passwords.'}</li>
              <li>Sessions last {policy.session_hours} hours{policy.allow_remember ? `, or ${policy.remember_days} days with “Keep me signed in”` : ''}.</li>
              <li>{policy.password_expiry_days > 0 ? `Passwords expire every ${policy.password_expiry_days} days.` : 'Passwords never expire.'} {policy.force_change_on_first_login ? 'New logins must set their own password on first sign-in.' : ''}</li>
              <li>Temporary staff can be given an end date, after which they simply can&apos;t sign in.</li>
            </ul>
          </Card>
        </>
      )}

      {tab === 'policy' && (
        <Card title="Login policy" actions={!editable ? <Badge tone="slate">View only</Badge> : undefined}>
          <ActionForm action={saveLoginPolicy} reset={false} className="space-y-6">
            <fieldset disabled={!editable} className="space-y-6">
              <section>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">Passwords</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Minimum length" name="min_password_length" type="number" min={6} max={64} defaultValue={policy.min_password_length} />
                  <Input label="Expire after (days, 0 = never)" name="password_expiry_days" type="number" min={0} defaultValue={policy.password_expiry_days} />
                  <div className="flex flex-col justify-end gap-2 pb-2"><Checkbox label="Require upper, lower, number & symbol" name="require_complexity" defaultChecked={policy.require_complexity} /><Checkbox label="New logins must change password at first sign-in" name="force_change_on_first_login" defaultChecked={policy.force_change_on_first_login} /></div>
                </div>
              </section>
              <section>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">Lockout</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Lock after wrong attempts (0 = never)" name="max_failed_attempts" type="number" min={0} max={20} defaultValue={policy.max_failed_attempts} />
                  <Input label="Locked for (minutes)" name="lockout_minutes" type="number" min={1} defaultValue={policy.lockout_minutes} />
                </div>
              </section>
              <section>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">Sessions & invites</h4>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Input label="Session length (hours)" name="session_hours" type="number" min={1} max={168} step="0.5" defaultValue={policy.session_hours} />
                  <Input label="“Keep me signed in” (days)" name="remember_days" type="number" min={1} max={365} defaultValue={policy.remember_days} />
                  <Input label="Invite links valid (days)" name="invite_valid_days" type="number" min={1} max={60} defaultValue={policy.invite_valid_days} />
                  <div className="flex items-end pb-2"><Checkbox label="Offer “Keep me signed in”" name="allow_remember" defaultChecked={policy.allow_remember} /></div>
                </div>
              </section>
            </fieldset>
            {editable && <SubmitButton>Save policy</SubmitButton>}
          </ActionForm>
        </Card>
      )}

      {tab === 'activity' && await (async () => {
        const [logs, locked] = await Promise.all([
          db.auditLog.findMany({ where: { OR: [{ module: 'Auth' }, { module: 'Team' }, { module: 'Access' }] }, include: { user: true }, orderBy: { created_at: 'desc' }, take: 100 }),
          db.user.findMany({ where: { locked_until: { gt: new Date() } } }),
        ]);
        const tone = (a: string) => (/FAILED|BLOCKED|LOCKED|REVOKED|DELETED/.test(a) ? 'red' : /LOGIN$|ACCEPTED|ADDED|CREATED|UNLOCKED/.test(a) ? 'green' : 'slate') as 'red' | 'green' | 'slate';
        return (
          <>
            {locked.length > 0 && <Card title="Locked right now"><div className="flex flex-wrap gap-2">{locked.map((u) => <Badge key={u.id} tone="red">{u.email} — until {fmtDateTime(u.locked_until)}</Badge>)}</div><p className="mt-2 text-xs text-slate-500">Unlock from the Team page.</p></Card>}
            <Card title="Recent sign-in & access activity">
              <Table head={['When', 'Who', 'Event', 'Details', 'IP']}>
                {logs.map((l) => <tr key={l.id}><Td className="whitespace-nowrap text-xs">{fmtDateTime(l.created_at)}</Td><Td className="text-xs">{l.user?.name.replace(/\(.*\)/, '') ?? '—'}</Td><Td><Badge tone={tone(l.action)}>{l.action.replace(/_/g, ' ')}</Badge></Td><Td className="text-xs">{l.description}</Td><Td className="font-mono text-[11px] text-slate-400">{l.ip_address}</Td></tr>)}
              </Table>
            </Card>
          </>
        );
      })()}
    </div>
  );
}
