'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, date, oneOf, int } from '@/lib/validators';
import { employeeFor, studentFor } from '@/lib/portal';

export async function submitAssignment(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['student'], async (user) => {
    const d = parse(z.object({ lms_assignment_id: int(1), student_id: int(1).optional(), submission_url: str(255), submission_notes: optStr() }), fd);
    const student = await studentFor(user, d.student_id); // students are always pinned to their own record
    if (!student) throw new UserError('No student profile is linked to this account.');
    await db.lmsSubmission.create({ data: { lms_assignment_id: d.lms_assignment_id, student_id: student.id, submission_url: d.submission_url, submission_notes: d.submission_notes, submitted_at: new Date() } });
    return 'Assignment submitted successfully.';
  });
}

export async function applyLeave(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['faculty'], async (user) => {
    const d = parse(z.object({ employee_id: int(1).optional(), leave_type: oneOf(['Casual', 'Medical', 'Earned', 'Maternity', 'Duty', 'LWP']), from_date: date(), to_date: date(), reason: str(5000) }), fd);
    const emp = await employeeFor(user, d.employee_id); // faculty are always pinned to their own record
    if (!emp) throw new UserError('No employee profile is linked to this account.');
    if (d.to_date < d.from_date) throw new UserError('To date must be on or after the from date.');
    const days = Math.round((d.to_date.getTime() - d.from_date.getTime()) / 86400000) + 1;
    await db.employeeLeave.create({ data: { employee_id: emp.id, leave_type: d.leave_type, from_date: d.from_date, to_date: d.to_date, reason: d.reason, days } });
    return `Leave application submitted for ${days} day(s).`;
  });
}
