'use server';

import { redirect } from 'next/navigation';
import { createHash } from 'node:crypto';
import { initialPasswordHash } from '@/lib/defaults';
import { z } from 'zod';
import { db } from '@/lib/db';
import { run, runPublic, notify, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, optEmail, optDate, optNum, oneOf, int, optInt, email, bool } from '@/lib/validators';
import { saveUpload } from '@/lib/upload';
import { todayDate, addDays } from '@/lib/format';

const year = () => new Date().getFullYear();
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pad = (n: number, w: number) => String(n).padStart(w, '0');

export async function submitPublicApplication(_p: ActionState, fd: FormData): Promise<ActionState> {
  let appNo = '';
  const res = await runPublic(async () => {
    const d = parse(
      z.object({
        course_id: int(1),
        academic_session_id: optInt(1),
        full_name: str(),
        email: email(),
        phone: str(20),
        dob: optDate(),
        gender: oneOf(['Male', 'Female', 'Other']),
        category: oneOf(['General', 'OBC', 'SC', 'ST', 'EWS']),
        aadhaar_number: z.preprocess((v) => (v === '' ? undefined : v), z.string().regex(/^\d{12}$/, 'must be 12 digits').optional()),
        aadhaar_consent: bool(),
        father_name: optStr(255), mother_name: optStr(255), address: optStr(),
        class_10_board: optStr(80), class_10_percentage: optNum(0, 100),
        class_12_board: optStr(80), class_12_percentage: optNum(0, 100),
        previous_qualification: optStr(255), entrance_exam_name: optStr(80), entrance_score: optNum(0, 100),
      }),
      fd,
    );
    appNo = `APP-${year()}-${rand(1000, 9999)}`;
    const c12 = d.class_12_percentage ?? 60;
    const merit = Math.round((c12 * 0.5 + (d.entrance_score ?? c12) * 0.5) * 100) / 100;
    const session = d.academic_session_id ?? (await db.academicSession.findFirst({ where: { is_active: true } }))?.id;
    if (!session) throw new UserError('No active academic session is open for admissions.');

    const app = await db.admissionApplication.create({
      data: {
        ...d,
        academic_session_id: session,
        application_no: appNo,
        merit_score: merit,
        photo_path: await saveUpload(fd.get('photo'), 'admissions/photos'),
        signature_path: await saveUpload(fd.get('signature'), 'admissions/signatures'),
        application_fee_status: 'Paid',
        payment_txn_id: 'UPI-' + createHash('md5').update(appNo).digest('hex').slice(0, 10).toUpperCase(),
        status: 'Submitted',
      },
    });
    await notify({ name: app.full_name, contact: app.phone, channel: 'WhatsApp', subject: `Application Received: ${app.application_no}`, message: `Dear ${app.full_name}, your application ${app.application_no} is submitted successfully.` });
  });
  if (res?.ok) redirect(`/track-application?application_no=${appNo}&submitted=1`);
  return res;
}

export async function generateMeritList(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const courseId = Number(fd.get('course_id')) || undefined;
    const apps = await db.admissionApplication.findMany({
      where: { status: { in: ['Submitted', 'Verified', 'Waiting List'] }, ...(courseId ? { course_id: courseId } : {}) },
      orderBy: { merit_score: 'desc' },
      include: { course: true },
    });
    let rank = 1;
    for (const a of apps) {
      const cutoff = a.course?.cutoff_percentage ?? 50;
      await db.admissionApplication.update({ where: { id: a.id }, data: { merit_rank: rank++, status: (a.merit_score ?? 0) >= cutoff ? 'Merit Listed' : 'Waiting List' } });
    }
    return 'Merit list & waiting list generated based on course cut-off percentages.';
  });
}

