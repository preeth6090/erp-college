/**
 * VidyaOSSync.gs — pushes website leads from this spreadsheet into VidyaOS.
 *
 * Add this as a NEW FILE in the spreadsheet's existing Apps Script project (the "+" next to Files → Script).
 * It does not touch your website form script (doPost etc.) and every name here starts with "vos" / "VOS_"
 * so it cannot clash with it. Both tabs are handled:
 *   • Enquiries    (short callback forms)  → Enquiry & CRM, lead source "Website"
 *   • Applications (full /apply form)      → Enquiry & CRM, lead source "Website", tagged "Application form"
 *
 * New rows are sent within about a minute. Each row gets a "VidyaOS sync" cell showing the result.
 *
 * Setup — see docs/website-leads.md:
 *   1. Project Settings (gear) → Script properties → add ENDPOINT and TOKEN.
 *   2. Run  vosSetup  once and approve the permissions.
 */
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

function vosSyncNewLeads() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
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
