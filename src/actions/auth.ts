'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, destroySession, getUser, homeForRole } from '@/lib/auth';
import { audit } from '@/lib/action';

export type LoginState = { error?: string; email?: string } | null;

export async function login(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1) }).safeParse({
    email: fd.get('email'), password: fd.get('password'),
  });
  if (!parsed.success) return { error: 'Enter a valid email and password.', email: String(fd.get('email') ?? '') };

  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, include: { role: true } });
  const ok = user && user.status === 'Active' && (await bcrypt.compare(parsed.data.password, user.password));
  if (!user || !ok) return { error: 'Invalid email, password, or inactive account.', email: parsed.data.email };

  await createSession(user.id, fd.get('remember') === '1', user.role ? { id: user.role.id, slug: user.role.slug, name: user.role.name } : null);
  const ip = (await headers()).get('x-forwarded-for') ?? '127.0.0.1';
  await db.auditLog.create({ data: { user_id: user.id, action: 'LOGIN', module: 'Auth', description: `User signed in: ${user.email}`, ip_address: ip } });
  redirect(homeForRole(user.role?.slug));
}

export async function logout() {
  const user = await getUser();
  if (user) await audit(user, 'LOGOUT', 'Auth', `User signed out: ${user.email}`);
  await destroySession();
  redirect('/login');
}
