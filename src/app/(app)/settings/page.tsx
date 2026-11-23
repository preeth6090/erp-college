import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, LinkButton, PageHeader, Select, Table, Td } from '@/components/ui';
import { storeCampus, storeCollege, updateCampus, updateCollege, updateSetting } from '@/actions/settings';
import { fmtDateTime } from '@/lib/format';

export const metadata = { title: 'System Administration & RBAC' };
export const dynamic = 'force-dynamic';

export default async function Settings() {
  await requireRole('super_admin');
  const [campuses, colleges, roles, settings, auditLogs] = await Promise.all([
    db.campus.findMany(), db.college.findMany({ include: { campus: true } }), db.role.findMany(), db.systemSetting.findMany(),
    db.auditLog.findMany({ include: { user: true }, orderBy: { created_at: 'desc' }, take: 30 }),
  ]);
  const campusOpts = campuses.map((c) => ({ value: c.id, label: c.name }));
  const institution = settings.find((s) => s.key === 'institution_name')?.value ?? 'University Group';
  return (
    <div className="space-y-4">
      <PageHeader title="System Administration, RBAC, Audit & Backup" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Master Institution / University Name">
          <p className="mb-2 text-xs text-slate-500">Overall parent university or institutional group name.</p>
          <ActionForm action={updateSetting} hidden={{ group_name: 'general', key: 'institution_name' }} reset={false}>
            <Input label="Institution / Group Name" name="value" defaultValue={institution} required />
            <SubmitButton>Save Master Institution Name</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Add New College Unit">
          <ActionForm action={storeCollege}>
            <Select label="Campus" name="campus_id" options={campusOpts} />
            <FormGrid cols={2}><Input label="College Code *" name="code" required placeholder="e.g. WAIT" /><Input label="NAAC Grade" name="naac_grade" /></FormGrid>
            <Input label="College Full Name *" name="name" required />
            <Input label="University Affiliation" name="university_affiliation" />
            <SubmitButton>Create College Unit</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Database Backup & Data Export">
          <p className="mb-3 text-xs text-slate-500">Download institutional JSON database snapshot or export Student SIS records to CSV.</p>
          <div className="flex flex-col gap-2">
            <a href="/settings/backup" className="rounded-lg bg-slate-800 px-3 py-2 text-center text-xs font-medium text-white">Download Database Backup (JSON)</a>
            <a href="/settings/export-students" className="rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-medium">Export Students (CSV)</a>
          </div>
        </Card>
      </div>
      <Card title={`Configured Colleges & Institutions (${colleges.length})`}>
        <div className="grid gap-3 md:grid-cols-2">
          {colleges.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-slate-500">Code: {c.code} • Campus: {c.campus.name}</div>
              <div className="text-xs text-slate-500">{c.university_affiliation ?? 'Affiliation N/A'} • AISHE: {c.aishe_code ?? 'N/A'}</div>
              <Badge tone="indigo">NAAC {c.naac_grade ?? '-'}</Badge>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-indigo-700">✏️ Edit College</summary>
                <ActionForm action={updateCollege} hidden={{ id: c.id }} reset={false} className="mt-2 space-y-2">
                  <Input label="College Name *" name="name" defaultValue={c.name} required />
                  <Input label="College Code *" name="code" defaultValue={c.code} required />
                  <Select label="Campus *" name="campus_id" defaultValue={c.campus_id} options={campusOpts} />
                  <Input label="University Affiliation" name="university_affiliation" defaultValue={c.university_affiliation ?? ''} />
                  <Input label="NAAC Grade" name="naac_grade" defaultValue={c.naac_grade ?? ''} />
                  <SubmitButton>Save College</SubmitButton>
                </ActionForm>
              </details>
            </div>
          ))}
        </div>
        <h4 className="mb-2 mt-5 text-sm font-semibold">Campus Locations</h4>
        <div className="grid gap-3 md:grid-cols-2">
          {campuses.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <strong>{c.name}</strong> ({c.code})<div className="text-xs text-slate-500">{c.city}, {c.state}</div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-indigo-700">Edit Campus</summary>
                <ActionForm action={updateCampus} hidden={{ id: c.id }} reset={false} className="mt-2 space-y-2">
                  <Input label="Campus Name" name="name" defaultValue={c.name} required />
                  <FormGrid cols={2}><Input label="Code" name="code" defaultValue={c.code} required /><Input label="City" name="city" defaultValue={c.city} required /></FormGrid>
                  <Input label="State" name="state" defaultValue={c.state} required />
                  <SubmitButton>Save Campus</SubmitButton>
                </ActionForm>
              </details>
            </div>
          ))}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-indigo-700">+ Add Campus</summary>
          <ActionForm action={storeCampus} className="mt-2 space-y-2">
            <FormGrid cols={4}><Input label="Code *" name="code" required /><Input label="Name *" name="name" required /><Input label="City *" name="city" required /><Input label="State *" name="state" required /></FormGrid>
            <SubmitButton>Add Campus</SubmitButton>
          </ActionForm>
        </details>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Role-Based Access Control (RBAC)">
          {roles.map((r) => <div key={r.id} className="border-b border-slate-100 py-2 text-sm last:border-0"><strong>{r.name}</strong><div className="font-mono text-[11px] text-slate-500">{r.slug}</div><div className="text-xs">{r.description}</div></div>)}
        </Card>
        <Card title="System Audit Logs" className="lg:col-span-2">
          <Table head={['When', 'User', 'Action', 'Description']}>
            {auditLogs.map((l) => <tr key={l.id}><Td className="whitespace-nowrap text-xs">{fmtDateTime(l.created_at)}</Td><Td>{l.user?.name ?? 'System'}</Td><Td className="text-xs">{l.action}</Td><Td className="text-xs">{l.description}</Td></tr>)}
          </Table>
        </Card>
      </div>
      <LinkButton href="/apply" target="_blank">Public Admission Form ↗</LinkButton>
    </div>
  );
}
