/**
 * Vision — shared form intake, Web App version.
 *
 * Handles BOTH forms on the site:
 *  - The full Apply form (/apply) — formType "apply" (default if omitted,
 *    for backwards compatibility with the original single-form version).
 *  - The short "Enquiry"/"Request a Callback" form used on the Home, Contact,
 *    NEET Academy, and Degree College pages — formType "enquiry".
 *
 * Both write into the SAME spreadsheet, each into its own tab ("Applications"
 * / "Enquiries") with columns matching what that form actually collects,
 * rather than one giant sparse table. Both go through the same anti-spam
 * checks (honeypot + submit-speed) and the same formula-injection sanitizing
 * before hitting the sheet.
 *
 * NEW: every enquiry/application is also sent to VidyaOS (Enquiry & CRM,
 * lead source "Website") — see the "VIDYAOS SYNC" section at the bottom.
 * The form handling below is the original code; the only changes are two
 * one-line calls to vosInstantSync_() just before each handler returns.
 *
 * SETUP:
 * 1. Open the Google Sheet where submissions land.
 * 2. Extensions > Apps Script. Select ALL the existing code, delete it, and
 *    paste this whole file in.
 * 3. (Optional — confirmation emails.) Emails are sent with Resend from
 *    timestampindia.tech (already set up in DNS). In Resend: confirm the
 *    domain shows "Verified", then API Keys > Create API Key (Sending access)
 *    and paste it over REPLACE_WITH_YOUR_RESEND_API_KEY below. Until a key is
 *    pasted, no emails are sent (the VidyaOS lead sync does not need it).
 * 4. Project Settings (gear icon) > Script properties > add:
 *      ENDPOINT = https://visionpu-erp.vercel.app/api/leads/website
 *      TOKEN    = (the lead-sync token you were given)
 * 5. Save. In the function drop-down choose  vosSetup  and press Run;
 *    approve the permissions. This creates the 1-minute backup timer and
 *    sends every existing row once.
 * 6. Deploy > Manage deployments > pencil icon > Version: "New version" >
 *    Deploy. (The /exec URL does not change, so the website keeps working.)
 * 7. Submit a test enquiry on the website. A new "VidyaOS sync" column in the
 *    sheet says "Synced ..." and the lead appears in VidyaOS under
 *    Enquiry & CRM with source "Website".
 */

const RESEND_API_KEY = 'REPLACE_WITH_YOUR_RESEND_API_KEY'
const ADMIN_EMAILS = ['admissions@visionedu.in', 'pavithra@visionedu.in']
const SEND_AS = 'no-reply@timestampindia.tech' // emails are sent FROM this address; its domain must be verified in Resend
const SEND_AS_NAME = 'Vision Admissions'
const REPLY_TO = 'admissions@visionedu.in' // when a parent replies, it goes to the college, not to timestampindia.tech

const APPLY_SHEET_NAME = 'Applications'
const APPLY_COLUMNS = [
  'Timestamp',
  'Reference Number',
  'Applying For',
  'Branch',
  'Student Name',
  'Gender',
  'Address',
  'District',
  'Student Phone',
  'Student Email',
  "Father's Phone",
  "Father's Email",
  "Mother's Phone",
  "Mother's Email",
  'Stream',
  'Board',
  '10th Marks (%)',
  'Day Scholar or Hostel',
  'Course Duration',
  'NEET Score',
  'Degree Program',
  'PUC/12th Marks (%)',
  'How Heard About Us',
  'Employee Name',
]

const ENQUIRY_SHEET_NAME = 'Enquiries'
const ENQUIRY_COLUMNS = [
  'Timestamp',
  'Source',
  'Student Name',
  'Gender',
  'Phone',
  'Course/Program',
  'Board',
  '10th Marks (%)',
  'Email',
]

function sanitizeCell(value) {
  // Google Sheets evaluates a cell as a formula if it starts with =, +, -, or
  // @ — prefixing with a leading apostrophe forces it to stay literal text,
  // closing off spreadsheet formula injection from untrusted form input.
  if (typeof value !== 'string') return value
  return /^[=+\-@]/.test(value) ? "'" + value : value
}

