'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, destroySession, getUser, homeFor, permsForRole } from '@/lib/auth';
import { audit } from '@/lib/action';
import { checkPassword, getPolicy } from '@/lib/policy';
import { getLicense, licenseProblem } from '@/lib/license';

export type LoginState = { error?: string; email?: string } | null;
const GENERIC = 'Invalid email or password, or the account is inactive.';

async function ip() {
  const h = await headers();
  return (h.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim();
}
async function log(user_id: number | null, action: string, description: string) {
  await db.auditLog.create({ data: { user_id, action, module: 'Auth', description, ip_address: await ip() } });
}

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1) }).safeParse({ email: fd.get('email'), password: fd.get('password') });
  if (!parsed.success) return { error: 'Enter a valid email and password.', email: String(fd.get('email') ?? '') };
  const email = parsed.data.email.toLowerCase();
  const policy = await getPolicy();
  const now = new Date();

  const user = await db.user.findUnique({ where: { email }, include: { role: true } });
  if (!user) { await log(null, 'LOGIN_FAILED', `Unknown account: ${email}`); return { error: GENERIC, email }; }

  if (user.locked_until && user.locked_until > now) {
    await log(user.id, 'LOGIN_BLOCKED', `Sign-in blocked (account locked): ${email}`);
    const mins = Math.ceil((user.locked_until.getTime() - now.getTime()) / 60000);
    return { error: `Too many failed attempts. This account is locked — try again in ${mins} minute${mins === 1 ? '' : 's'}.`, email };
  }
  if (user.status !== 'Active' || (user.access_expires_at && user.access_expires_at < now)) {
    await log(user.id, 'LOGIN_BLOCKED', `Sign-in blocked (${user.status !== 'Active' ? 'inactive' : 'access expired'}): ${email}`);
    return { error: user.status === 'Active' ? 'Your temporary access has expired. Please contact the administrator.' : GENERIC, email };
  }

  if (!(await bcrypt.compare(parsed.data.password, user.password))) {
    const attempts = user.failed_attempts + 1;
    if (policy.max_failed_attempts > 0 && attempts >= policy.max_failed_attempts) {
      await db.user.update({ where: { id: user.id }, data: { failed_attempts: 0, locked_until: new Date(now.getTime() + policy.lockout_minutes * 60000) } });
      await log(user.id, 'ACCOUNT_LOCKED', `Account locked for ${policy.lockout_minutes} min after ${attempts} failed attempts: ${email}`);
      return { error: `Too many failed attempts. This account is locked for ${policy.lockout_minutes} minutes.`, email };
    }
    await db.user.update({ where: { id: user.id }, data: { failed_attempts: attempts } });
    await log(user.id, 'LOGIN_FAILED', `Wrong password (${attempts}/${policy.max_failed_attempts || '∞'}): ${email}`);
    return { error: GENERIC, email };
  }

  // Success — but an institution whose subscription is suspended/ended cannot sign in (the owner always can)
  const license = await getLicense();
  const blocked = user.role?.slug === 'owner' ? null : licenseProblem(license);
  if (blocked) { await log(user.id, 'LOGIN_BLOCKED', `Sign-in blocked (licence): ${email}`); return { error: blocked, email }; }
  const expired = policy.password_expiry_days > 0 && user.password_changed_at && now.getTime() - user.password_changed_at.getTime() > policy.password_expiry_days * 86400000;
  await db.user.update({ where: { id: user.id }, data: { failed_attempts: 0, locked_until: null, last_login_at: now, ...(expired ? { must_change_password: true } : {}) } });
  await createSession(user.id, {
    role: user.role ? { id: user.role.id, slug: user.role.slug, name: user.role.name } : null,
    hours: policy.session_hours, idleMinutes: policy.idle_timeout_minutes,
  });
  await log(user.id, 'LOGIN', `User signed in: ${email}`);
  if (user.must_change_password || expired) redirect('/account/password');
  const perms = new Set(user.role ? await permsForRole(user.role.id) : []);
  redirect(homeFor({ role: user.role, perms, enabled: user.role?.slug === 'owner' || !license.modules ? null : new Set(license.modules) }));
}

export async function logout() {
  const user = await getUser();
  if (user) await audit(user, 'LOGOUT', 'Auth', `User signed out: ${user.email}`);
  await destroySession();
  redirect('/login');
}

export type PasswordState = { error?: string } | null;

export async function changePassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const user = await getUser();
  if (!user) redirect('/login');
  const d = z.object({ current: z.string().min(1), next: z.string().min(1), confirm: z.string().min(1) }).safeParse({ current: fd.get('current'), next: fd.get('next'), confirm: fd.get('confirm') });
  if (!d.success) return { error: 'Please fill in all fields.' };
  if (d.data.next !== d.data.confirm) return { error: 'The new passwords do not match.' };
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { role: true } });
  if (!(await bcrypt.compare(d.data.current, row.password))) return { error: 'Your current password is incorrect.' };
  if (d.data.next === d.data.current) return { error: 'Choose a password different from the current one.' };
  const policy = await getPolicy();
  const problem = checkPassword(d.data.next, policy);
  if (problem) return { error: problem };
  await db.user.update({ where: { id: user.id }, data: { password: bcrypt.hashSync(d.data.next, 10), must_change_password: false, password_changed_at: new Date(), failed_attempts: 0 } });
  await log(user.id, 'PASSWORD_CHANGED', `Password changed: ${user.email}`);
  // the change signs out other sessions, so start a fresh one here
  await createSession(user.id, { role: row.role ? { id: row.role.id, slug: row.role.slug, name: row.role.name } : null, hours: policy.session_hours, idleMinutes: policy.idle_timeout_minutes });
  const perms = new Set(row.role ? await permsForRole(row.role.id) : []);
  const lic = await getLicense();
  redirect(homeFor({ role: row.role, perms, enabled: row.role?.slug === 'owner' || !lic.modules ? null : new Set(lic.modules) }));
}
