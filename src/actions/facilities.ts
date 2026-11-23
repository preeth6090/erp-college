'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { run, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, date, oneOf, int, optInt, num } from '@/lib/validators';
import { todayDate } from '@/lib/format';

export async function allocateHostel(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(z.object({ hostel_room_id: int(1), student_id: int(1), bed_no: str(10) }), fd);
    const room = await db.hostelRoom.findUniqueOrThrow({ where: { id: d.hostel_room_id } });
    if (room.occupied_beds >= room.capacity) throw new UserError('Selected room is already full.');
    await db.$transaction([
      db.hostelAllocation.create({ data: { hostel_id: room.hostel_id, hostel_room_id: room.id, student_id: d.student_id, bed_no: d.bed_no, check_in_date: todayDate() } }),
      db.hostelRoom.update({ where: { id: room.id }, data: { occupied_beds: { increment: 1 } } }),
    ]);
    return 'Hostel bed allocated.';
  });
}

export async function storeHostelActivity(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(z.object({ hostel_id: int(1), student_id: optInt(1), activity_type: oneOf(['Visitor', 'Complaint', 'Maintenance', 'Outing Request', 'Attendance']), title: str(), details: optStr() }), fd);
    await db.hostelActivity.create({ data: d });
    return 'Hostel log/request recorded.';
  });
}

export async function allocateTransport(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin'], async () => {
    const d = parse(z.object({ transport_route_id: int(1), student_id: int(1), pickup_stop: str(100) }), fd);
    await db.transportAllocation.create({ data: { ...d, start_date: todayDate() } });
    return 'Student transport route allocated.';
  });
}

export async function storeMaterial(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin', 'faculty'], async () => {
    const d = parse(z.object({ subject_id: int(1), faculty_id: optInt(1), title: str(), material_type: oneOf(['PDF', 'Document', 'Video Lecture', 'Recorded Class', 'Quiz']), file_url: optStr(255), description: optStr() }), fd);
    await db.lmsMaterial.create({ data: d });
    return 'Study material published to LMS.';
  });
}

export async function storeAssignment(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin', 'faculty'], async () => {
    const d = parse(z.object({ subject_id: int(1), faculty_id: optInt(1), title: str(), description: optStr(), due_date: date(), max_marks: int(1, 100) }), fd);
    await db.lmsAssignment.create({ data: d });
    return 'Assignment created.';
  });
}

export async function storeDiscussion(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin', 'faculty'], async (user) => {
    const d = parse(z.object({ subject_id: int(1), topic: str(), message: str(5000) }), fd);
    await db.lmsDiscussion.create({ data: { ...d, user_id: user.id } });
    return 'Discussion post added.';
  });
}

export async function gradeSubmission(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(['super_admin', 'faculty'], async () => {
    const d = parse(z.object({ id: int(1), marks_obtained: num(0), feedback: optStr() }), fd);
    const { id, ...data } = d;
    await db.lmsSubmission.update({ where: { id }, data });
    return 'Assignment submission graded.';
  });
}