function isValidPhone(value) {
  return typeof value === 'string' && /^[0-9+\-\s()]{7,15}$/.test(value)
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// Mirrors the conditional-required logic in src/data/applyFields.js — a PU
// applicant should never be able to skip 10th marks, a Degree applicant
// should never be able to skip PUC marks, etc. The site's own form already
// enforces this, but this endpoint is public, so anyone posting to it
// directly (bypassing the site) could otherwise leave these blank — which
// breaks the calling team's follow-up workflow.
function missingRequiredApplyFields(data) {
  const missing = []
  const require = (field, label) => {
    if (!data[field]) missing.push(label)
  }

  require('programType', 'Applying For')
  require('studentName', 'Student Name')
  require('gender', 'Gender')
  require('studentPhone', 'Student Phone')
  require('fatherPhone', "Father's Phone")
  require('hearAboutUs', 'How Heard About Us')

  if (data.programType === 'PU College') {
    require('stream', 'Stream')
    require('board', 'Board')
    require('tenthMarks', '10th Marks (%)')
    require('residency', 'Day Scholar or Hostel')
  } else if (data.programType === 'NEET Academy') {
    require('courseDuration', 'Course Duration')
    require('neetScore', 'NEET Score')
    require('residency', 'Day Scholar or Hostel')
  } else if (data.programType === 'Degree') {
    require('degreeProgram', 'Degree Program')
    require('puc12Marks', 'PUC/12th Marks (%)')
  }

  if (data.hearAboutUs === 'Employee of Vision') {
    require('employeeName', 'Employee Name')
  }

  return missing
}

// PU splits into Pu (Science streams) and Commerce, since the calling team
// tracks those as separate categories even though they're one program type
// on the form.
function categoryFor(data) {
  if (data.programType === 'Degree') return 'Degree'
  if (data.programType === 'NEET Academy') return 'Neet'
  if (data.programType === 'PU College') {
    return typeof data.stream === 'string' && data.stream.indexOf('Commerce') === 0 ? 'Commerce' : 'Pu'
  }
  return 'General'
}

// V-<year>/<category>-<seq>, e.g. V-2026/Pu-001 — seq is how many
// applications in that category+year already exist on the sheet, so it's
// always the true Nth entry regardless of how many other categories were
// submitted in between. Generated here (not client-side) so it reflects
// what's actually on the sheet, and only after validation passes so a
// rejected or bot submission never consumes a number.
function nextReferenceNumber(sheet, category) {
  const year = new Date().getFullYear()
  const prefix = `V-${year}/${category}-`
  const lastRow = sheet.getLastRow()
  let count = 0
  if (lastRow > 1) {
    const refs = sheet.getRange(2, 2, lastRow - 1, 1).getValues() // column B: Reference Number
    refs.forEach((row) => {
      if (typeof row[0] === 'string' && row[0].indexOf(prefix) === 0) count++
    })
  }
  return prefix + String(count + 1).padStart(3, '0')
}

function tooLong(data) {
  for (const key in data) {
    if (typeof data[key] === 'string' && data[key].length > 500) return key
  }
  return null
}

// Returns the named tab, creating it (with a header row) if it doesn't
// exist yet. The very first submission ever (before any tab is named
// "Applications") reuses the spreadsheet's original first sheet instead of
// leaving it as an empty orphan tab alongside a new one.
function getOrCreateSheet(name, columns) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(name)
  if (!sheet) {
    const sheets = ss.getSheets()
    const defaultFirstSheet = sheets.length === 1 && sheets[0].getLastRow() === 0 ? sheets[0] : null
    sheet = defaultFirstSheet || ss.insertSheet(name)
    sheet.setName(name)
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(columns)
  }
  return sheet
}

// Emails are collected while a submission is handled and sent in ONE request at the end. Resend allows
// only ~2 requests per second, so three separate calls (two admins + the applicant) would be refused.
const OUTBOX = []

function sendEmail(toEmail, subject, body) {
  OUTBOX.push({
    from: `${SEND_AS_NAME} <${SEND_AS}>`,
    to: [toEmail],
    reply_to: REPLY_TO,
    subject: subject,
    text: body,
  })
}

function flushEmails() {
  const batch = OUTBOX.splice(0, OUTBOX.length)
  if (RESEND_API_KEY === 'REPLACE_WITH_YOUR_RESEND_API_KEY' || batch.length === 0) return
  UrlFetchApp.fetch('https://api.resend.com/emails/batch', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    payload: JSON.stringify(batch),
    muteHttpExceptions: true, // so a bad API key shows up in Executions instead of throwing silently
  })
}

