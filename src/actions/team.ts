'use server';

import { randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { run, runPublic, audit, UserError, type ActionState } from '@/lib/action';
import { createSession, homeFor, isAdmin, isOwner, permsForRole, type SessionUser } from '@/lib/auth';
import { assertStaffCapacity, getLicense } from '@/lib/license';
import { checkPassword, generatePassword, getPolicy } from '@/lib/policy';
import { parse, str, optStr, optEmail, optDate, oneOf, int, optInt, bool, email } from '@/lib/validators';

const G = { module: 'team' } as const;
const norm = (e: string) => e.trim().toLowerCase();

async function origin() {
  const h = await headers();
  return `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
}

/** Only super admins may hand out roles that can themselves manage people, roles or login policy. */
async function assertCanAssign(actor: SessionUser, roleId: number) {
  const role = await db.role.findUnique({ where: { id: roleId }, include: { rolePermissions: { include: { permission: true } } } });
  if (!role) throw new UserError('That role no longer exists.');
  if (role.slug === 'owner' && !isOwner(actor)) throw new UserError('Only the software owner can assign that role.');
  if (!isAdmin(actor)) {
    const powerful = role.slug === 'super_admin' || role.rolePermissions.some((p) => ['team:edit', 'access:edit', 'settings:edit'].includes(p.permission.slug));
    if (powerful) throw new UserError('Only a College Administrator can assign that role.');
  }
  return role;
}

async function createUserRecord(opts: { name: string; email: string; phone?: string; roleId: number; collegeId?: number; password: string; mustChange: boolean; accessExpires?: Date | null }) {
  const email = norm(opts.email);
  if (await db.user.findUnique({ where: { email } })) throw new UserError(`${email} already has a login.`);
  await assertStaffCapacity((await db.role.findUnique({ where: { id: opts.roleId }, select: { slug: true } }))?.slug);
  return db.user.create({
    data: {
      name: opts.name.trim(), email, phone: opts.phone, role_id: opts.roleId, college_id: opts.collegeId,
      password: bcrypt.hashSync(opts.password, 10), must_change_password: opts.mustChange, password_changed_at: new Date(), access_expires_at: opts.accessExpires ?? null,
    },
  });
}

function passwordFrom(fd: FormData, policy: Awaited<ReturnType<typeof getPolicy>>): { password: string; generated: boolean } {
  if (fd.get('password_mode') === 'manual') {
    const pw = String(fd.get('password') ?? '');
    const problem = checkPassword(pw, policy);
    if (problem) throw new UserError(problem);
    return { password: pw, generated: false };
  }
  return { password: generatePassword(), generated: true };
}

/** 1. Quick add — create the login right now. */
export async function addMember(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ name: str(), email: email(), phone: optStr(20), role_id: int(1), college_id: optInt(1), must_change: bool(), access_expires_at: optDate() }), fd);
    await assertCanAssign(actor, d.role_id);
    const policy = await getPolicy();
    const { password } = passwordFrom(fd, policy);
    const u = await createUserRecord({ name: d.name, email: d.email, phone: d.phone, roleId: d.role_id, collegeId: d.college_id, password, mustChange: d.must_change, accessExpires: d.access_expires_at });
    await audit(actor, 'MEMBER_ADDED', 'Team', `Added ${u.name} <${u.email}>`);
    return { message: `${u.name} can now sign in.`, data: { credentials: [{ label: 'Email', value: u.email }, { label: 'Password', value: password }] } };
  });
}

/** 2. Invite link — the person sets their own password. */
export async function createInvite(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ role_id: int(1), email: optEmail(), name: optStr(255), college_id: optInt(1), note: optStr(500), access_expires_at: optDate(), valid_days: optInt(1, 60) }), fd);
    await assertCanAssign(actor, d.role_id);
    const policy = await getPolicy();
    if (d.email && (await db.user.findUnique({ where: { email: norm(d.email) } }))) throw new UserError(`${d.email} already has a login.`);
    const token = randomBytes(24).toString('base64url');
    const days = d.valid_days ?? policy.invite_valid_days;
    await db.invite.create({
      data: { token, email: d.email ? norm(d.email) : null, name: d.name, role_id: d.role_id, college_id: d.college_id, note: d.note, access_expires_at: d.access_expires_at, expires_at: new Date(Date.now() + days * 86400000), created_by: actor.id },
    });
    const role = await db.role.findUniqueOrThrow({ where: { id: d.role_id } });
    const url = `${await origin()}/invite/${token}`;
    const text = `You've been invited to join VidyaOS as ${role.name}. Set up your login here (valid ${days} days): ${url}`;
    await audit(actor, 'INVITE_CREATED', 'Team', `Invite for ${d.email ?? d.name ?? 'anyone with the link'} as ${role.name}`);
    return {
      message: `Invite created — valid for ${days} days.`,
      data: { link: { label: `Invite link for ${role.name}`, url, share: { whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`, ...(d.email ? { mailto: `mailto:${d.email}?subject=${encodeURIComponent('Your VidyaOS invitation')}&body=${encodeURIComponent(text)}` } : {}) } } },
    };
  });
}

export async function revokeInvite(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ id: int(1) }), fd);
    await db.invite.updateMany({ where: { id: d.id, status: 'Pending' }, data: { status: 'Revoked' } });
    await audit(actor, 'INVITE_REVOKED', 'Team', `Revoked invite #${d.id}`);
    return 'Invite revoked — its link no longer works.';
  });
}

export async function renewInvite(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ id: int(1) }), fd);
    const inv = await db.invite.findUniqueOrThrow({ where: { id: d.id } });
    if (inv.status === 'Accepted') throw new UserError('This invite was already accepted.');
    const policy = await getPolicy();
    const token = randomBytes(24).toString('base64url');
    await db.invite.update({ where: { id: inv.id }, data: { token, status: 'Pending', expires_at: new Date(Date.now() + policy.invite_valid_days * 86400000) } });
    await audit(actor, 'INVITE_RENEWED', 'Team', `Renewed invite #${inv.id}`);
    const url = `${await origin()}/invite/${token}`;
    return { message: 'New invite link generated (the old one stopped working).', data: { link: { label: 'New invite link', url } } };
  });
}

