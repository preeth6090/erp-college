import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select } from '@/components/ui';
import { storeAccreditation, storeResearch } from '@/actions/community';
import { inr0 } from '@/lib/format';

export const metadata = { title: 'Accreditation & Research' };
export const dynamic = 'force-dynamic';

export default async function AccreditationResearch() {
  await requireModule('accreditation');
  const [acc, research] = await Promise.all([
    db.accreditationRecord.findMany({ orderBy: { created_at: 'desc' } }),
    db.researchRecord.findMany({ orderBy: { created_at: 'desc' } }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Accreditation (NAAC / NIRF / AISHE) & Research Innovation" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Add NAAC / NIRF / AISHE / UGC / AICTE / NBA Record">
          <ActionForm action={storeAccreditation}>
            <FormGrid cols={2}>
              <Select label="Framework" name="framework" options={['NAAC', 'NIRF', 'AISHE', 'UGC', 'AICTE', 'NBA', 'IQAC']} />
              <Input label="Cycle Year" name="cycle_year" defaultValue="2026-27" required />
              <Input label="Criterion / Metric *" name="criterion" required />
              <Input label="Code" name="metric_code" placeholder="e.g. 1.1.1" />
              <Input label="Title / Evidence *" name="title" required />
              <Input label="Score / Value" name="score_or_value" placeholder="e.g. 3.65 / 4.00" />
            </FormGrid>
            <SubmitButton>Save Compliance</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Add Research Publication / Grant / Patent">
          <ActionForm action={storeResearch}>
            <FormGrid cols={2}>
              <Select label="Type" name="record_type" options={['Faculty Publication', 'Student Project', 'Research Grant', 'Patent', 'Conference', 'Incubation']} />
              <Select label="Status" name="status" options={['Published', 'Granted', 'Ongoing', 'Completed']} />
              <Input label="Title *" name="title" required />
              <Input label="Investigator / Author *" name="lead_name" required />
              <Input label="Funding Agency" name="funding_agency" />
              <Input label="Grant Amount (₹)" name="grant_amount" type="number" defaultValue={0} />
              <Input label="Year" name="year" type="number" defaultValue={2026} />
            </FormGrid>
            <SubmitButton>Save Research Record</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Accreditation & Statutory Compliance Repository">
          {acc.map((a) => (
            <div key={a.id} className="row border-b border-slate-100 py-3 text-sm last:border-0">
              <div>
                <Badge tone="indigo">{a.framework}</Badge>
                <div className="mt-1 font-semibold text-slate-900">{a.title}</div>
                <div className="text-xs text-slate-500">{a.criterion} ({a.cycle_year})</div>
              </div>
              {a.score_or_value && <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">{a.score_or_value}</span>}
            </div>
          ))}
        </Card>
        <Card title="Research, Grants & Patents">
          {research.map((r) => (
            <div key={r.id} className="row border-b border-slate-100 py-3 text-sm last:border-0">
              <div>
                <Badge tone="blue">{r.record_type}</Badge>
                <div className="mt-1 font-semibold text-slate-900">{r.title}</div>
                <div className="text-xs text-slate-500">Lead: {r.lead_name} • {r.funding_agency ?? r.patent_no ?? r.year}</div>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{r.grant_amount > 0 ? inr0(r.grant_amount) : r.status}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
