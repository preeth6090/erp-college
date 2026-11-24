import { db } from '@/lib/db';
import { getUser, isAdmin } from '@/lib/auth';

const esc = (v: unknown) => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const user = await getUser();
  if (!user || !isAdmin(user)) return new Response('Forbidden', { status: 403 });
  const students = await db.student.findMany({ include: { course: true, department: true }, orderBy: { id: 'asc' } });
  const rows = [['Student ID', 'Admission No', 'Full Name', 'Email', 'Phone', 'Course', 'Department', 'Semester', 'Category', 'Status']];
  for (const s of students) rows.push([s.unique_student_id, s.admission_number, s.full_name, s.email, s.phone, s.course.code, s.department.code, String(s.current_semester), s.category, s.status]);
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return new Response(rows.map((r) => r.map(esc).join(',')).join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="students_export_${stamp}.csv"` },
  });
}
