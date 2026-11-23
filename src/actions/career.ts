'use server';

import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { run, type ActionState } from '@/lib/action';
import { parse, str, optStr, date, oneOf, int, optInt, num, bool } from '@/lib/validators';
import { todayDate } from '@/lib/format';

const A = ['super_admin'] as const;
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

export async function storeDrive(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ placement_company_id: int(1), job_title: str(), package_lpa: num(1), eligibility_cgpa: num(0, 10), drive_date: date(), drive_type: oneOf(['Full-Time', 'Internship']) }), fd);
    await db.placementDrive.create({ data: d });
    return 'Placement drive scheduled.';
  });
}
export async function applyDrive(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ placement_drive_id: int(1), student_id: int(1), resume_url: optStr(255) }), fd);
    await db.placementApplication.create({ data: d });
    return 'Student nominated for placement drive.';
  });
}
export async function updatePlacementStatus(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ id: int(1), status: oneOf(['Applied', 'Shortlisted', 'Interviewed', 'Selected', 'Rejected']) }), fd);
    await db.placementApplication.update({ where: { id: d.id }, data: { status: d.status } });
    return `Placement status updated to ${d.status}.`;
  });
}

export async function applyScholarship(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ scholarship_id: int(1), student_id: int(1), remarks: optStr() }), fd);
    await db.scholarshipApplication.create({ data: d });
    return 'Scholarship application submitted.';
  });
}
export async function updateScholarshipStatus(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ id: int(1), status: oneOf(['Applied', 'Verified', 'Approved', 'Disbursed', 'Rejected']) }), fd);
    const app = await db.scholarshipApplication.findUniqueOrThrow({ where: { id: d.id }, include: { scholarship: true } });
    await db.scholarshipApplication.update({
      where: { id: app.id },
      data: { status: d.status, disbursed_amount: d.status === 'Disbursed' ? app.scholarship.amount : app.disbursed_amount, disbursed_at: d.status === 'Disbursed' ? todayDate() : app.disbursed_at },
    });
    return `Scholarship application ${d.status}.`;
  });
}

export async function issueCertificate(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ student_id: int(1), certificate_type: oneOf(['Bonafide', 'Transfer', 'Migration', 'Character', 'NOC', 'Course Completion', 'Provisional', 'Degree', 'Duplicate']), remarks: optStr() }), fd);
    const cert = await db.certificate.create({
      data: { ...d, certificate_no: `CERT-${d.certificate_type.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${rand(100, 999)}`, issue_date: todayDate(), status: 'Issued', verification_token: randomBytes(16).toString('hex') },
    });
    return `Digital certificate ${cert.certificate_no} issued with QR verification.`;
  });
}

export async function storeGrievance(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ student_id: optInt(1), category: oneOf(['Academic', 'Anti-Ragging', 'Harassment', 'Hostel', 'Fee', 'General']), subject: str(), description: str(5000), is_confidential: bool() }), fd);
    const ticket_no = `GRV-${new Date().getFullYear()}-${rand(100, 999)}`;
    await db.grievance.create({ data: { ...d, ticket_no } });
    return `Grievance ${ticket_no} logged.`;
  });
}
export async function resolveGrievance(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ id: int(1), status: oneOf(['Under Review', 'Resolved', 'Closed']), resolution_notes: optStr() }), fd);
    const { id, ...data } = d;
    await db.grievance.update({ where: { id }, data });
    return 'Grievance ticket updated.';
  });
}
export async function storeDisciplinary(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run([...A], async () => {
    const d = parse(z.object({ student_id: int(1), incident_date: date(), description: str(5000), action_taken: str(255), counselling_notes: optStr() }), fd);
    await db.disciplinaryRecord.create({ data: d });
    return 'Disciplinary & counselling record logged.';
  });
}
