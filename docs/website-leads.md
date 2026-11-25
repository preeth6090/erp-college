# Website leads → Enquiry & CRM

Leads your website writes into the Google Sheet are pushed to the platform automatically and appear under **Enquiry & CRM** with lead source **Website**.

| Sheet tab | What it is | Lands in the platform as |
| --- | --- | --- |
| **Enquiries** | Short "Request a callback / Enquiry" forms (Home, Contact, NEET, Degree pages) | Enquiry · source **Website** · campaign = the page it came from |
| **Applications** | The full Apply form (reference no. like `V-2026/Pu-001`) | Enquiry · source **Website** · campaign **Application form** · every field kept in the notes |

## How it works
1. Right after each website submission (and every minute as a safety net) the sheet script looks for rows it has not sent yet.
2. Each new row is sent securely to `POST /api/leads/website` with a secret token.
3. The platform files it as an enquiry (`status = New`). Duplicates — the same phone number in the last 60 days, or the same application reference — are not created twice.
4. The script writes the result beside each row in a **VidyaOS sync** column ("Synced … · ENQ-2026-W12345", "Already in VidyaOS", or why it was skipped).

## One-time setup
1. **Server:** set the environment variable `LEADS_API_TOKEN` (24+ random characters) and redeploy.
2. **Sheet:** open *Extensions → Apps Script*, select all the existing code and replace it with [`website-form-script.gs`](./website-form-script.gs) — your original form script plus the VidyaOS sync. Confirmation emails are optional and sent with Resend from `timestampindia.tech` — see the comment at the top of the script.
3. **Project Settings (gear) → Script properties:** add `ENDPOINT` = `https://<your-site>/api/leads/website` and `TOKEN` = the same value as `LEADS_API_TOKEN`.
4. Choose the function **`vosSetup`** and press **Run**; approve the permissions. This creates a 1-minute backup timer and sends every existing row once.
5. **Deploy → Manage deployments → pencil → Version: New version → Deploy** (the `/exec` URL does not change).
6. Submit a test enquiry on the website — it appears in the platform immediately and the sheet row says "Synced".

The form handling is the original code; the only changes are one `vosInstantSync_()` line before each handler returns. If the platform is unreachable the website form still succeeds, and the 1-minute timer retries the unsent rows. Set `VOS_INSTANT = false` to rely on the timer only.

To stop the sync: Apps Script → Triggers → delete the two `vosSyncNewLeads` triggers, or change `LEADS_API_TOKEN` on the server.
