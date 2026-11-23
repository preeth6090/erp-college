import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { audit } from '@/lib/action';

export async function GET() {
  const user = await getUser();
  if (user?.role?.slug !== 'super_admin') return new Response('Forbidden', { status: 403 });
  await audit(user, 'DB_BACKUP', 'Settings', 'Downloaded database snapshot JSON backup.');
  const payload = {
    exported_at: new Date().toISOString(),
    campuses: await db.campus.findMany(),
    colleges: await db.college.findMany(),
    students: await db.student.findMany(),
    settings: await db.systemSetting.findMany(),
  };
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="college_erp_backup_${stamp}.json"` },
  });
}
