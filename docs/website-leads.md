# Website leads → Enquiry & CRM

Leads your website writes into the Google Sheet are pushed to the platform automatically and appear under **Enquiry & CRM** with lead source **Website**.

| Sheet tab | What it is | Lands in the platform as |
| --- | --- | --- |
| **Enquiries** | Short "Request a callback / Enquiry" forms (Home, Contact, NEET, Degree pages) | Enquiry · source **Website** · campaign = the page it came from |
| **Applications** | The full Apply form (reference no. like `V-2026/Pu-001`) | Enquiry · source **Website** · campaign **Application form** · every field kept in the notes |

## How it works
1. A script in the sheet checks for new rows every minute (and when the sheet changes).
2. Each new row is sent securely to `POST /api/leads/website` with a secret token.
3. The platform files it as an enquiry (`status = New`). Duplicates — the same phone number in the last 60 days, or the same application reference — are not created twice.
4. The script writes the result beside each row in a **VidyaOS sync** column ("Synced … · ENQ-2026-W12345", "Already in VidyaOS", or why it was skipped).

The website's own form script is not changed in any way.

## One-time setup
1. **Server:** set the environment variable `LEADS_API_TOKEN` (24+ random characters) and redeploy.
2. **Sheet:** open *Extensions → Apps Script* (the project that already holds the website form code). Click **+ → Script**, name it `VidyaOSSync`, paste [`VidyaOSSync.gs`](./VidyaOSSync.gs), save. Do **not** redeploy the web app — nothing about the live form changes.
3. **Project Settings (gear) → Script properties:** add `ENDPOINT` = `https://<your-site>/api/leads/website` and `TOKEN` = the same value as `LEADS_API_TOKEN`.
4. Choose the function **`vosSetup`** and press **Run**; approve the permissions. This also sends every existing row once.
5. Submit a test enquiry on the website — within a minute it appears in the platform and the sheet row says "Synced".

**Optional — instant instead of ~1 minute:** at the end of `handleEnquiry` and `handleApply` in the website script (just before `return respond({ success: true … })`) add `try { vosSyncNewLeads() } catch (e) {}`. Then redeploy that web app as a new version.

To stop the sync: Apps Script → Triggers → delete the two `vosSyncNewLeads` triggers, or change `LEADS_API_TOKEN` on the server.
