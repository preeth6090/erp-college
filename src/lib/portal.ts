import 'server-only';
import { db } from './db';
import type { SessionUser } from './auth';

/**
 * Resolves the student record shown in the student portal.
 * Students only ever see their own record; super admins get a preview of the first student.
 */
export async function studentFor(user: SessionUser, requestedId?: number) {
  if (user.role?.slug === 'student') return db.student.findFirst({ where: { user_id: user.id } });
  if (requestedId) return db.student.findUnique({ where: { id: requestedId } });
  return db.student.findFirst({ orderBy: { id: 'asc' } });
}
export async function employeeFor(user: SessionUser, requestedId?: number) {
  if (user.role?.slug === 'faculty') return db.employee.findFirst({ where: { user_id: user.id } });
  if (requestedId) return db.employee.findUnique({ where: { id: requestedId } });
  return db.employee.findFirst({ where: { employee_type: 'Faculty' }, orderBy: { id: 'asc' } });
}
export const attendancePct = (rows: { status: string }[]) => {
  const total = rows.length;
  const present = rows.filter((a) => a.status === 'Present' || a.status === 'Late').length;
  return total ? Math.round((present / total) * 1000) / 10 : 100;
};