export async function updateApplicationStatus(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(z.object({ id: int(1), status: oneOf(['Verified', 'Merit Listed', 'Waiting List', 'Approved', 'Rejected', 'Confirmed', 'Cancelled']), remarks: optStr() }), fd);
    const app = await db.admissionApplication.findUniqueOrThrow({ where: { id: d.id }, include: { course: { include: { department: true } } } });
    let regNo = app.registration_number;

    if (d.status === 'Confirmed' && !regNo) {
      regNo = `REG-${year()}-${pad(app.id, 4)}`;
      const course = app.course;
      const studentRole = await db.role.findUnique({ where: { slug: 'student' } });
      const collegeId = course.department.college_id;
      const user = (await db.user.findUnique({ where: { email: app.email } })) ?? (await db.user.create({
        data: { name: app.full_name, email: app.email, password: initialPasswordHash(), role_id: studentRole?.id, phone: app.phone, college_id: collegeId },
      }));
      const student = (await db.student.findUnique({ where: { email: app.email } })) ?? (await db.student.create({
        data: {
          user_id: user.id, college_id: collegeId, department_id: course.department_id, course_id: course.id, current_semester: 1,
          unique_student_id: `VV${String(year()).slice(2)}${course.code.slice(0, 2).toUpperCase()}${pad(app.id, 3)}`,
          admission_number: `ADM-${year()}-${pad(app.id, 4)}`,
          registration_number: regNo, full_name: app.full_name, email: app.email, phone: app.phone, dob: app.dob, gender: app.gender, category: app.category,
          aadhaar_last4: app.aadhaar_number ? app.aadhaar_number.slice(-4) : null, permanent_address: app.address, admission_date: todayDate(), status: 'Active',
        },
      }));
      const fs = await db.feeStructure.findFirst({ where: { course_id: course.id } });
      const total = fs?.total_fee ?? 55000;
      const exists = await db.studentFeeAccount.findFirst({ where: { student_id: student.id, academic_session_id: app.academic_session_id } });
      if (!exists) {
        await db.studentFeeAccount.create({
          data: { student_id: student.id, academic_session_id: app.academic_session_id, fee_structure_id: fs?.id, total_amount: total, balance_amount: total, due_date: addDays(todayDate(), 30), status: 'Pending' },
        });
      }
    }

    await db.admissionApplication.update({
      where: { id: app.id },
      data: { status: d.status, registration_number: regNo, refund_amount: d.status === 'Cancelled' ? app.application_fee_amount : app.refund_amount, remarks: d.remarks ?? app.remarks },
    });
    await notify({ name: app.full_name, contact: app.email, channel: 'Email', subject: `Admission Status Updated: ${d.status}`, message: `Your application ${app.application_no} status is now ${d.status}.` });
    return `Application ${app.application_no} updated to ${d.status}.`;
  });
}

export async function storeEnquiry(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(
      z.object({
        student_name: str(), phone: str(20), email: optEmail(),
        source: oneOf(['Walk-in', 'Telephone', 'Online', 'Campaign', 'Referral']),
        campaign_name: optStr(100), course_id: optInt(1), counsellor_id: optInt(1), next_followup_date: optDate(), notes: optStr(),
      }),
      fd,
    );
    await db.admissionEnquiry.create({ data: { ...d, enquiry_no: `ENQ-${year()}-${rand(100, 999)}`, status: 'New' } });
    return 'Admission enquiry registered.';
  });
}

export async function addFollowup(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async (user) => {
    const d = parse(z.object({ id: int(1), notes: str(5000), outcome: optStr(60), status: oneOf(['New', 'Follow-up', 'Converted', 'Lost']), lost_reason: optStr(255), next_followup_date: optDate() }), fd);
    const enq = await db.admissionEnquiry.findUniqueOrThrow({ where: { id: d.id } });
    await db.enquiryFollowup.create({ data: { admission_enquiry_id: enq.id, user_id: user.id, followup_at: new Date(), notes: d.notes, outcome: d.outcome ?? d.status } });
    await db.admissionEnquiry.update({ where: { id: enq.id }, data: { status: d.status, lost_reason: d.lost_reason ?? enq.lost_reason, next_followup_date: d.next_followup_date ?? enq.next_followup_date } });
    return 'Follow-up logged and enquiry status updated.';
  });
}

export async function bulkNotifyEnquiries(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(z.object({ channel: oneOf(['Email', 'SMS', 'WhatsApp']), message: str(5000) }), fd);
    const list = await db.admissionEnquiry.findMany({ where: { status: { in: ['New', 'Follow-up'] } } });
    for (const e of list) {
      await notify({ name: e.student_name, contact: d.channel === 'Email' ? (e.email ?? e.phone) : e.phone, channel: d.channel, subject: 'Admission Counselling Update', message: d.message });
    }
    return `Bulk ${d.channel} sent to ${list.length} active enquiries.`;
  });
}