// An email problem must never turn an already-saved submission into a "failed" one on the website.
function flushEmailsSafely() {
  try {
    flushEmails()
  } catch (err) {
    console.error('Email send failed: ' + err)
  }
}

function handleApply(data, respond) {
  const missing = missingRequiredApplyFields(data)
  if (missing.length > 0) {
    return respond({ success: false, error: 'Missing required fields: ' + missing.join(', ') })
  }
  if (!isValidPhone(data.studentPhone)) {
    return respond({ success: false, error: 'Invalid phone number' })
  }
  if (data.studentEmail && !isValidEmail(data.studentEmail)) {
    return respond({ success: false, error: 'Invalid email address' })
  }
  const longField = tooLong(data)
  if (longField) {
    return respond({ success: false, error: 'Field too long: ' + longField })
  }

  // Locked so two near-simultaneous submissions in the same category can
  // never read the same count and be handed the same reference number.
  const lock = LockService.getScriptLock()
  lock.waitLock(30000)
  const sheet = getOrCreateSheet(APPLY_SHEET_NAME, APPLY_COLUMNS)
  let referenceNumber
  try {
    referenceNumber = nextReferenceNumber(sheet, categoryFor(data))

    sheet.appendRow(
      [
        new Date(),
        referenceNumber,
        data.programType || '',
        data.branch || 'Bangalore',
        data.studentName || '',
        data.gender || '',
        data.address || '',
        data.district || '',
        data.studentPhone || '',
        data.studentEmail || '',
        data.fatherPhone || '',
        data.fatherEmail || '',
        data.motherPhone || '',
        data.motherEmail || '',
        data.stream || '',
        data.board || '',
        data.tenthMarks || '',
        data.residency || '',
        data.courseDuration || '',
        data.neetScore || '',
        data.degreeProgram || '',
        data.puc12Marks || '',
        data.hearAboutUs || '',
        data.employeeName || '',
      ].map(sanitizeCell)
    )
  } finally {
    lock.releaseLock()
  }

  const lastRow = sheet.getLastRow()
  const summaryLines = APPLY_COLUMNS.slice(1)
    .map((label, i) => `${label}: ${sheet.getRange(lastRow, i + 2).getValue()}`)
    .join('\n')

  ADMIN_EMAILS.forEach((adminEmail) => {
    sendEmail(
      adminEmail,
      `New Application ${referenceNumber} — ${data.studentName} (${data.programType})`,
      `A new application was submitted.\n\n${summaryLines}`
    )
  })

  if (data.studentEmail) {
    sendEmail(
      data.studentEmail,
      `Application Received — Reference Number ${referenceNumber}`,
      `Dear ${data.studentName},\n\n` +
        `Thank you for applying to Vision — your application for ${data.programType} has been received.\n\n` +
        `Your application reference number is: ${referenceNumber}\n\n` +
        `Please quote this reference number in any future correspondence with our admissions team.\n\n` +
        `We will contact you shortly at the phone number you provided.\n\n` +
        `Regards,\nVision Admissions Team\n080 471 85111`
    )
  }

  flushEmailsSafely()
  vosInstantSync_() // VidyaOS: send this new application right away (never blocks or breaks the form)
  return respond({ success: true, referenceNumber: referenceNumber })
}

function handleEnquiry(data, respond) {
  if (!data.studentName || !data.phone) {
    return respond({ success: false, error: 'Missing required fields' })
  }
  if (!isValidPhone(data.phone)) {
    return respond({ success: false, error: 'Invalid phone number' })
  }
  if (data.email && !isValidEmail(data.email)) {
    return respond({ success: false, error: 'Invalid email address' })
  }
  const longField = tooLong(data)
  if (longField) {
    return respond({ success: false, error: 'Field too long: ' + longField })
  }

  const sheet = getOrCreateSheet(ENQUIRY_SHEET_NAME, ENQUIRY_COLUMNS)

  sheet.appendRow(
    [
      new Date(),
      data.source || '',
      data.studentName || '',
      data.gender || '',
      data.phone || '',
      data.courseProgram || '',
      data.board || '',
      data.marks || '',
      data.email || '',
    ].map(sanitizeCell)
  )

  ADMIN_EMAILS.forEach((adminEmail) => {
    sendEmail(
      adminEmail,
      `New Enquiry — ${data.studentName} (${data.source || 'Website'})`,
      `A new enquiry was submitted.\n\n` +
        `Source: ${data.source || ''}\n` +
        `Student Name: ${data.studentName || ''}\n` +
        `Gender: ${data.gender || ''}\n` +
        `Phone: ${data.phone || ''}\n` +
        `Course/Program: ${data.courseProgram || ''}\n` +
        `Board: ${data.board || ''}\n` +
        `10th Marks (%): ${data.marks || ''}\n` +
        `Email: ${data.email || ''}`
    )
  })

  flushEmailsSafely()
  vosInstantSync_() // VidyaOS: send this new enquiry right away (never blocks or breaks the form)
  return respond({ success: true })
}

