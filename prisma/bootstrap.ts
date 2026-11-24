// Sets up an institution: roles & permissions, the owner and college-admin logins, the minimum structure the app needs
// (campus, college, academic year) and the licence. Creates NO demo data. Safe to re-run.
//
//   INSTITUTION_NAME="Vision PU College" INSTITUTION_TYPE=pu_college \
//   OWNER_EMAIL=owner@example.com OWNER_PASSWORD=... ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=... \
//   npm run db:bootstrap
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PRESETS } from '../src/lib/modules';
import { syncRbac } from './rbac';

const db = new PrismaClient();
const env = (k: string) => process.env[k]?.trim() || undefined;

async function user(email: string | undefined, password: string | undefined, name: string, roleSlug: string) {
  if (!email || !password) return;
  const role = await db.role.findUniqueOrThrow({ where: { slug: roleSlug } });
  const found = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (found) { console.log(`  = ${roleSlug} exists: ${email}`); return; }
  await db.user.create({ data: { name, email: email.toLowerCase(), password: bcrypt.hashSync(password, 10), role_id: role.id, must_change_password: true, password_changed_at: new Date() } });
  console.log(`  + ${roleSlug} created: ${email}`);
}
async function setting(key: string, value: string, group: string) {
  await db.systemSetting.upsert({ where: { key }, update: {}, create: { key, value, group_name: group } }); // never overwrite later edits
}

async function main() {
  await syncRbac(db);
  await user(env('OWNER_EMAIL'), env('OWNER_PASSWORD'), env('OWNER_NAME') ?? 'Software Owner', 'owner');
  await user(env('ADMIN_EMAIL'), env('ADMIN_PASSWORD'), env('ADMIN_NAME') ?? 'College Administrator', 'super_admin');

  const name = env('INSTITUTION_NAME');
  if (name) {
    const state = env('STATE') ?? 'Karnataka';
    let campus = await db.campus.findFirst();
    if (!campus) campus = await db.campus.create({ data: { code: 'MAIN', name: 'Main Campus', city: env('CITY') ?? '—', state } });
    if (!(await db.college.findFirst())) await db.college.create({ data: { campus_id: campus.id, code: env('COLLEGE_CODE') ?? 'MAIN', name } });
    // structure the app needs before anyone can enrol or admit students
    const y = Number(env('ACADEMIC_START_YEAR') ?? new Date().getFullYear());
    if (!(await db.academicYear.findFirst())) {
      const ay = await db.academicYear.create({ data: { name: `${y}-${String(y + 1).slice(2)}`, start_date: new Date(`${y}-06-01`), end_date: new Date(`${y + 1}-05-31`), is_current: true } });
      await db.academicSession.create({ data: { academic_year_id: ay.id, name: `${ay.name} Annual`, term: 'Annual', start_date: ay.start_date, end_date: ay.end_date, is_active: true } });
      await db.financialYear.create({ data: { name: `FY ${y}-${String(y + 1).slice(2)}`, start_date: new Date(`${y}-04-01`), end_date: new Date(`${y + 1}-03-31`), is_current: true } });
    }
    await setting('institution_name', name, 'general');
  }

  const type = env('INSTITUTION_TYPE');
  if (type && PRESETS[type]) {
    await setting('license.type', type, 'license');
    await setting('license.status', 'Active', 'license');
    await setting('license.modules', PRESETS[type].modules.join(','), 'license');
    if (env('LICENSE_VALID_UNTIL')) await setting('license.valid_until', env('LICENSE_VALID_UNTIL')!, 'license');
    if (env('MAX_STUDENTS')) await setting('license.max_students', env('MAX_STUDENTS')!, 'license');
    if (env('MAX_USERS')) await setting('license.max_users', env('MAX_USERS')!, 'license');
  }
  console.log('Bootstrap complete.');
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
