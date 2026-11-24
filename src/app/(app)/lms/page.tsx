import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Textarea, inputCls } from '@/components/ui';
import { gradeSubmission, storeAssignment, storeDiscussion, storeMaterial } from '@/actions/facilities';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'Learning Management System' };
export const dynamic = 'force-dynamic';

export default async function LMS() {
  await requireModule('lms');
  const [materials, assignments, discussions, subjects] = await Promise.all([
    db.lmsMaterial.findMany({ include: { subject: true }, orderBy: { created_at: 'desc' } }),
    db.lmsAssignment.findMany({ include: { subject: true, lmsSubmissions: { include: { student: true } } }, orderBy: { created_at: 'desc' } }),
    db.lmsDiscussion.findMany({ include: { subject: true, user: true }, orderBy: { created_at: 'desc' } }),
    db.subject.findMany(),
  ]);
  const subj = subjects.map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
  return (
    <div className="space-y-4">
      <PageHeader title="LMS, Study Material, Assignments & Discussion" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Upload Study Material / Video Lecture">
          <ActionForm action={storeMaterial}>
            <Select label="Subject" name="subject_id" options={subj} />
            <Select label="Type" name="material_type" options={['PDF', 'Document', 'Video Lecture', 'Recorded Class', 'Quiz']} />
            <Input label="Material Title *" name="title" required />
            <Input label="Resource / Video URL" name="file_url" />
            <SubmitButton>Publish Material</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Create Online Assignment">
          <ActionForm action={storeAssignment}>
            <Select label="Subject" name="subject_id" options={subj} />
            <Input label="Assignment Title *" name="title" required />
            <FormGrid cols={2}><Input label="Due Date" name="due_date" type="date" required /><Input label="Max Marks" name="max_marks" type="number" defaultValue={20} /></FormGrid>
            <Textarea label="Instructions" name="description" />
            <SubmitButton>Assign to Class</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Post to Discussion Forum">
          <ActionForm action={storeDiscussion}>
            <Select label="Subject" name="subject_id" options={subj} />
            <Input label="Discussion Topic *" name="topic" required />
            <Textarea label="Message" name="message" required rows={3} />
            <SubmitButton>Post Discussion</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Study Materials & Recorded Classes">
          {materials.map((m) => (
            <div key={m.id} className="border-b border-slate-100 py-2 text-sm last:border-0">
              <div className="flex justify-between"><strong>{m.file_url ? <a href={m.file_url} target="_blank" className="text-indigo-700 underline">{m.title}</a> : m.title}</strong><Badge tone="blue">{m.material_type}</Badge></div>
              <div className="text-xs text-slate-500">{m.subject.code} • {m.description}</div>
            </div>
          ))}
        </Card>
        <Card title="Discussion Forum">
          {discussions.map((d) => (
            <div key={d.id} className="border-b border-slate-100 py-2 text-sm last:border-0">
              <div className="font-medium">{d.topic} <span className="text-xs text-slate-500">({d.subject.code})</span></div>
              <div className="text-xs">{d.message}</div><div className="text-[11px] text-slate-500">Posted by {d.user.name}</div>
            </div>
          ))}
        </Card>
      </div>
      <Card title="Assignments & Student Submissions">
        <div className="space-y-4">
          {assignments.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex justify-between text-sm"><strong>{a.title}</strong><span className="text-xs text-slate-500">Due: {fmtDate(a.due_date)}</span></div>
              <div className="mb-2 text-xs text-slate-500">{a.subject.code} • Max Marks: {a.max_marks}</div>
              {a.lmsSubmissions.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2 text-sm">
                  <div><span className="font-medium">{s.student.full_name}</span><div className="text-xs text-slate-500">{s.submission_url}</div></div>
                  <ActionForm action={gradeSubmission} hidden={{ id: s.id }} className="flex flex-wrap items-center gap-1" reset={false} inline>
                    <input type="number" step="0.5" name="marks_obtained" defaultValue={s.marks_obtained ?? ''} placeholder="Marks" required className={inputCls + ' w-24 py-1 text-xs'} />
                    <SubmitButton tone="slate">Grade</SubmitButton>
                  </ActionForm>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
