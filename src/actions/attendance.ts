'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, notify, type ActionState } from '@/lib/action';
import { parse, str, optStr, date, oneOf, int, optInt } from '@/lib/validators';

export async function markStudentAttendance(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin', 'faculty'], async (user) => {
    const d = parse(z.object({ attendance_date: date(), subject_id: optInt(1), class_section_id: optInt(1), method: oneOf(['Manual', 'QR', 'Biometric', 'RFID']) }), fd);
    const rows: [number, string][] = [];
    for (const [k, v] of fd.entries()) {
      const m = /^statuses\[(\d+)\]$/.exec(k);
      if (m && typeof v === 'string') rows.push([Number(m[1]), v]);
    }
    for (const [studentId, status] of rows) {
      const where = { student_id: studentId, subject_id: d.subject_id ?? null, attendance_date: d.attendance_date };
      const existing = await db.studentAttendance.findFirst({ where });
      const data = { class_section_id: d.class_section_id, status, method: d.method, marked_by: user.id };
      if (existing) await db.studentAttendance.update({ where: { id: existing.id }, data });
      else await db.studentAttendance.create({ data: { ...where, ...data } });
    }
    return `Student attendance recorded via ${d.method}.`;
  });
}

export async function markEmployeeAttendance(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin', 'faculty'], async () => {
    const d = parse(
      z.object({ employee_id: int(1), attendance_date: date(), check_in: optStr(8), check_out: optStr(8), status: oneOf(['Present', 'Absent', 'Late', 'Half Day', 'On Leave']), method: oneOf(['Manual', 'Biometric', 'RFID']) }),
      fd,
    );
    const hms = (t?: string) => (t && t.length === 5 ? `${t}:00` : t);
    const data = { ...d, check_in: hms(d.check_in), check_out: hms(d.check_out) };
    const existing = await db.employeeAttendance.findFirst({ where: { employee_id: d.employee_id, attendance_date: d.attendance_date } });
    if (existing) await db.employeeAttendance.update({ where: { id: existing.id }, data });
    else await db.employeeAttendance.create({ data });
    return 'Faculty/Staff attendance logged.';
  });
}

export async function sendShortageAlerts(_p: ActionState, _fd: FormData): Promise<ActionState> {
  return run(['super_admin', 'faculty'], async () => {
    const students = await db.student.findMany({ where: { status: 'Active' }, include: { studentAttendances: true, studentGuardians: true } });
    let count = 0;
    for (const s of students) {
      const total = s.studentAttendances.length;
      const present = s.studentAttendances.filter((a) => ['Present', 'Late'].includes(a.status)).length;
      const pct = total ? Math.round((present / total) * 1000) / 10 : 100;
      if (pct < 75) {
        const g = s.studentGuardians[0];
        await notify({
          name: g?.name ?? s.full_name, contact: g?.phone ?? s.phone, channel: 'SMS', subject: 'Attendance Shortage Alert (<75%)',
          message: `Alert: ${s.full_name} (${s.unique_student_id}) has ${pct}% attendance. Minimum 75% required for End-Sem Exams.`,
        });
        count++;
      }
    }
    return `Attendance shortage alerts sent to ${count} students/parents.`;
  });
}

export async function updateCorrection(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin', 'faculty'], async () => {
    const d = parse(z.object({ id: int(1), status: oneOf(['Approved', 'Rejected']) }), fd);
    await db.attendanceCorrection.update({ where: { id: d.id }, data: { status: d.status } });
    return `Correction request ${d.status}.`;
  });
}
