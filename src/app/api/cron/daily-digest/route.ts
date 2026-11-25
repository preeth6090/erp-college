import { timingSafeEqual } from 'node:crypto';
import { runDailyDigest } from '@/lib/digest';

export const dynamic = 'force-dynamic';

/** Called by Vercel Cron at 07:00 IST with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(got), b = Buffer.from(expected ?? '');
  if (!expected || expected.length < 16 || a.length !== b.length || !timingSafeEqual(a, b)) return Response.json({ error: 'Unauthorised.' }, { status: 401 });
  try {
    return Response.json(await runDailyDigest(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('daily digest failed', e);
    return Response.json({ sent: false, error: 'send failed' }, { status: 500 });
  }
}
