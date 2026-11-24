'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { run, audit, UserError, type ActionState } from '@/lib/action';
import { parse, str, optStr, int, optInt, num, bool } from '@/lib/validators';
import { MODULE_KEYS, permSlug } from '@/lib/modules';
import { savePolicy } from '@/lib/policy';

const G = { module: 'access' } as const;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

export async function saveRolePermissions(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ role_id: int(1) }), fd);
    const role = await db.role.findUniqueOrThrow({ where: { id: d.role_id } });
    if (role.slug === 'super_admin') throw new UserError('The College Administrator role always has full access.');
    const wanted = new Set(fd.getAll('perm').map(String));
    // edit implies view; ignore anything that isn't a real module permission
    const final = new Set<string>();
    for (const k of MODULE_KEYS) {
      if (wanted.has(permSlug(k, 'edit'))) { final.add(permSlug(k, 'view')); final.add(permSlug(k, 'edit')); }
      else if (wanted.has(permSlug(k, 'view'))) final.add(permSlug(k, 'view'));
    }
    // Only super admins may hand out the power to manage people / roles / settings.
    if (actor.role?.slug !== 'super_admin') {
      const before = new Set((await db.rolePermission.findMany({ where: { role_id: role.id }, include: { permission: true } })).map((r) => r.permission.slug));
      for (const s of ['team:edit', 'access:edit', 'settings:edit']) if (final.has(s) && !before.has(s)) throw new UserError('Only a College Administrator can grant that permission.');
    }
    const perms = await db.permission.findMany({ where: { slug: { in: [...final] } } });
    await db.$transaction([
      db.rolePermission.deleteMany({ where: { role_id: role.id } }),
      db.rolePermission.createMany({ data: perms.map((p) => ({ role_id: role.id, permission_id: p.id })) }),
    ]);
    updateTag('perms');
    await audit(actor, 'ROLE_PERMISSIONS_UPDATED', 'Access', `${role.name}: ${final.size} permissions`);
    return `Permissions saved for ${role.name}. People with this role get them within a minute.`;
  });
}

export async function createRole(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ name: str(80), description: optStr(255), copy_from: optInt(1) }), fd);
    const slug = slugify(d.name);
    if (!slug) throw new UserError('Give the role a name.');
    if (await db.role.findUnique({ where: { slug } })) throw new UserError('A role with that name already exists.');
    const role = await db.role.create({ data: { slug, name: d.name, description: d.description } });
    if (d.copy_from) {
      const src = await db.rolePermission.findMany({ where: { role_id: d.copy_from }, include: { permission: true } });
      // copying never lets a non-admin pick up people/role/settings management
      const rows = src.filter((r) => actor.role?.slug === 'super_admin' || !['team:edit', 'access:edit', 'settings:edit'].includes(r.permission.slug));
      if (rows.length) await db.rolePermission.createMany({ data: rows.map((r) => ({ role_id: role.id, permission_id: r.permission_id })) });
    }
    updateTag('perms');
    await audit(actor, 'ROLE_CREATED', 'Access', `Created role ${d.name}`);
    return `Role "${d.name}" created — now tick the modules it should access.`;
  });
}

export async function updateRoleInfo(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ role_id: int(1), name: str(80), description: optStr(255) }), fd);
    const role = await db.role.findUniqueOrThrow({ where: { id: d.role_id } });
    if (role.slug === 'super_admin') throw new UserError('The College Administrator role cannot be edited.');
    await db.role.update({ where: { id: role.id }, data: { name: d.name, description: d.description ?? null } });
    await audit(actor, 'ROLE_UPDATED', 'Access', `Renamed ${role.name} → ${d.name}`);
    return 'Role details saved.';
  });
}

export async function deleteRole(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ role_id: int(1) }), fd);
    const role = await db.role.findUniqueOrThrow({ where: { id: d.role_id }, include: { _count: { select: { users: true } } } });
    if (role.is_system) throw new UserError('Built-in roles cannot be deleted.');
    if (role._count.users > 0) throw new UserError(`${role._count.users} member(s) still have this role — move them to another role first.`);
    await db.role.delete({ where: { id: role.id } });
    updateTag('perms');
    await audit(actor, 'ROLE_DELETED', 'Access', `Deleted role ${role.name}`);
    return `Role "${role.name}" deleted.`;
  });
}

export async function saveLoginPolicy(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(
      z.object({
        min_password_length: int(6, 64), require_complexity: bool(), max_failed_attempts: int(0, 20), lockout_minutes: int(1, 1440),
        session_hours: num(1, 168), remember_days: int(1, 365), allow_remember: bool(), password_expiry_days: int(0, 730),
        force_change_on_first_login: bool(), invite_valid_days: int(1, 60),
      }),
      fd,
    );
    await savePolicy(d);
    updateTag('policy');
    await audit(actor, 'POLICY_UPDATED', 'Access', 'Login policy updated');
    return 'Login policy saved. It applies to the next sign-in.';
  });
}
