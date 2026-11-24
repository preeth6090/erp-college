import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLES, DEMO_USERS, MODULES, permSlug } from '../src/lib/modules';

/** Idempotent: creates missing permissions/roles, and grants defaults to roles that have none. Never overwrites admin edits. */
export async function syncRbac(db: PrismaClient, opts: { demoUsers?: boolean; password?: string } = {}) {
  await db.permission.deleteMany({ where: { slug: { startsWith: 'manage.' } } }); // legacy, unused
  const perms = new Map<string, number>();
  for (const m of MODULES) {
    for (const level of ['view', 'edit'] as const) {
      const slug = permSlug(m.key, level);
      const row = await db.permission.upsert({
        where: { slug }, update: { name: `${m.label} — ${level}`, module: m.key },
        create: { slug, name: `${m.label} — ${level}`, module: m.key },
      });
      perms.set(slug, row.id);
    }
  }
  for (const r of DEFAULT_ROLES) {
    let role = await db.role.findUnique({ where: { slug: r.slug }, include: { _count: { select: { rolePermissions: true } } } });
    if (!role) {
      const c = await db.role.create({ data: { slug: r.slug, name: r.name, description: r.description, is_system: r.system } });
      role = { ...c, _count: { rolePermissions: 0 } };
    } else if (r.system) {
      // built-in roles keep their official name/description; permissions are never touched here
      await db.role.update({ where: { id: role.id }, data: { is_system: true, name: r.name, description: r.description } });
    }
    if (role._count.rolePermissions === 0 && r.slug !== 'super_admin') {
      for (const [key, level] of r.grants) {
        await db.rolePermission.create({ data: { role_id: role.id, permission_id: perms.get(permSlug(key, 'view'))! } }).catch(() => {});
        if (level === 'edit') await db.rolePermission.create({ data: { role_id: role.id, permission_id: perms.get(permSlug(key, 'edit'))! } }).catch(() => {});
      }
    }
  }
  if (opts.demoUsers) {
    const hash = bcrypt.hashSync(opts.password || 'password', 10);
    const college = await db.college.findFirst();
    for (const u of DEMO_USERS) {
      if (await db.user.findUnique({ where: { email: u.email } })) continue;
      const role = await db.role.findUnique({ where: { slug: u.role } });
      await db.user.create({ data: { name: u.name, email: u.email, password: hash, role_id: role?.id, college_id: college?.id } });
    }
  }
}
