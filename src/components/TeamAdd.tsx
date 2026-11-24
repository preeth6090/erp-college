'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Checkbox, Field, FormGrid, Input, Select, Textarea, inputCls } from '@/components/ui';
import { addMember, bulkImport, createFromRecord, createInvite } from '@/actions/team';

type RoleOpt = { id: number; name: string; slug: string };
type Person = { id: number; name: string; email: string | null; sub: string };

const TABS = [
  { id: 'quick', icon: '⚡', title: 'Quick add', hint: 'Create a login now' },
  { id: 'invite', icon: '✉️', title: 'Invite link', hint: 'They set their own password' },
  { id: 'bulk', icon: '📄', title: 'Bulk import', hint: 'Paste or upload a CSV' },
  { id: 'existing', icon: '🔗', title: 'From existing records', hint: 'Staff, students, guardians' },
] as const;

const SAMPLE = `name, email, phone, role
Anita Rao, anita@college.edu.in, 9800000001, registrar
Sunil Kumar, sunil@college.edu.in, 9800000002, Librarian
Priya Nair, priya@college.edu.in, , accountant`;

export function TeamAdd({ roles, colleges, employees, students, guardians, inviteDays, forceChange }: {
  roles: RoleOpt[]; colleges: { id: number; name: string }[]; employees: Person[]; students: Person[]; guardians: Person[]; inviteDays: number; forceChange: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('quick');
  const [manual, setManual] = useState(false);
  const [csv, setCsv] = useState('');
  const [kind, setKind] = useState<'employee' | 'student' | 'guardian'>('employee');
  const [q, setQ] = useState('');
  // College Administrator goes last and nothing is pre-selected, so an admin can't be created by accident
  const ordered = [...roles].sort((a, b) => Number(a.slug === 'super_admin') - Number(b.slug === 'super_admin'));
  const roleOpts = ordered.map((r) => ({ value: r.id, label: r.name }));
  const collegeOpts = colleges.map((c) => ({ value: c.id, label: c.name }));
  const staffRoles = ordered.filter((r) => !['student', 'parent'].includes(r.slug)).map((r) => ({ value: r.id, label: r.name }));
  const list = (kind === 'employee' ? employees : kind === 'student' ? students : guardians).filter((p) => `${p.name} ${p.email ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div role="tablist" className="grid grid-cols-2 gap-px overflow-hidden rounded-t-2xl bg-slate-200 lg:grid-cols-4">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex items-center gap-2.5 px-4 py-3 text-left transition ${tab === t.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            <span className="text-lg">{t.icon}</span>
            <span><span className="block text-sm font-semibold">{t.title}</span><span className={`block text-[11px] ${tab === t.id ? 'text-indigo-100' : 'text-slate-500'}`}>{t.hint}</span></span>
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {tab === 'quick' && (
          <ActionForm action={addMember}>
            <p className="text-xs text-slate-500">Best when the person is with you. You choose (or generate) the password and hand it over.</p>
            <FormGrid>
              <Input label="Full name *" name="name" required />
              <Input label="Email (used to sign in) *" name="email" type="email" required />
              <Input label="Mobile" name="phone" />
              <Select label="Role *" name="role_id" placeholder="Choose a role…" options={roleOpts} required />
              <Select label="College" name="college_id" placeholder="All / not specific" options={collegeOpts} />
              <Input label="Access ends on (optional)" name="access_expires_at" type="date" />
            </FormGrid>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-700">Password</div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="radio" name="password_mode" value="auto" checked={!manual} onChange={() => setManual(false)} /> Generate a strong password</label>
                <label className="flex items-center gap-2"><input type="radio" name="password_mode" value="manual" checked={manual} onChange={() => setManual(true)} /> I'll type one</label>
              </div>
              {manual && <div className="mt-2 max-w-sm"><Input label="Password" name="password" type="text" autoComplete="off" required /></div>}
              <div className="mt-2"><Checkbox label="Ask them to change it at first sign-in" name="must_change" defaultChecked={forceChange} /></div>
            </div>
            <SubmitButton>Create login</SubmitButton>
          </ActionForm>
        )}

        {tab === 'invite' && (
          <ActionForm action={createInvite}>
            <p className="text-xs text-slate-500">Best for people who are remote or not yet known. You get a private link; they open it, choose their own password and are signed in. Share it on WhatsApp, email or SMS.</p>
            <FormGrid>
              <Select label="Role *" name="role_id" placeholder="Choose a role…" options={roleOpts} required />
              <Input label="Their email (optional — locks the link to it)" name="email" type="email" />
              <Input label="Their name (optional)" name="name" />
              <Select label="Link valid for" name="valid_days" defaultValue={inviteDays} options={[1, 3, 7, 14, 30].map((d) => ({ value: d, label: `${d} day${d > 1 ? 's' : ''}` }))} />
              <Select label="College" name="college_id" placeholder="All / not specific" options={collegeOpts} />
              <Input label="Access ends on (optional)" name="access_expires_at" type="date" />
            </FormGrid>
            <Input label="Note (only you see this)" name="note" placeholder="e.g. Visiting lecturer, Sem 3" />
            <SubmitButton>Create invite link</SubmitButton>
          </ActionForm>
        )}

        {tab === 'bulk' && (
          <ActionForm action={bulkImport} reset={false}>
            <p className="text-xs text-slate-500">Best at the start of a term or when onboarding a department. One person per line: <code>name, email, phone, role, college</code> (phone, role and college are optional). Strong passwords are generated for everyone and listed once so you can download them.</p>
            <FormGrid cols={2}>
              <Select label="Role for rows without one" name="default_role_id" placeholder="Choose a role…" options={staffRoles} required />
              <Field label="Or upload a .csv file">
                <input type="file" accept=".csv,text/csv,text/plain" className={inputCls}
                  onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
              </Field>
            </FormGrid>
            <Textarea label="People" name="csv" rows={7} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={SAMPLE} required className="font-mono" />
            <div className="flex flex-wrap items-center gap-4">
              <Checkbox label="Ask everyone to change their password at first sign-in" name="must_change" defaultChecked={forceChange} />
              <button type="button" onClick={() => setCsv(SAMPLE)} className="text-xs font-medium text-indigo-600 underline">Use example</button>
            </div>
            <SubmitButton>Import people</SubmitButton>
          </ActionForm>
        )}

        {tab === 'existing' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Best when the person is already on file (HR, SIS or guardian records) but has no login yet. We reuse their name, email and phone and link the login to the record.</p>
            <div className="flex flex-wrap items-center gap-2">
              {([['employee', `Staff (${employees.length})`], ['student', `Students (${students.length})`], ['guardian', `Guardians (${guardians.length})`]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${kind === k ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{l}</button>
              ))}
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={inputCls + ' ml-auto max-w-[14rem] py-1.5 text-xs'} />
            </div>
            {list.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">Everyone here already has a login. 🎉</p>}
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {list.map((p) => (
                <div key={`${kind}${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0"><div className="truncate text-sm font-medium">{p.name}</div><div className="truncate text-xs text-slate-500">{p.email ?? 'no email on file'} • {p.sub}</div></div>
                  {p.email ? (
                    <ActionForm action={createFromRecord} hidden={{ kind, id: p.id }} reset={false} className="flex flex-wrap items-center gap-1.5">
                      {kind === 'employee' && <select name="role_id" defaultValue="" className={inputCls + ' w-auto py-1 text-xs'} required><option value="" disabled>Role…</option>{staffRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>}
                      <SubmitButton tone="emerald">Create login</SubmitButton>
                    </ActionForm>
                  ) : <span className="text-[11px] text-amber-700">Add an email to their record first</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
