import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getLicense, licenseProblem } from '@/lib/license';

/**
 * Receives website leads (e.g. from a Google Sheet) and files them as enquiries with source "Website".
 *
 *   POST /api/leads/website
 *   Authorization: Bearer <LEADS_API_TOKEN>
 *   { "leads": [ { "name": "...", "phone": "...", "email": "...", "course": "...", "message": "...", "campaign": "...", "external_id": "..." } ] }
 *   (a single lead object is accepted too)
 *
 * Duplicates (same phone in the last 60 days, or same external_id) are reported, not re-created.
 */
export const dynamic = 'force-dynamic';

const text = (max: number) => z.preprocess((v) => (v == null || v === '' ? undefined : String(v).trim().slice(0, max)), z.string().optional());
const Lead = z.object({
  name: text(255), phone: text(40), email: text(255), course: text(255), message: text(2000), campaign: text(100), external_id: text(120),
  extra: z.record(z.string(), z.unknown()).optional(),
});

function authorised(req: Request) {
  const expected = process.env.LEADS_API_TOKEN;
  if (!expected || expected.length < 24) return 'not-configured' as const;
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(got), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? ('ok' as const) : ('denied' as const);
}

const digits = (s?: string) => (s ?? '').replace(/\D/g, '');
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(req: Request) {
  const auth = authorised(req);
  if (auth === 'not-configured') return json({ error: 'Lead intake is not configured on this server.' }, 503);
  if (auth === 'denied') return json({ error: 'Unauthorised.' }, 401);
  if (licenseProblem(await getLicense())) return json({ error: 'This institution’s access is not active.' }, 403);

  const raw = await req.text();
  if (raw.length > 400_000) return json({ error: 'Payload too large.' }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Body must be JSON.' }, 400); }
  const items = Array.isArray((body as { leads?: unknown })?.leads) ? (body as { leads: unknown[] }).leads : [body];
  if (items.length === 0 || items.length > 50) return json({ error: 'Send between 1 and 50 leads per request.' }, 400);

  const courses = await db.course.findMany({ select: { id: true, code: true, name: true } });
  const since = new Date(Date.now() - 60 * 86400000);
  // recent website leads keyed by the last 10 digits of their phone, so "98450 11122" and "+91 9845011122" match
  const recent = new Map<string, string>();
  for (const r of await db.admissionEnquiry.findMany({ where: { source: 'Website', created_at: { gte: since } }, select: { phone: true, enquiry_no: true }, take: 5000 })) {
    const d = digits(r.phone).slice(-10); if (d.length >= 7) recent.set(d, r.enquiry_no);
  }
  const results: { index: number; status: 'created' | 'duplicate' | 'invalid'; enquiry_no?: string; error?: string }[] = [];

  for (const [index, item] of items.entries()) {
    const parsed = Lead.safeParse(item);
    if (!parsed.success) { results.push({ index, status: 'invalid', error: 'Unreadable lead.' }); continue; }
    const l = parsed.data;
    const phone = digits(l.phone);
    const email = l.email && z.string().email().safeParse(l.email).success ? l.email.toLowerCase() : undefined;
    if (!l.name && !phone && !email) { results.push({ index, status: 'invalid', error: 'Needs a name, phone or email.' }); continue; }
    if (phone && phone.length < 7) { results.push({ index, status: 'invalid', error: 'Phone number looks too short.' }); continue; }

    // duplicates: same sheet row, or same phone recently
    const marker = l.external_id ? `[ref:${l.external_id}]` : null;
    const byRef = marker ? await db.admissionEnquiry.findFirst({ where: { notes: { contains: marker } }, select: { enquiry_no: true } }) : null;
    const dup = byRef ?? (phone && recent.has(phone.slice(-10)) ? { enquiry_no: recent.get(phone.slice(-10))! } : null);
    if (dup) { results.push({ index, status: 'duplicate', enquiry_no: dup.enquiry_no }); continue; }

    const wanted = (l.course ?? '').toLowerCase();
    const course = wanted ? courses.find((c) => c.code.toLowerCase() === wanted || c.name.toLowerCase() === wanted || wanted.includes(c.code.toLowerCase())) : undefined;
    const notes = [
      l.message,
      l.course && !course ? `Interested in: ${l.course}` : undefined,
      ...Object.entries(l.extra ?? {}).slice(0, 15).map(([k, v]) => `${String(k).slice(0, 60)}: ${String(v).slice(0, 300)}`),
      marker ?? undefined,
    ].filter(Boolean).join('\n');

    let created: { enquiry_no: string } | null = null;
    for (let attempt = 0; attempt < 4 && !created; attempt++) {
      try {
        created = await db.admissionEnquiry.create({
          data: {
            enquiry_no: `ENQ-${new Date().getFullYear()}-W${Math.floor(10000 + Math.random() * 90000)}`,
            student_name: l.name || email || phone, phone: l.phone || '—', email, source: 'Website', campaign_name: l.campaign,
            course_id: course?.id, status: 'New', notes: notes || undefined,
          },
          select: { enquiry_no: true },
        });
      } catch (e) { if ((e as { code?: string }).code !== 'P2002') throw e; }
    }
    if (!created) { results.push({ index, status: 'invalid', error: 'Could not allocate an enquiry number; retry.' }); continue; }
    if (phone) recent.set(phone.slice(-10), created.enquiry_no); // later rows in this same batch are checked against it too
    results.push({ index, status: 'created', enquiry_no: created.enquiry_no });
  }

  const made = results.filter((r) => r.status === 'created').length;
  if (made) await db.auditLog.create({ data: { action: 'LEADS_IMPORTED', module: 'Enquiries', description: `${made} website lead${made === 1 ? '' : 's'} received from the sheet` } });
  return json({ ok: true, created: made, results });
}

export function GET() { return json({ error: 'Use POST.' }, 405); }