/** 3. Bulk import from CSV text. Columns: name, email, phone, role (slug or name), college(optional) */
export async function bulkImport(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ default_role_id: int(1), csv: str(200000), must_change: bool() }), fd);
    const roles = await db.role.findMany();
    const colleges = await db.college.findMany();
    const lines = d.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (/^name\s*[,;\t]/i.test(lines[0] ?? '')) lines.shift();
    if (lines.length === 0) throw new UserError('Paste at least one row: name, email, phone, role.');
    if (lines.length > 200) throw new UserError('Import up to 200 people at a time.');
    const seen = new Set<string>();
    const created: string[][] = [];
    const skipped: string[][] = [];
    for (const [i, line] of lines.entries()) {
      const cols = line.split(/\s*[,;\t]\s*/);
      const [name, mail, phone, roleText, collegeText] = cols;
      const rowNo = String(i + 1);
      const e = norm(mail ?? '');
      const fail = (why: string) => skipped.push([rowNo, name ?? '', e, why]);
      if (!name || !e) { fail('Missing name or email'); continue; }
      if (!z.string().email().safeParse(e).success) { fail('Invalid email'); continue; }
      if (seen.has(e)) { fail('Duplicate in this file'); continue; }
      seen.add(e);
      if (await db.user.findUnique({ where: { email: e } })) { fail('Already has a login'); continue; }
      const role = roleText ? roles.find((r) => r.slug === roleText.toLowerCase().replace(/\s+/g, '_') || r.name.toLowerCase() === roleText.toLowerCase()) : roles.find((r) => r.id === d.default_role_id);
      if (!role) { fail(`Unknown role "${roleText}"`); continue; }
      try { await assertCanAssign(actor, role.id); await assertStaffCapacity(role.slug); } catch (err) { fail((err as Error).message); continue; }
      const college = collegeText ? colleges.find((c) => c.code.toLowerCase() === collegeText.toLowerCase() || c.name.toLowerCase() === collegeText.toLowerCase()) : undefined;
      const password = generatePassword();
      await createUserRecord({ name, email: e, phone: phone || undefined, roleId: role.id, collegeId: college?.id, password, mustChange: d.must_change });
      created.push([name, e, role.name, password]);
    }
    await audit(actor, 'MEMBERS_IMPORTED', 'Team', `Bulk import: ${created.length} created, ${skipped.length} skipped`);
    const rows = [...created.map((r) => ['Created', ...r]), ...skipped.map((r) => ['Skipped', r[1], r[2], `row ${r[0]}`, r[3]])];
    return {
      message: `${created.length} login${created.length === 1 ? '' : 's'} created${skipped.length ? `, ${skipped.length} skipped` : ''}.`,
      data: { table: { head: ['Result', 'Name', 'Email', 'Role / Row', 'Password / Reason'], rows, csvName: 'team-import-results.csv', note: 'Download this list now — passwords are not shown again.' } },
    };
  });
}

