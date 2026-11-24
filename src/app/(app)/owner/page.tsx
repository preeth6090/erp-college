import Link from 'next/link';
import { db } from '@/lib/db';
import { requireOwner } from '@/lib/auth';
import { daysLeft, getLicense, licenseProblem, usage } from '@/lib/license';
import { MODULES, PRESETS } from '@/lib/modules';
import { ActionForm, SubmitButton } from '@/components/forms';
import { OwnerModules } from '@/components/OwnerModules';
import { Badge, Card, Input, PageHeader, Select } from '@/components/ui';
import { Progress } from '@/components/dash';
import { saveSubscription } from '@/actions/owner';
import { fmtDateTime, toInputDate } from '@/lib/format';

export const metadata = { title: 'Owner console' };
export const dynamic = 'force-dynamic';

export default async function OwnerConsole() {
  await requireOwner();
  const [license, use, admins, owners] = await Promise.all([
    getLicense(), usage(),
    db.user.findMany({ where: { role: { slug: 'super_admin' } }, orderBy: { id: 'asc' } }),
    db.user.findMany({ where: { role: { slug: 'owner' } }, orderBy: { id: 'asc' } }),
  ]);
  const problem = licenseProblem(license);
  const left = daysLeft(license);
  const enabled = license.modules ?? MODULES.map((m) => m.key);
  return (
    <div className="space-y-5">
      <PageHeader title="Owner console" subtitle={`Licence, limits and modules for ${license.institution_name || 'this institution'}`} actions={<Link href="/team" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white">Manage people →</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-xs font-medium text-slate-500">Status</div><div className="mt-1 flex items-center gap-2"><Badge tone={problem ? 'red' : 'green'}>{problem ? (license.status === 'Suspended' ? 'Suspended' : 'Expired') : 'Active'}</Badge></div><div className="mt-2 text-xs text-slate-500">{left === null ? 'No end date' : left >= 0 ? `${left} day${left === 1 ? '' : 's'} left` : `Ended ${-left} day${left === -1 ? '' : 's'} ago`}</div></Card>
        <Card><div className="text-xs font-medium text-slate-500">Students</div><div className="mt-1 text-2xl font-bold">{use.students}<span className="text-sm font-normal text-slate-400"> / {license.max_students ?? '∞'}</span></div>{license.max_students && <div className="mt-2"><Progress label="" value={use.students} max={license.max_students} right="" /></div>}</Card>
        <Card><div className="text-xs font-medium text-slate-500">Staff logins</div><div className="mt-1 text-2xl font-bold">{use.staff}<span className="text-sm font-normal text-slate-400"> / {license.max_users ?? '∞'}</span></div>{license.max_users && <div className="mt-2"><Progress label="" value={use.staff} max={license.max_users} right="" /></div>}</Card>
        <Card><div className="text-xs font-medium text-slate-500">Modules enabled</div><div className="mt-1 text-2xl font-bold">{enabled.length}<span className="text-sm font-normal text-slate-400"> / {MODULES.length}</span></div><div className="mt-2 text-xs text-slate-500">{PRESETS[license.type]?.label ?? license.type}</div></Card>
      </div>

      <Card title="Subscription & limits">
        <ActionForm action={saveSubscription} reset={false} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Institution name" name="institution_name" defaultValue={license.institution_name} />
            <Select label="Institution type" name="type" defaultValue={license.type} options={Object.entries(PRESETS).filter(([k]) => k !== 'all').map(([k, p]) => ({ value: k, label: p.label }))} />
            <Select label="Status" name="status" defaultValue={license.status} options={['Active', 'Suspended']} />
            <Input label="Access valid until (blank = no end)" name="valid_until" type="date" defaultValue={toInputDate(license.valid_until)} />
            <Input label="Max students (blank = unlimited)" name="max_students" type="number" min={1} defaultValue={license.max_students ?? ''} />
            <Input label="Max staff logins (blank = unlimited)" name="max_users" type="number" min={1} defaultValue={license.max_users ?? ''} />
            <Input label="Admission form link (blank = built-in form)" name="apply_url" type="url" defaultValue={license.apply_url} placeholder="https://www.yourcollege.in/apply" className="sm:col-span-2" />
          </div>
          <p className="text-xs text-slate-500">When validity ends, or if the status is Suspended, everyone at the institution is signed out and cannot sign in — only owner accounts can. Students and guardians do not count towards the staff-login limit.</p>
          <SubmitButton>Save subscription</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Modules this institution can use"><OwnerModules initial={enabled} /></Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`College administrators (${admins.length})`}>
          {admins.length === 0 ? <p className="text-sm text-slate-500">None yet — create one from the Team page with the “College Administrator” role.</p> : admins.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0"><div><div className="font-medium">{a.name}</div><div className="text-xs text-slate-500">{a.email}</div></div><span className="text-xs text-slate-400">{a.last_login_at ? `Last seen ${fmtDateTime(a.last_login_at)}` : 'Never signed in'}</span></div>
          ))}
        </Card>
        <Card title={`Owner accounts (${owners.length})`}>
          {owners.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0"><div><div className="font-medium">{a.name}</div><div className="text-xs text-slate-500">{a.email}</div></div><Badge tone="indigo">Owner</Badge></div>
          ))}
          <p className="mt-2 text-xs text-slate-500">Owner accounts are invisible to the college’s own administrators.</p>
        </Card>
      </div>
    </div>
  );
}
