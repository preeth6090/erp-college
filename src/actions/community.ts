'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, notify, type ActionState } from '@/lib/action';
import { parse, str, optStr, date, oneOf, int, optInt, num, bool, email } from '@/lib/validators';

const money = () => z.preprocess((v) => (v === '' || v == null ? 0 : v), num(0));

export async function storeEvent(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'events' }, async () => {
    const d = parse(z.object({ title: str(), category: oneOf(['Cultural', 'Sports', 'Seminar', 'Workshop', 'Club', 'Annual Fest']), event_date: date(), venue: str(120), budget: money(), department_id: optInt(1), description: optStr() }), fd);
    await db.campusEvent.create({ data: d });
    return 'Campus event created.';
  });
}
export async function storeAlumnus(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'events' }, async () => {
    const d = parse(z.object({ full_name: str(), email: email(), phone: optStr(20), graduation_year: int(1980, 2035), course_id: optInt(1), current_company: optStr(255), designation: optStr(255), city: optStr(100), donation_total: money(), is_mentor: bool() }), fd);
    await db.alumnus.create({ data: d });
    return 'Alumnus registered.';
  });
}
export async function storeAccreditation(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'accreditation' }, async () => {
    const d = parse(z.object({ framework: oneOf(['NAAC', 'NIRF', 'AISHE', 'UGC', 'AICTE', 'NBA', 'IQAC']), cycle_year: str(20), criterion: str(80), metric_code: optStr(30), title: str(), score_or_value: optStr(60), department_id: optInt(1), evidence_url: optStr(255) }), fd);
    await db.accreditationRecord.create({ data: d });
    return `${d.framework} compliance record saved.`;
  });
}
export async function storeResearch(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'accreditation' }, async () => {
    const d = parse(z.object({ record_type: oneOf(['Faculty Publication', 'Student Project', 'Research Grant', 'Patent', 'Conference', 'Incubation']), title: str(), lead_name: str(), department_id: optInt(1), funding_agency: optStr(255), grant_amount: money(), publication_venue: optStr(255), patent_no: optStr(50), year: int(2000, 2035), status: oneOf(['Ongoing', 'Published', 'Granted', 'Completed']) }), fd);
    await db.researchRecord.create({ data: d });
    return 'Research & Innovation record added.';
  });
}
export async function storeAnnouncement(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'communication' }, async (user) => {
    const d = parse(z.object({ title: str(), message: str(5000), target_audience: oneOf(['All', 'Students', 'Faculty', 'Parents', 'Department']), department_id: optInt(1), channel: oneOf(['Portal', 'Email', 'SMS', 'WhatsApp', 'Push']), is_emergency: bool() }), fd);
    await db.announcement.create({ data: { ...d, published_at: new Date(), created_by: user.id } });
    if (d.channel !== 'Portal') {
      const students = await db.student.findMany({ where: { status: 'Active' }, take: 10 });
      for (const s of students) await notify({ name: s.full_name, contact: d.channel === 'Email' ? s.email : s.phone, channel: d.channel, subject: d.title, message: d.message });
    }
    return 'Announcement published & notifications dispatched.';
  });
}
