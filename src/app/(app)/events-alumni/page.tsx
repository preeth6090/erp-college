import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, Checkbox, FormGrid, Input, PageHeader, Select } from '@/components/ui';
import { storeAlumnus, storeEvent } from '@/actions/community';
import { fmtDate, inr0 } from '@/lib/format';

export const metadata = { title: 'Campus Events & Alumni' };
export const dynamic = 'force-dynamic';

export default async function EventsAlumni() {
  await requireRole('super_admin');
  const [events, alumni, courses] = await Promise.all([
    db.campusEvent.findMany({ orderBy: { event_date: 'desc' } }),
    db.alumnus.findMany({ orderBy: { created_at: 'desc' } }),
    db.course.findMany(),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Campus Events, Clubs & Alumni Association" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Create Campus Event / Fest / Workshop">
          <ActionForm action={storeEvent}>
            <FormGrid cols={2}>
              <Input label="Event Title *" name="title" required />
              <Select label="Category" name="category" options={['Seminar', 'Workshop', 'Cultural', 'Sports', 'Club', 'Annual Fest']} />
              <Input label="Date" name="event_date" type="date" required />
              <Input label="Venue *" name="venue" required />
              <Input label="Budget (₹)" name="budget" type="number" defaultValue={25000} />
            </FormGrid>
            <SubmitButton>Publish Event</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Register Alumni & Mentors">
          <ActionForm action={storeAlumnus}>
            <FormGrid cols={2}>
              <Input label="Alumnus Name *" name="full_name" required />
              <Input label="Email *" name="email" type="email" required />
              <Input label="Batch Year" name="graduation_year" type="number" defaultValue={2023} />
              <Select label="Course" name="course_id" placeholder="Course" options={courses.map((c) => ({ value: c.id, label: c.code }))} />
              <Input label="Company" name="current_company" />
              <Input label="Donation (₹)" name="donation_total" type="number" defaultValue={0} />
            </FormGrid>
            <Checkbox label="Available as Mentor" name="is_mentor" />
            <SubmitButton>Add Alumnus</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Upcoming & Recent Campus Events">
          {events.map((e) => (
            <div key={e.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <div><strong>{e.title}</strong> ({e.category})<div className="text-xs text-slate-500">{e.venue} • Budget: {inr0(e.budget)}</div></div>
              <span className="text-xs text-slate-600">{fmtDate(e.event_date)}</span>
            </div>
          ))}
        </Card>
        <Card title="Alumni Directory & Mentors">
          {alumni.map((a) => (
            <div key={a.id} className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0">
              <div><strong>{a.full_name}</strong> (Batch {a.graduation_year})<div className="text-xs text-slate-500">{a.designation} @ {a.current_company}</div></div>
              <div className="text-right">{a.is_mentor && <Badge tone="indigo">Mentor</Badge>}<div className="text-xs text-slate-500">Donated: {inr0(a.donation_total)}</div></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
