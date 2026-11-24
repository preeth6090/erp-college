'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, date, optDate, oneOf, int, optInt, num } from '@/lib/validators';

const hms = (t: string) => (t.length === 5 ? `${t}:00` : t);

function gradeFor(total: number): [string, number, string] {
  if (total >= 90) return ['O', 10, 'Pass'];
  if (total >= 80) return ['A+', 9, 'Pass'];
  if (total >= 70) return ['A', 8, 'Pass'];
  if (total >= 60) return ['B+', 7, 'Pass'];
  if (total >= 50) return ['B', 6, 'Pass'];
  if (total >= 40) return ['C', 5, 'Pass'];
  return ['F', 0, 'Backlog'];
}

export async function storeExam(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'exams' }, async () => {
    const d = parse(
      z.object({ name: str(), exam_type: oneOf(['Internal', 'Mid-Semester', 'End-Semester', 'Practical', 'Supplementary', 'Backlog']), academic_session_id: int(1), course_id: int(1), semester: int(1, 12), start_date: date(), end_date: date() }),
      fd,
    );
    if (d.end_date < d.start_date) throw new UserError('End date must be on or after the start date.');
    await db.exam.create({ data: d });
    return 'Examination created.';
  });
}

export async function storeSchedule(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'exams' }, async () => {
    const d = parse(
      z.object({ exam_id: int(1), subject_id: int(1), exam_date: date(), start_time: str(8), end_time: str(8), room_no: str(30), invigilator_id: optInt(1), max_marks: int(10, 200), passing_marks: int(5, 100), question_paper_code: optStr(40) }),
      fd,
    );
    d.start_time = hms(d.start_time);
    d.end_time = hms(d.end_time);
    if (d.end_time <= d.start_time) throw new UserError('End time must be after start time.');
    await db.examSchedule.create({ data: d });
    return 'Exam schedule & invigilator assigned.';
  });
}

export async function storeMark(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'exams' }, async () => {
    const d = parse(z.object({ exam_id: int(1), subject_id: int(1), student_id: int(1), internal_marks: num(0, 50), external_marks: num(0, 100) }), fd);
    const subject = await db.subject.findUniqueOrThrow({ where: { id: d.subject_id } });
    const total = d.internal_marks + d.external_marks;
    const [grade, gp, status] = gradeFor(total);
    const data = { internal_marks: d.internal_marks, external_marks: d.external_marks, total_marks: total, grade, grade_point: gp, credits: subject.credits, result_status: status, is_verified: true };
    await db.examMark.upsert({
      where: { exam_id_subject_id_student_id: { exam_id: d.exam_id, subject_id: d.subject_id, student_id: d.student_id } },
      update: data,
      create: { exam_id: d.exam_id, subject_id: d.subject_id, student_id: d.student_id, ...data },
    });
    return `Marks saved! Auto-calculated Grade: ${grade} (${gp} GP).`;
  });
}

export async function togglePublish(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'exams' }, async () => {
    const d = parse(z.object({ id: int(1) }), fd);
    const e = await db.exam.findUniqueOrThrow({ where: { id: d.id } });
    await db.exam.update({ where: { id: e.id }, data: { is_published: !e.is_published } });
    return 'Result publication status updated.';
  });
}
