import 'server-only';
import { db } from './db';
import { getLicense, licenseProblem } from './license';

/**
 * The morning digest: ONE email listing everything new in Enquiry & CRM since the last one
 * (website leads first) plus follow-ups due. Sent through Resend.
 */
const K = { enabled: 'digest.enabled', recipients: 'digest.recipients', last: 'digest.last_sent' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const ist = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...opts }).format(d);

export type DigestConfig = { enabled: boolean; recipients: string[]; last_sent: Date | null };

export async function getDigestConfig(): Promise<DigestConfig> {
  const rows = await db.systemSetting.findMany({ where: { key: { in: Object.values(K) } } });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  const last = m[K.last] ? new Date(m[K.last]) : null;
  return {
    enabled: m[K.enabled] === '1',
    recipients: (m[K.recipients] ?? '').split(/[,\s;]+/).map((s) => s.trim().toLowerCase()).filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)),
    last_sent: last && !isNaN(last.getTime()) ? last : null,
  };
}

export async function setDigestSetting(key: 'enabled' | 'recipients' | 'last', value: string) {
  await db.systemSetting.upsert({ where: { key: K[key] }, update: { value }, create: { key: K[key], group_name: 'digest', value } });
}

type Lead = { enquiry_no: string; student_name: string; phone: string; email: string | null; source: string; campaign_name: string | null; notes: string | null; created_at: Date; course: { code: string } | null };

export async function buildDigest(since: Date, now = new Date()) {
  const inst = (await getLicense()).institution_name || 'VidyaOS';
  const leads: Lead[] = await db.admissionEnquiry.findMany({ where: { created_at: { gt: since, lte: now } }, include: { course: { select: { code: true } } }, orderBy: { created_at: 'asc' }, take: 500 });
  const endOfToday = new Date(`${ist(now, { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')}T23:59:59+05:30`);
  const due = await db.admissionEnquiry.findMany({
    where: { next_followup_date: { lte: endOfToday }, status: { in: ['New', 'Follow-up'] } },
    include: { course: { select: { code: true } } }, orderBy: { next_followup_date: 'asc' }, take: 200,
  });
  const web = leads.filter((l) => l.source === 'Website');
  const other = leads.filter((l) => l.source !== 'Website');
  const day = ist(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const subject = `${inst} — ${leads.length} new ${leads.length === 1 ? 'enquiry' : 'enquiries'}${web.length ? ` (${web.length} from the website)` : ''}, ${due.length} follow-up${due.length === 1 ? '' : 's'} due · ${ist(now, { day: 'numeric', month: 'short' })}`;

  const note = (n: string | null) => (n ?? '').replace(/\[ref:[^\]]*\]/g, '').trim().slice(0, 200);
  const row = (l: Lead) => `<tr><td style="padding:8px;border-top:1px solid #e5e7eb;vertical-align:top"><b>${esc(l.student_name)}</b><br><span style="color:#64748b;font-size:12px">${esc(l.enquiry_no)} · ${ist(l.created_at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span></td><td style="padding:8px;border-top:1px solid #e5e7eb;vertical-align:top"><a href="tel:${esc(l.phone)}" style="color:#0f2a5c">${esc(l.phone)}</a>${l.email ? `<br><a href="mailto:${esc(l.email)}" style="color:#0f2a5c;font-size:12px">${esc(l.email)}</a>` : ''}</td><td style="padding:8px;border-top:1px solid #e5e7eb;vertical-align:top">${esc(l.course?.code ?? '—')}${l.campaign_name ? `<br><span style="color:#64748b;font-size:12px">${esc(l.campaign_name)}</span>` : ''}${note(l.notes) ? `<br><span style="color:#64748b;font-size:12px;white-space:pre-line">${esc(note(l.notes))}</span>` : ''}</td></tr>`;
  const table = (title: string, rows: Lead[]) => rows.length ? `<h3 style="margin:22px 0 6px;font-size:15px;color:#0f2a5c">${esc(title)} (${rows.length})</h3><table width="100%" cellspacing="0" style="border-collapse:collapse;font-size:14px">${rows.map(row).join('')}</table>` : '';
  const dueRows = due.length ? `<h3 style="margin:22px 0 6px;font-size:15px;color:#b45309">Follow-ups due today or overdue (${due.length})</h3><table width="100%" cellspacing="0" style="border-collapse:collapse;font-size:14px">${due.map((l) => `<tr><td style="padding:8px;border-top:1px solid #e5e7eb"><b>${esc(l.student_name)}</b> · ${esc(l.phone)}<br><span style="color:#64748b;font-size:12px">${esc(l.enquiry_no)} · ${esc(l.course?.code ?? '')} · was due ${l.next_followup_date ? ist(l.next_followup_date, { day: 'numeric', month: 'short' }) : ''}</span></td></tr>`).join('')}</table>` : '';
  const empty = !leads.length && !due.length ? '<p style="color:#475569">Nothing new since the last digest and no follow-ups due.</p>' : '';
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a"><div style="background:#0f2a5c;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0"><div style="font-size:12px;opacity:.8">Morning digest · ${esc(day)}</div><div style="font-size:19px;font-weight:700">${esc(inst)}</div></div><div style="border:1px solid #e5e7eb;border-top:0;padding:8px 20px 20px;border-radius:0 0 12px 12px"><p style="font-size:15px"><b>${leads.length}</b> new since the last digest · <b>${web.length}</b> from the website · <b>${due.length}</b> follow-ups due</p>${empty}${table('From the website', web)}${table('Other new enquiries', other)}${dueRows}<p style="margin-top:24px;font-size:12px;color:#94a3b8">Sent by VidyaOS · Timestamp India. Manage recipients under Enquiries → Morning digest.</p></div></div>`;
  const line = (l: Lead) => `- ${l.student_name} | ${l.phone}${l.email ? ' | ' + l.email : ''} | ${l.course?.code ?? '-'} | ${l.enquiry_no}`;
  const text = [`${inst} — morning digest, ${day}`, '', `${leads.length} new (${web.length} website), ${due.length} follow-ups due`, '', web.length ? 'WEBSITE\n' + web.map(line).join('\n') + '\n' : '', other.length ? 'OTHER\n' + other.map(line).join('\n') + '\n' : '', due.length ? 'FOLLOW-UPS DUE\n' + due.map(line).join('\n') : ''].filter((s) => s !== '').join('\n');
  return { subject, html, text, counts: { new: leads.length, website: web.length, due: due.length } };
}

export async function sendViaResend(to: string[], subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set.');
  const res = await fetch(`${process.env.RESEND_API_URL || 'https://api.resend.com'}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'VidyaOS <no-reply@timestampindia.tech>', to, reply_to: process.env.MAIL_REPLY_TO || undefined, subject, html, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Scheduled run. Advances the window only after a successful send. */
export async function runDailyDigest(now = new Date()) {
  if (licenseProblem(await getLicense())) return { sent: false, reason: 'licence inactive' };
  const cfg = await getDigestConfig();
  if (!cfg.enabled) return { sent: false, reason: 'digest switched off' };
  if (!cfg.recipients.length) return { sent: false, reason: 'no recipients' };
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'RESEND_API_KEY not set' };
  const since = cfg.last_sent ?? new Date(now.getTime() - 24 * 3600_000);
  const d = await buildDigest(since, now);
  await sendViaResend(cfg.recipients, d.subject, d.html, d.text);
  await setDigestSetting('last', now.toISOString());
  return { sent: true, to: cfg.recipients.length, ...d.counts };
}
