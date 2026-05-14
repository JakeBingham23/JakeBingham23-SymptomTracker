// ═════════════════════════════════════════════════════════════════
// GCAL SYNC — Daily Structure Tracker v5
// Two-way sync: push local appointments → Google Calendar,
//               pull Google Calendar events → local.
// Tracker-created events are tagged via extendedProperties so they
// can be identified and updated without creating duplicates.
// Load order: after gcal/auth.js
// ═════════════════════════════════════════════════════════════════

const GCAL_API        = 'https://www.googleapis.com/calendar/v3';
const GCAL_SOURCE_TAG = 'daily-structure-tracker';
const GCAL_LOOKAHEAD  = 90; // days ahead to pull

// ── Core API helper ───────────────────────────────────────────────────────
async function gcalRequest(method, path, body) {
  const token = await gcalEnsureToken();
  const url   = path.startsWith('http') ? path : GCAL_API + path;
  const opts  = {
    method,
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (res.status === 401) { gcalClearToken(); throw new Error('GCal token expired'); }
  if (res.status === 204) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error?.message) || 'GCal API error ' + res.status);
  }
  return res.json();
}

// ── Local appointment storage ─────────────────────────────────────────────
// Appointments are stored separately from the daily state object so they
// survive across days and can be synced independently.
// loadAppts() and saveAppts() are defined in render.js.
// Removed local copies that used wrong storage key ('tracker-appointments').
// The shared key is 'tracker-appts'.

// ── Converters ────────────────────────────────────────────────────────────
function apptToGcalEvent(appt) {
  const start = new Date(appt.datetime);
  const end   = new Date(start.getTime() + 60 * 60 * 1000); // default 1hr
  const tz    = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    summary:     appt.title || 'untitled',
    location:    appt.location    || '',
    description: appt.notes       || '',
    start: { dateTime: start.toISOString(), timeZone: tz },
    end:   { dateTime: end.toISOString(),   timeZone: tz },
    extendedProperties: {
      private: {
        trackerSource:  GCAL_SOURCE_TAG,
        trackerId:      appt.id,
        trackerUpdated: appt.updated || appt.created || new Date().toISOString(),
      },
    },
  };
}

function gcalEventToAppt(event) {
  return {
    id:       event.extendedProperties?.private?.trackerId || ('gcal_' + event.id),
    gcalId:   event.id,
    title:    event.summary      || 'untitled',
    datetime: event.start.dateTime || event.start.date,
    location: event.location     || '',
    notes:    event.description  || '',
    remind24: true,
    remind1:  true,
    created:  event.created,
    updated:  event.updated,
    fromGcal: true,
  };
}

// ── Push one appointment ──────────────────────────────────────────────────
async function gcalPushAppt(appt) {
  const calId = cfg.gcal?.calendarId || 'primary';
  const body  = apptToGcalEvent(appt);
  if (appt.gcalId) {
    return gcalRequest('PATCH',
      `/calendars/${encodeURIComponent(calId)}/events/${appt.gcalId}`, body);
  }
  return gcalRequest('POST',
    `/calendars/${encodeURIComponent(calId)}/events`, body);
}

// ── Pull all upcoming events ──────────────────────────────────────────────
async function gcalPullAllEvents() {
  const calId   = cfg.gcal?.calendarId || 'primary';
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + GCAL_LOOKAHEAD * 86400000).toISOString();
  const params  = new URLSearchParams({
    timeMin, timeMax, singleEvents: 'true',
    orderBy: 'startTime', maxResults: '250',
  });
  const data = await gcalRequest('GET',
    `/calendars/${encodeURIComponent(calId)}/events?` + params);
  return data?.items || [];
}

// ── Full two-way sync ─────────────────────────────────────────────────────
async function gcalSyncFull() {
  if (!gcalGetToken()) return;
  gcalSetSyncStatus('syncing…');

  try {
    const localAppts  = loadAppts();
    const updatedLocal = [];

    // 1. Push local → Google (create or patch)
    for (const appt of localAppts) {
      try {
        const result = await gcalPushAppt(appt);
        updatedLocal.push(result?.id
          ? { ...appt, gcalId: result.id, updated: result.updated }
          : appt);
      } catch(e) {
        console.warn('Failed to push appt', appt.id, e);
        updatedLocal.push(appt);
      }
    }

    // 2. Pull Google → local (only events not already tracked)
    const gcalEvents   = await gcalPullAllEvents();
    const localGcalIds = new Set(updatedLocal.map(a => a.gcalId).filter(Boolean));
    const localIds     = new Set(updatedLocal.map(a => a.id));

    for (const event of gcalEvents) {
      // Skip events we already own
      if (localGcalIds.has(event.id)) continue;
      // Skip all-day events — no time component, not useful for appointment tracking
      if (!event.start.dateTime) continue;
      const appt = gcalEventToAppt(event);
      if (!localIds.has(appt.id)) {
        updatedLocal.push(appt);
        localIds.add(appt.id);
      }
    }

    // 3. Sort by datetime and persist
    updatedLocal.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    saveAppts(updatedLocal);

    // 4. Update sync timestamp
    cfg.gcal.lastSync = new Date().toISOString();
    saveConfig(cfg);

    gcalSetSyncStatus('synced ✓');
    gcalUpdateUI();

    if (typeof renderHistory         === 'function') renderHistory();
    if (typeof updateNextApptBanner  === 'function') updateNextApptBanner();

    if (typeof showToast === 'function')
      showToast('Calendar synced — ' + updatedLocal.length + ' appointment' +
                (updatedLocal.length !== 1 ? 's' : ''));

  } catch(err) {
    console.error('GCal sync failed:', err);
    gcalSetSyncStatus('sync failed');
    if (typeof showToast === 'function') showToast('Calendar sync failed: ' + err.message);
  }
}

// ── Silent background sync triggered on saveAll() ────────────────────────
function gcalSyncOnSave() {
  if (!gcalGetToken()) return;
  gcalSyncFull().catch(e => console.warn('Background gcal sync:', e));
}

// ── Status indicator ──────────────────────────────────────────────────────
function gcalSetSyncStatus(text) {
  const el = document.getElementById('gcalSyncStatus');
  if (el) el.textContent = text;
}