/** 4. Give a login to someone who is already in the system (employee / student / guardian). */
export async function createFromRecord(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ kind: oneOf(['employee', 'student', 'guardian']), id: int(1), role_id: optInt(1) }), fd);
    const policy = await getPolicy();
    const password = generatePassword();
    let name = '', mail = '', phone: string | undefined, collegeId: number | undefined, roleSlug = '';
    if (d.kind === 'employee') {
      const e = await db.employee.findUniqueOrThrow({ where: { id: d.id } });
      if (e.user_id) throw new UserError('This employee already has a login.');
      name = e.full_name; mail = e.email; phone = e.phone; collegeId = e.college_id;
      roleSlug = e.employee_type === 'Faculty' ? 'faculty' : '';
    } else if (d.kind === 'student') {
      const s = await db.student.findUniqueOrThrow({ where: { id: d.id } });
      if (s.user_id) throw new UserError('This student already has a login.');
      name = s.full_name; mail = s.email; phone = s.phone; collegeId = s.college_id; roleSlug = 'student';
    } else {
      const g = await db.studentGuardian.findUniqueOrThrow({ where: { id: d.id } });
      if (g.parent_user_id) throw new UserError('This guardian already has a login.');
      if (!g.email) throw new UserError('Add an email address for this guardian first.');
      name = g.name; mail = g.email; phone = g.phone ?? undefined; roleSlug = 'parent';
    }
    const roleId = d.role_id ?? (roleSlug ? (await db.role.findUnique({ where: { slug: roleSlug } }))?.id : undefined);
    if (!roleId) throw new UserError('Choose a role for this person.');
    await assertCanAssign(actor, roleId);
    const u = await createUserRecord({ name, email: mail, phone, roleId, collegeId, password, mustChange: policy.force_change_on_first_login });
    if (d.kind === 'employee') await db.employee.update({ where: { id: d.id }, data: { user_id: u.id } });
    else if (d.kind === 'student') await db.student.update({ where: { id: d.id }, data: { user_id: u.id } });
    else await db.studentGuardian.update({ where: { id: d.id }, data: { parent_user_id: u.id } });
    await audit(actor, 'MEMBER_LINKED', 'Team', `Created login for existing ${d.kind}: ${u.email}`);
    return { message: `Login created for ${u.name} and linked to their ${d.kind} record.`, data: { credentials: [{ label: 'Email', value: u.email }, { label: 'Password', value: password }] } };
  });
}

async function guardLastAdmin(userId: number, willBeAdmin: boolean, willBeActive: boolean) {
  const target = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
  if (target.role?.slug === 'super_admin' && (!willBeAdmin || !willBeActive)) {
    const others = await db.user.count({ where: { id: { not: userId }, status: 'Active', role: { slug: 'super_admin' } } });
    if (others === 0) throw new UserError('At least one active College Administrator must remain.');
  }
  return target;
}

