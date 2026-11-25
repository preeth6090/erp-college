# Website leads → Enquiry & CRM

Leads your website writes into the Google Sheet are pushed to the platform automatically and appear under **Enquiry & CRM** with lead source **Website**.

| Sheet tab | What it is | Lands in the platform as |
| --- | --- | --- |
| **Enquiries** | Short "Request a callback / Enquiry" forms (Home, Contact, NEET, Degree pages) | Enquiry · source **Website** · campaign = the page it came from |
| **Applications** | The full Apply form (reference no. like `V-2026/Pu-001`) | Enquiry · source **Website** · campaign **Application form** · every field kept in the notes |

## How it works
1. Every minute (and right after any sheet change) the sync file looks for rows it has not sent yet.
2. Each new row is sent securely to `POST /api/leads/website` with a secret token.
3. The platform files it as an enquiry (`status = New`). Duplicates — the same phone number in the last 60 days, or the same application reference — are not created twice.
4. The script writes the result beside each row in a **VidyaOS sync** column ("Synced … · ENQ-2026-W12345", "Already in VidyaOS", or why it was skipped).

Your website's own form script is **not changed or replaced**. [`VidyaOSSync.gs`](./VidyaOSSync.gs) is a separate file added next to it; every name in it starts with `vos` / `VOS_`, so it cannot clash.

## One-time setup
1. **Server:** set the environment variable `LEADS_API_TOKEN` (24+ random characters) and redeploy.
2. **Sheet:** open *Extensions → Apps Script*, click **+ → Script**, name it `VidyaOSSync`, and paste the contents of [`VidyaOSSync.gs`](./VidyaOSSync.gs). Leave the existing code alone.
3. **Project Settings (gear) → Script properties:** add `ENDPOINT` = `https://<your-site>/api/leads/website` and `TOKEN` = the same value as `LEADS_API_TOKEN`.
4. Choose the function **`vosSetup`** and press **Run**; approve the permissions. This creates the 1-minute timer and sends every existing row once.
5. Submit a test enquiry on the website — within about a minute it appears in Enquiry & CRM and the sheet row says "Synced".

If the platform is unreachable the website form still succeeds, and the timer retries the unsent rows.
To stop the sync: Apps Script → Triggers → delete the `vosSyncNewLeads` triggers, or change `LEADS_API_TOKEN` on the server.

## Morning digest (sent by VidyaOS, not the sheet)
One consolidated email at about **7:00 AM IST**: everything new in Enquiry & CRM since the previous digest (website leads first) plus follow-ups due or overdue. Always one message to all recipients.

1. Server environment variables: `RESEND_API_KEY` (from resend.com, sending domain `timestampindia.tech` verified), `CRON_SECRET` (16+ random characters; Vercel sends it to the scheduler route), optional `MAIL_FROM` (default `VidyaOS <no-reply@timestampindia.tech>`) and `MAIL_REPLY_TO`.
2. In the app: **Enquiries → Morning digest** — tick *Send the morning digest*, enter the recipient emails, **Save**. **Send me a test now** mails the last 24 hours to you only.
3. The schedule lives in `vercel.json` (`30 1 * * *` UTC = 7:00 AM IST). On Vercel's Hobby plan a daily job may run any time within that hour (about 6:30–7:29 AM IST); a Pro plan runs it on the minute.
4. If sending fails, the window does not advance, so the next morning's digest still includes those leads.
