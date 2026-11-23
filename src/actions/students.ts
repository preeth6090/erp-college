'use server';

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { run, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, optDate, oneOf, int, optInt, email } from '@/lib/validators';
import { saveUpload } from '@/lib/upload';
import { todayDate } from '@/lib/format';

const pad = (n: number, w: number) => String(n).padStart(w, '0');

export async function enrollStudent(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(
      z.object({
        college_id: int(1), department_id: int(1), course_id: int(1), current_semester: int(1, 10), class_section_id: optInt(1),
        full_name: str(), email: email(), phone: str(20), dob: optDate(),
        gender: oneOf(['Male', 'Female', 'Other']), category: oneOf(['General', 'OBC', 'SC', 'ST', 'EWS']),
        blood_group: optStr(10), permanent_address: optStr(), emergency_contact_name: optStr(255), emergency_contact_phone: optStr(20),
        guardian_name: optStr(255), guardian_phone: optStr(20),
      }),
      fd,
    );
    if (await db.student.findUnique({ where: { email: d.email } })) throw new UserError('A student with this email already exists.');
    const role = await db.role.findUnique({ where: { slug: 'student' } });
    const user = (await db.user.findUnique({ where: { email: d.email } })) ?? (await db.user.create({
      data: { name: d.full_name, email: d.email, password: bcrypt.hashSync('password', 10), role_id: role?.id, college_id: d.college_id, phone: d.phone },
    }));
    const seq = (await db.student.count()) + 1;
    const y = new Date().getFullYear();
    const { guardian_name, guardian_phone, ...rest } = d;
    const student = await db.student.create({
      data: {
        ...rest, user_id: user.id,
        unique_student_id: `VV${String(y).slice(2)}ST${pad(seq, 3)}`, admission_number: `ADM-${y}-${pad(seq, 3)}`,
        registration_number: `REG-${y}-${pad(seq, 4)}`, roll_number: `R-${pad(seq, 3)}`, admission_date: todayDate(), status: 'Active',
      },
    });
    if (guardian_name) await db.studentGuardian.create({ data: { student_id: student.id, relation: 'Father', name: guardian_name, phone: guardian_phone ?? d.phone } });
    return `Student ${student.full_name} (${student.unique_student_id}) enrolled.`;
  });
}

export async function updateStudentStatus(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(z.object({ id: int(1), status: oneOf(['Active', 'Passed Out', 'Suspended', 'Withdrawn']), current_semester: optInt(1, 10), transfer_migration_notes: optStr() }), fd);
    const { id, ...data } = d;
    await db.student.update({ where: { id }, data });
    return 'Student status & academic record updated.';
  });
}

export async function uploadStudentDocument(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(z.object({ id: int(1), document_type: str(80) }), fd);
    const path = await saveUpload(fd.get('document_file'), 'students/documents', 5 * 1024 * 1024);
    if (!path) throw new UserError('Please choose a file to upload.');
    await db.studentDocument.create({ data: { student_id: d.id, document_type: d.document_type, file_path: path, is_verified: true } });
    return 'Student document uploaded and verified.';
  });
}
