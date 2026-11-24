'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, date, optDate, oneOf, int, optInt, num, bool } from '@/lib/validators';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const hms = (t: string) => (t.length === 5 ? `${t}:00` : t);

export async function storeDepartment(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'academics' }, async () => {
    const d = parse(z.object({ college_id: int(1), code: str(20), name: str(), hod_name: optStr(255) }), fd);
    await db.department.create({ data: d });
    return 'Department created.';
  });
}

export async function storeCourse(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'academics' }, async () => {
    const d = parse(
      z.object({
        department_id: int(1), code: str(20), name: str(), level: oneOf(['Undergraduate', 'Postgraduate', 'Diploma', 'Certificate']),
        duration_years: int(1, 6), total_semesters: int(1, 12), total_credits: int(10, 300), intake_capacity: int(5, 500), cutoff_percentage: num(0, 100),
        nep_2020_enabled: bool(), cbcs_enabled: bool(),
      }),
      fd,
    );
    await db.course.create({ data: d });
    return 'Course / Programme created.';
  });
}

export async function storeSubject(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'academics' }, async () => {
    const d = parse(
      z.object({
        course_id: int(1), code: str(25), name: str(), semester: int(1, 12), credits: num(1, 20),
        subject_type: oneOf(['Core', 'Elective', 'Practical', 'AECC', 'SEC', 'GE', 'Project']),
        max_internal_marks: int(0, 100), max_external_marks: int(0, 100), syllabus_summary: optStr(),
      }),
      fd,
    );
    await db.subject.create({ data: d });
    return 'Subject added to curriculum.';
  });
}

export async function storeCalendar(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'academics' }, async () => {
    const d = parse(
      z.object({ academic_session_id: int(1), title: str(), event_type: oneOf(['Academic', 'Holiday', 'Examination', 'Cultural', 'Workshop']), start_date: date(), end_date: optDate(), description: optStr() }),
      fd,
    );
    if (d.end_date && d.end_date < d.start_date) throw new UserError('End date must be on or after the start date.');
    await db.academicCalendar.create({ data: d });
    return 'Academic calendar event added.';
  });
}

export async function storeSection(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'timetable' }, async () => {
    const d = parse(z.object({ course_id: int(1), semester: int(1, 12), section_name: str(20), room_no: optStr(30), class_teacher_id: optInt(1) }), fd);
    await db.classSection.create({ data: d });
    return 'Class section created.';
  });
}

export async function storeTimetableSlot(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run({ module: 'timetable' }, async () => {
    const d = parse(
      z.object({
        class_section_id: int(1), subject_id: int(1), faculty_id: int(1), substitute_faculty_id: optInt(1),
        day_of_week: oneOf(DAYS), start_time: str(8), end_time: str(8), room_no: str(30), slot_type: oneOf(['Lecture', 'Practical', 'Lab', 'Special']),
      }),
      fd,
    );
    d.start_time = hms(d.start_time);
    d.end_time = hms(d.end_time);
    if (d.end_time <= d.start_time) throw new UserError('End time must be after start time.');
    // Conflict detection: same faculty, room or class section overlapping on the same day.
    const conflict = await db.timetableSlot.findFirst({
      where: {
        day_of_week: d.day_of_week, start_time: { lt: d.end_time }, end_time: { gt: d.start_time },
        OR: [{ faculty_id: d.faculty_id }, { room_no: d.room_no }, { class_section_id: d.class_section_id }],
      },
    });
    if (conflict) {
      throw new UserError(`Timetable conflict detected on ${d.day_of_week} (${conflict.start_time}-${conflict.end_time}) for Faculty, Room ${d.room_no}, or Class Section!`);
    }
    await db.timetableSlot.create({ data: d });
    return 'Timetable slot scheduled with zero conflicts.';
  });
}