function doPost(e) {
  const respond = (obj) =>
    ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)

  try {
    const data = JSON.parse(e.postData.contents)

    // Honeypot field: real visitors never see or fill it (hidden off-screen).
    // A bot that auto-fills every field will trip it. Pretend success so the
    // bot doesn't adapt, but don't actually write anything.
    if (data.website) {
      return respond({ success: true, referenceNumber: data.referenceNumber || '' })
    }
    // Same idea for a submission completed implausibly fast (real visitors
    // take at least a few seconds to fill even the short enquiry form).
    if (typeof data.elapsedMs === 'number' && data.elapsedMs < 3000) {
      return respond({ success: true, referenceNumber: data.referenceNumber || '' })
    }

    if (data.formType === 'enquiry') {
      return handleEnquiry(data, respond)
    }
    return handleApply(data, respond)
  } catch (err) {
    return respond({ success: false, error: String(err) })
  }
}

// ============================================================================
// VIDYAOS SYNC — pushes every enquiry/application into VidyaOS (Enquiry & CRM,
// lead source "Website"). Both tabs are handled:
//   • Enquiries    (short callback forms)
//   • Applications (full /apply form)
// Each row gets a "VidyaOS sync" cell with the result. A 1-minute timer
// (created by vosSetup) is the safety net if an instant send ever fails.
// All names start with vos / VOS_ so they cannot clash with the code above.
// ============================================================================

// Used by the two form handlers above. Any problem here is logged and swallowed so a lead is never lost
// and the website form never shows an error because of the sync.
const VOS_INSTANT = true; // set to false to rely on the 1-minute timer only
function vosInstantSync_() {
  if (!VOS_INSTANT) return;
  try { vosSyncNewLeads(8000); } catch (err) { console.error('VidyaOS sync: ' + err); }
}

const VOS_BATCH = 25;
const VOS_SYNC_COLUMN = 'VidyaOS sync';

// Column titles exactly as your website script writes them.
const VOS_TABS = [
  {
    tab: 'Enquiries',
    name: ['Student Name'], phone: ['Phone'], email: ['Email'],
    course: ['Course/Program'], campaign: ['Source'], campaignFallback: 'Enquiry form',
    ref: function (get) { return 'ENQ:' + get.stamp() + ':' + get.digits('Phone'); },
  },
  {
    tab: 'Applications',
    name: ['Student Name'], phone: ['Student Phone'], email: ['Student Email'],
    course: ['Applying For', 'Stream', 'Degree Program'], campaign: [], campaignFallback: 'Application form',
    message: function (get) { return 'Application ' + get.text('Reference Number') + ' — ' + get.text('Applying For'); },
    ref: function (get) { return 'APP:' + (get.text('Reference Number') || get.stamp() + ':' + get.digits('Student Phone')); },
  },
];

function vosSetup() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('ENDPOINT') || !p.getProperty('TOKEN')) {
    throw new Error('First add ENDPOINT and TOKEN under Project Settings → Script properties.');
  }
  // remove only OUR old triggers, never anything belonging to the website script
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'vosSyncNewLeads') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('vosSyncNewLeads').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('vosSyncNewLeads').forSpreadsheet(SpreadsheetApp.getActive()).onChange().create();
  vosSyncNewLeads();
}

