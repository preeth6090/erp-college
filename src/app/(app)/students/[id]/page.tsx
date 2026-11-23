import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, Field, Input, LinkButton, PageHeader, Select, Textarea, inputCls } from '@/components/ui';
import { updateStudentStatus, uploadStudentDocument } from '@/actions/students';
import { inr } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('super_admin');
  const { id } = await params;
  const s = await db.student.findUnique({
    where: { id: Number(id) },
    include: { course: true, department: true, studentGuardians: true, studentDocuments: true, studentFeeAccounts: true, certificates: true },
  });
  if (!s) notFound();
  return (
    <div className="space-y-4">
      <PageHeader title={`Student 360° Profile: ${s.full_name}`} actions={<>
        <LinkButton href={`/students/${s.id}/id-card`} target="_blank">Print ID Card</LinkButton>
        <LinkButton href={`/students/${s.id}/marksheet`} target="_blank">Print Marksheet</LinkButton>
      </>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{s.full_name}</h2>
              <p className="text-xs text-slate-500">{s.unique_student_id} • {s.registration_number}</p>
            </div>
            <Badge>{s.status}</Badge>
          </div>
          <div className="space-y-1 text-sm">
            <div><strong>Programme:</strong> {s.course.name}</div>
            <div><strong>Department:</strong> {s.department.name}</div>
            <div><strong>Semester:</strong> {s.current_semester}</div>
            <div><strong>Category:</strong> {s.category} • <strong>Blood Group:</strong> {s.blood_group ?? 'N/A'}</div>
            <div><strong>Email:</strong> {s.email}</div>
            <div><strong>Phone:</strong> {s.phone}</div>
            <div><strong>Address:</strong> {s.permanent_address}</div>
          </div>
          <ActionForm action={updateStudentStatus} hidden={{ id: s.id }} reset={false} className="mt-4 space-y-2 border-t pt-4">
            <div className="text-xs font-semibold text-slate-600">Update Status / Semester / Migration</div>
            <Select label="Status" name="status" defaultValue={s.status} options={['Active', 'Passed Out', 'Suspended', 'Withdrawn']} />
            <Input label="Semester" name="current_semester" type="number" defaultValue={s.current_semester} />
            <Textarea label="Transfer / Migration Notes" name="transfer_migration_notes" defaultValue={s.transfer_migration_notes ?? ''} />
            <SubmitButton>Save Changes</SubmitButton>
          </ActionForm>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <Card title="Guardians & Documents">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Parent / Guardian Details</div>
                {s.studentGuardians.map((g) => (
                  <div key={g.id} className="mb-2 text-sm"><div className="font-medium">{g.name} ({g.relation})</div><div className="text-xs text-slate-500">{g.phone} • {g.occupation}</div></div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Upload Document</div>
                <ActionForm action={uploadStudentDocument} hidden={{ id: s.id }} className="space-y-2">
                  <Input label="Document Type" name="document_type" required placeholder="e.g. 12th Marksheet, TC" />
                  <Field label="File"><input type="file" name="document_file" required className={inputCls} /></Field>
                  <SubmitButton tone="slate">Upload & Verify</SubmitButton>
                </ActionForm>
                <div className="mt-2 space-y-0.5 text-xs text-emerald-700">
                  {s.studentDocuments.map((d) => (
                    <div key={d.id}>✓ {d.file_path ? <a href={d.file_path} target="_blank" className="underline">{d.document_type}</a> : d.document_type} (Verified)</div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <Card title="Academic Results & Fee Accounts">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Fee Ledger</div>
                {s.studentFeeAccounts.map((f) => (
                  <div key={f.id} className="mb-2 text-sm"><div>Total: {inr(f.total_amount)} • Paid: {inr(f.paid_amount)}</div><div className="text-xs text-slate-500">Balance: {inr(f.balance_amount)} ({f.status})</div></div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Issued Certificates</div>
                {s.certificates.length === 0 && <div className="text-sm text-slate-400">No certificates issued yet.</div>}
                {s.certificates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm"><span>{c.certificate_type} ({c.certificate_no})</span><LinkButton href={`/certificates/${c.id}/print`} target="_blank">Print</LinkButton></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