export async function updateMember(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ id: int(1), name: str(), phone: optStr(20), role_id: int(1), status: oneOf(['Active', 'Inactive']), access_expires_at: optDate() }), fd);
    const target = await db.user.findUniqueOrThrow({ where: { id: d.id }, include: { role: true } });
    if (target.role?.slug === 'owner' && !isOwner(actor)) throw new UserError('Only the software owner can change an owner account.');
    if (target.role?.slug === 'super_admin' && !isAdmin(actor)) throw new UserError('Only a College Administrator can change another College Administrator.');
    const newRole = await assertCanAssign(actor, d.role_id);
    if (d.id === actor.id && (d.status !== 'Active' || newRole.id !== actor.role?.id)) throw new UserError("You can't deactivate yourself or change your own role.");
    await guardLastAdmin(d.id, newRole.slug === 'super_admin', d.status === 'Active');
    await db.user.update({ where: { id: d.id }, data: { name: d.name, phone: d.phone ?? null, role_id: d.role_id, status: d.status, access_expires_at: d.access_expires_at ?? null } });
    await audit(actor, 'MEMBER_UPDATED', 'Team', `Updated ${target.email}: role ${newRole.name}, ${d.status}`);
    return `${d.name} updated.`;
  });
}

export async function resetMemberPassword(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ id: int(1) }), fd);
    const target = await db.user.findUniqueOrThrow({ where: { id: d.id }, include: { role: true } });
    if (target.role?.slug === 'owner' && !isOwner(actor)) throw new UserError('Only the software owner can reset an owner account.');
    if (target.role?.slug === 'super_admin' && !isAdmin(actor)) throw new UserError('Only a College Administrator can reset another College Administrator.');
    const password = generatePassword();
    await db.user.update({ where: { id: d.id }, data: { password: bcrypt.hashSync(password, 10), must_change_password: true, password_changed_at: new Date(), failed_attempts: 0, locked_until: null } });
    await audit(actor, 'PASSWORD_RESET', 'Team', `Reset password for ${target.email}`);
    return { message: `Password reset for ${target.name}. They must choose a new one at next sign-in.`, data: { credentials: [{ label: 'Email', value: target.email }, { label: 'Temporary password', value: password }] } };
  });
}

export async function unlockMember(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const d = parse(z.object({ id: int(1) }), fd);
    const target = await db.user.findUniqueOrThrow({ where: { id: d.id }, include: { role: true } });
    if (target.role?.slug === 'owner' && !isOwner(actor)) throw new UserError('Only the software owner can change an owner account.');
    const t = await db.user.update({ where: { id: d.id }, data: { failed_attempts: 0, locked_until: null } });
    await audit(actor, 'ACCOUNT_UNLOCKED', 'Team', `Unlocked ${t.email}`);
    return `${t.name} can sign in again.`;
  });
}

/** Public: accept an invite, choose a password and get signed in. */
export async function acceptInvite(_p: ActionState, fd: FormData): Promise<ActionState> {
  let target = '';
  const res = await runPublic(async () => {
    const d = parse(z.object({ token: str(200), name: str(), email: email(), phone: optStr(20), password: str(200), confirm: str(200) }), fd);
    if (d.password !== d.confirm) throw new UserError('The passwords do not match.');
    const policy = await getPolicy();
    const problem = checkPassword(d.password, policy);
    if (problem) throw new UserError(problem);
    const inv = await db.invite.findUnique({ where: { token: d.token }, include: { role: true } });
    if (!inv || inv.status !== 'Pending') throw new UserError('This invite is no longer valid.');
    if (inv.expires_at < new Date()) throw new UserError('This invite has expired. Ask for a new one.');
    if (inv.email && norm(inv.email) !== norm(d.email)) throw new UserError(`This invite is for ${inv.email}.`);
    const u = await createUserRecord({ name: d.name, email: d.email, phone: d.phone, roleId: inv.role_id, collegeId: inv.college_id ?? undefined, password: d.password, mustChange: false, accessExpires: inv.access_expires_at });
    await db.invite.update({ where: { id: inv.id }, data: { status: 'Accepted', accepted_user_id: u.id, accepted_at: new Date() } });
    await db.auditLog.create({ data: { user_id: u.id, action: 'INVITE_ACCEPTED', module: 'Team', description: `${u.email} joined as ${inv.role.name} via invite` } });
    await createSession(u.id, { role: { id: inv.role.id, slug: inv.role.slug, name: inv.role.name }, hours: policy.session_hours, idleMinutes: policy.idle_timeout_minutes });
    const perms = new Set(await permsForRole(inv.role.id));
    const lic = await getLicense();
    target = homeFor({ role: inv.role, perms, enabled: lic.modules ? new Set(lic.modules) : null });
  });
  if (res?.ok) redirect(target);
  return res;
}
