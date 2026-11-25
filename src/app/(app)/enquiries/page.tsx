import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td, Textarea, inputCls } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { getDigestConfig } from '@/lib/digest';
import { saveDigest, sendTestDigest } from '@/actions/digest';
import { addFollowup, bulkNotifyEnquiries, storeEnquiry } from '@/actions/admissions';

export const metadata = { title: 'Enquiry & Admission CRM' };
export const dynamic = 'force-dynamic';

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ source?: string; status?: string }> }) {
  await requireModule('enquiries');
  const { source, status } = await searchParams;
  const digest = await getDigestConfig();
  const [enquiries, courses, counsellors] = await Promise.all([
    db.admissionEnquiry.findMany({ where: { ...(source ? { source } : {}), ...(status ? { status } : {}) }, include: { course: true }, orderBy: { created_at: 'desc' }, take: 500 }),
    db.course.findMany(),
    db.user.findMany({ where: { role: { slug: { in: ['super_admin', 'faculty'] } } } }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Enquiry & Admission CRM" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Register Student Enquiry (Walk-in / Phone / Online)" className="lg:col-span-2">
          <ActionForm action={storeEnquiry}>
            <FormGrid>
              <Input label="Student Name *" name="student_name" required />
              <Input label="Mobile Number *" name="phone" required />
              <Input label="Email" name="email" type="email" />
              <Select label="Source" name="source" options={['Walk-in', 'Telephone', 'Online', 'Campaign', 'Referral', 'Website']} />
              <Select label="Course Interest" name="course_id" placeholder="Course Interest" options={courses.map((c) => ({ value: c.id, label: c.code }))} />
              <Select label="Counsellor" name="counsellor_id" placeholder="Assign Counsellor" options={counsellors.map((u) => ({ value: u.id, label: u.name }))} />
              <Input label="Campaign Name" name="campaign_name" />
              <Input label="Next Follow-up" name="next_followup_date" type="date" />
            </FormGrid>
            <SubmitButton>Add Enquiry</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Bulk Communication">
          <ActionForm action={bulkNotifyEnquiries}>
            <Select label="Channel" name="channel" options={['WhatsApp', 'SMS', 'Email']} />
            <Textarea label="Message" name="message" required placeholder="Message to all active leads..." />
            <SubmitButton tone="emerald">Send Bulk Campaign</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card title="Morning digest — one email at 7:00 AM">
        <div className="grid gap-4 lg:grid-cols-2">
          <ActionForm action={saveDigest} reset={false}>
            <p className="text-xs text-slate-500">Every morning at about 7:00 AM IST one email lists everything new since the last one (website leads first) and the follow-ups due.</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={digest.enabled} /> Send the morning digest</label>
            <Textarea label="Send to (emails, separated by commas)" name="recipients" defaultValue={digest.recipients.join(', ')} placeholder="admissions@yourcollege.in, principal@yourcollege.in" />
            <SubmitButton>Save</SubmitButton>
          </ActionForm>
          <ActionForm action={sendTestDigest} reset={false}>
            <p className="text-xs text-slate-500">{digest.last_sent ? `Last sent ${fmtDate(digest.last_sent)}.` : 'Not sent yet.'} A test sends the last 24 hours to your own email only.</p>
            <SubmitButton tone="slate">Send me a test now</SubmitButton>
          </ActionForm>
        </div>
      </Card>
      <Card title={`Enquiries (${enquiries.length})`} actions={
        <form method="GET" className="flex flex-wrap gap-2">
          <select name="source" defaultValue={source ?? ''} className={inputCls + ' w-auto py-1 text-xs'}><option value="">All sources</option>{['Website', 'Walk-in', 'Telephone', 'Online', 'Campaign', 'Referral'].map((s) => <option key={s}>{s}</option>)}</select>
          <select name="status" defaultValue={status ?? ''} className={inputCls + ' w-auto py-1 text-xs'}><option value="">Any status</option>{['New', 'Follow-up', 'Converted', 'Lost'].map((s) => <option key={s}>{s}</option>)}</select>
          <button className="rounded-lg bg-slate-800 px-3 text-xs font-semibold text-white">Filter</button>
        </form>
      }>
        <Table head={['Enquiry No', 'Lead', 'Source / Campaign', 'Course', 'Received', 'Status', 'Log Follow-up & Notes']}>
          {enquiries.map((e) => (
            <tr key={e.id}>
              <Td className="font-mono text-xs">{e.enquiry_no}</Td>
              <Td><div className="font-medium">{e.student_name}</div><div className="text-xs text-slate-500">{e.phone}</div></Td>
              <Td><Badge tone={e.source === 'Website' ? 'indigo' : 'slate'}>{e.source}</Badge>{e.campaign_name && <div className="mt-1 text-xs text-slate-500">{e.campaign_name}</div>}</Td>
              <Td>{e.course?.code ?? '-'}{e.notes && <div className="mt-1 max-w-[16rem] whitespace-pre-line text-[11px] text-slate-500">{e.notes.replace(/\[ref:[^\]]*\]/g, '').trim().slice(0, 220)}</div>}</Td>
              <Td className="whitespace-nowrap text-xs text-slate-500">{fmtDate(e.created_at)}</Td>
              <Td><Badge>{e.status}</Badge></Td>
              <Td>
                <ActionForm action={addFollowup} hidden={{ id: e.id }} className="flex flex-wrap items-center gap-1" inline>
                  <input name="notes" required placeholder="Counselling note..." className={inputCls + ' py-1 text-xs'} />
                  <select name="status" defaultValue={e.status} className={inputCls + ' w-auto py-1 text-xs'}>
                    {['New', 'Follow-up', 'Converted', 'Lost'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <SubmitButton tone="slate">Save</SubmitButton>
                </ActionForm>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