// Called by the timers (which pass an event object) and, with a short wait, straight after a form submission.
function vosSyncNewLeads(maxWaitMs) {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('ENDPOINT') || !p.getProperty('TOKEN')) return; // not configured yet
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(typeof maxWaitMs === 'number' ? maxWaitMs : 20000)) return;
  try {
    const ss = SpreadsheetApp.getActive();
    VOS_TABS.forEach(function (cfg) {
      const sheet = ss.getSheetByName(cfg.tab);
      if (sheet) vosSyncTab_(sheet, cfg);
    });
  } finally {
    lock.releaseLock();
  }
}

function vosSyncTab_(sheet, cfg) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  let lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  let syncCol = headers.indexOf(VOS_SYNC_COLUMN) + 1;
  if (!syncCol) { syncCol = lastCol + 1; headers.push(VOS_SYNC_COLUMN); sheet.getRange(1, syncCol).setValue(VOS_SYNC_COLUMN); lastCol = syncCol; }

  const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const pending = [];
  data.forEach(function (row, i) {
    if (String(row[syncCol - 1] || '').trim() !== '') return; // already handled
    const rowNo = i + 2;
    const lead = vosBuildLead_(cfg, headers, row, syncCol);
    if (lead) pending.push({ rowNo: rowNo, lead: lead });
    else if (row.some(function (c) { return String(c).trim() !== ''; })) sheet.getRange(rowNo, syncCol).setValue('Skipped: no name, phone or email');
  });

  for (let i = 0; i < pending.length; i += VOS_BATCH) {
    const chunk = pending.slice(i, i + VOS_BATCH);
    const res = vosPost_({ leads: chunk.map(function (c) { return c.lead; }) });
    if (!res) return; // server/network problem: leave the rows blank so the next minute retries
    const when = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM HH:mm');
    res.results.forEach(function (r) {
      const cell = sheet.getRange(chunk[r.index].rowNo, syncCol);
      if (r.status === 'created') cell.setValue('Synced ' + when + ' · ' + r.enquiry_no);
      else if (r.status === 'duplicate') cell.setValue('Already in VidyaOS · ' + (r.enquiry_no || ''));
      else cell.setValue('Invalid: ' + (r.error || 'unreadable'));
    });
  }
}

function vosBuildLead_(cfg, headers, row, syncCol) {
  const norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); };
  const idx = function (title) { return headers.map(norm).indexOf(norm(title)); };
  const cellText = function (title) {
    const i = idx(title); if (i < 0) return '';
    const v = row[i];
    if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm');
    return String(v == null ? '' : v).trim();
  };
  const first = function (titles) { for (let k = 0; k < titles.length; k++) { const t = cellText(titles[k]); if (t) return t; } return ''; };
  const get = {
    text: cellText,
    digits: function (title) { return cellText(title).replace(/\D/g, ''); },
    stamp: function () { const v = row[idx('Timestamp')]; return v instanceof Date ? Utilities.formatDate(v, 'UTC', 'yyyyMMddHHmmss') : String(v || ''); },
  };

  const lead = {
    name: first(cfg.name), phone: first(cfg.phone), email: first(cfg.email),
    course: cfg.course.map(cellText).filter(Boolean).join(' · '),
    campaign: (cfg.campaign.length ? first(cfg.campaign) : '') || cfg.campaignFallback,
    message: cfg.message ? cfg.message(get) : '', external_id: cfg.ref(get), extra: {},
  };
  const used = {};
  [cfg.name, cfg.phone, cfg.email, cfg.course, cfg.campaign].forEach(function (list) { list.forEach(function (t) { used[norm(t)] = true; }); });
  headers.forEach(function (h, i) {
    if (!h || i === syncCol - 1 || used[norm(h)]) return;
    const t = cellText(h); if (t) lead.extra[h] = t;
  });
  return (lead.name || lead.phone || lead.email) ? lead : null;
}

function vosPost_(payload) {
  const p = PropertiesService.getScriptProperties();
  const resp = UrlFetchApp.fetch(p.getProperty('ENDPOINT'), {
    method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + p.getProperty('TOKEN') },
    payload: JSON.stringify(payload), muteHttpExceptions: true,
  });
  const code = resp.getResponseCode();
  if (code === 200) return JSON.parse(resp.getContentText());
  if (code === 401) throw new Error('VidyaOS rejected the TOKEN. Check Script properties.');
  console.error('VidyaOS returned ' + code + ': ' + resp.getContentText().slice(0, 300));
  return null;
}
