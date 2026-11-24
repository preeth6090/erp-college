import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, Checkbox, FormGrid, Input, PageHeader, Select, Table, Td, Textarea } from '@/components/ui';
import { storeAnnouncement } from '@/actions/community';

export const metadata = { title: 'Communication & Alerts' };
export const dynamic = 'force-dynamic';

export default async function Communication() {
  await requireModule('communication');
  const [announcements, logs] = await Promise.all([
    db.announcement.findMany({ orderBy: { created_at: 'desc' } }),
    db.notificationLog.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Communication, Notices & Multi-Channel Alerts" />
      <Card title="Broadcast Announcement / Multi-Channel Alert">
        <ActionForm action={storeAnnouncement}>
          <FormGrid>
            <Input label="Announcement Title *" name="title" required />
            <Select label="Audience" name="target_audience" options={['All', 'Students', 'Faculty', 'Parents', 'Department']} />
            <Select label="Channel" name="channel" options={['Portal', 'WhatsApp', 'SMS', 'Email', 'Push']} />
          </FormGrid>
          <Textarea label="Message" name="message" required />
          <Checkbox label="Emergency Alert" name="is_emergency" />
          <SubmitButton tone="rose">Broadcast Now</SubmitButton>
        </ActionForm>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Published Announcements">
          {announcements.map((a) => (
            <div key={a.id} className="border-b border-slate-100 py-2 text-sm last:border-0">
              <div className="flex justify-between"><span className="font-medium">{a.is_emergency && <Badge tone="red">Emergency</Badge>} {a.title}</span><span className="text-xs text-slate-500">{a.target_audience} ({a.channel})</span></div>
              <div className="text-xs text-slate-600">{a.message}</div>
            </div>
          ))}
        </Card>
        <Card title="SMS / Email / WhatsApp Dispatch Log">
          <Table head={['Recipient', 'Channel', 'Subject', 'Status']}>
            {logs.map((l) => <tr key={l.id}><Td>{l.recipient_name}<div className="text-[11px] text-slate-500">{l.recipient_contact}</div></Td><Td>{l.channel}</Td><Td>{l.subject}</Td><Td><Badge>{l.status}</Badge></Td></tr>)}
          </Table>
        </Card>
      </div>
    </div>
  );
}
