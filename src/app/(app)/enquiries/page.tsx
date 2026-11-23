import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td, Textarea, inputCls } from '@/components/ui';
import { addFollowup, bulkNotifyEnquiries, storeEnquiry } from '@/actions/admissions';

export const metadata = { title: 'Enquiry & Admission CRM' };
export const dynamic = 'force-dynamic';

export default async function Enquiries() {
  await requireRole('super_admin');
  const [enquiries, courses, counsellors] = await Promise.all([
    db.admissionEnquiry.findMany({ include: { course: true }, orderBy: { created_at: 'desc' } }),
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
              <Select label="Source" name="source" options={['Walk-in', 'Telephone', 'Online', 'Campaign', 'Referral']} />
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
      <Card>
        <Table head={['Enquiry No', 'Lead', 'Source / Campaign', 'Course', 'Status', 'Log Follow-up & Notes']}>
          {enquiries.map((e) => (
            <tr key={e.id}>
              <Td className="font-mono text-xs">{e.enquiry_no}</Td>
              <Td><div className="font-medium">{e.student_name}</div><div className="text-xs text-slate-500">{e.phone}</div></Td>
              <Td>{e.source} {e.campaign_name ? `(${e.campaign_name})` : ''}</Td>
              <Td>{e.course?.code ?? '-'}</Td>
              <Td><Badge>{e.status}</Badge></Td>
              <Td>
                <ActionForm action={addFollowup} hidden={{ id: e.id }} className="flex gap-1" inline>
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
