'use server';

import { z } from 'zod';
import { run, audit, UserError, type ActionState } from '@/lib/action';
import { buildDigest, sendViaResend, setDigestSetting } from '@/lib/digest';

const G = { module: 'enquiries' } as const;

export async function saveDigest(_p: ActionState, fd: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    const emails = String(fd.get('recipients') ?? '').split(/[,\s;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const bad = emails.filter((e) => !z.string().email().safeParse(e).success);
    if (bad.length) throw new UserError(`Not a valid email: ${bad[0]}`);
    if (emails.length > 20) throw new UserError('Up to 20 recipients.');
    await setDigestSetting('recipients', emails.join(','));
    await setDigestSetting('enabled', fd.get('enabled') === 'on' ? '1' : '0');
    await audit(actor, 'DIGEST_SAVED', 'Enquiries', 'Updated morning digest settings');
    return 'Morning digest settings saved.';
  });
}

/** Sends the last 24 hours to the signed-in user only; does not move the real digest window. */
export async function sendTestDigest(_p: ActionState, _fd?: FormData): Promise<ActionState> {
  return run(G, async (actor) => {
    if (!actor.email) throw new UserError('Your account has no email address.');
    if (!process.env.RESEND_API_KEY) throw new UserError('Email sending is not set up on the server yet (RESEND_API_KEY).');
    const d = await buildDigest(new Date(Date.now() - 24 * 3600_000));
    try { await sendViaResend([actor.email], `[Test] ${d.subject}`, d.html, d.text); } catch { throw new UserError('The email service rejected the message. Check the sending domain and API key.'); }
    return `Test digest sent to ${actor.email}.`;
  });
}
