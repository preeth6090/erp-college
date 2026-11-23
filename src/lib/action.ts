import 'server-only';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { getUser, hasRole, type Role, type SessionUser } from './auth';
import { db } from './db';

export type ActionState = { ok: boolean; message?: string; errors?: string[]; ts: number } | null;

/** Throw to show a friendly message to the user. */
export class UserError extends Error {}

/**
 * Wraps a server action body: checks role, validates, reports success/failure
 * as state for <ActionForm>, and refreshes cached pages.
 */
export async function run(roles: Role[] | null, fn: (user: SessionUser) => Promise<string | void>): Promise<ActionState> {
  try {
    const user = await getUser();
    if (!user) throw new UserError('Your session has expired. Please sign in again.');
    if (roles && roles.length && !hasRole(user, roles)) throw new UserError('You do not have permission to perform this action.');
    const message = await fn(user);
    revalidatePath('/', 'layout');
    return { ok: true, message: message || 'Saved.', ts: Date.now() };
  } catch (e: any) {
    if (typeof e?.digest === 'string' && e.digest.startsWith('NEXT_')) throw e; // redirect / notFound
    if (e instanceof ZodError) {
      return { ok: false, errors: e.issues.map((i) => `${i.path.join('.') || 'Field'}: ${i.message}`), ts: Date.now() };
    }
    if (e instanceof UserError) return { ok: false, errors: [e.message], ts: Date.now() };
    if (e?.code === 'P2002') return { ok: false, errors: ['A record with the same unique value already exists.'], ts: Date.now() };
    if (e?.code === 'P2003') return { ok: false, errors: ['A related record was not found.'], ts: Date.now() };
    console.error(e);
    return { ok: false, errors: ['Something went wrong. Please try again.'], ts: Date.now() };
  }
}

/** Like run(), but without requiring a signed-in user (public forms). */
export async function runPublic(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await fn();
    revalidatePath('/', 'layout');
    return { ok: true, message: message || 'Saved.', ts: Date.now() };
  } catch (e: any) {
    if (typeof e?.digest === 'string' && e.digest.startsWith('NEXT_')) throw e;
    if (e instanceof ZodError) return { ok: false, errors: e.issues.map((i) => `${i.path.join('.') || 'Field'}: ${i.message}`), ts: Date.now() };
    if (e instanceof UserError) return { ok: false, errors: [e.message], ts: Date.now() };
    console.error(e);
    return { ok: false, errors: ['Something went wrong. Please try again.'], ts: Date.now() };
  }
}

export async function notify(n: { name: string; contact: string; channel: string; subject: string; message: string }) {
  await db.notificationLog.create({
    data: { recipient_name: n.name, recipient_contact: n.contact, channel: n.channel, subject: n.subject, message: n.message, status: 'Sent', sent_at: new Date() },
  });
}

export async function audit(user: SessionUser | null, action: string, module: string, description: string, extra: { record_type?: string; record_id?: number } = {}) {
  await db.auditLog.create({ data: { user_id: user?.id ?? null, action, module, description, ...extra } });
}
