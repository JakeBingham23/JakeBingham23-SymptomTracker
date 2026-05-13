// ═════════════════════════════════════════════════════════════════
// RENDER MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Onboarding ────────────────────────────────────────────────────────────
// ── Modal keyboard trap (Escape closes, Tab stays inside) ────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!document.getElementById('previewOverlay').classList.contains('hidden'))     { closePreview(); return; }
    if (!document.getElementById('apptModalOverlay').classList.contains('hidden'))   { closeApptModal(); return; }
    if (!document.getElementById('summaryModalOverlay').classList.contains('hidden')){ closeSummaryModal(); return; }
    const ddg = document.getElementById('ddgImageOverlay');
    if (ddg && ddg.style.display !== 'none') { ddg.remove(); return; }
  }
});

function initOnboarding() {
  applyTheme(cfg.theme || 'system');
  updateNavThemeBtn(cfg.theme || 'system');
  updateIntervalPill(cfg.reminderInterval || '30');
  updateWindowTimer();
  renderDailyCard();
  syncNotifPrefsUI();
  syncAudioUI();
  applyA11yPrefs();
  syncQuoteSettingsUI();
  syncDNDUI();
  renderDNDWindows();
  renderBucketLimitSettings();
  if (!cfg.name) {
    document.getElementById('onboarding').classList.remove('hidden');
    setTimeout(() => document.getElementById('nameInput').focus(), 100);
  } else {
    applyName(cfg.name);
    loadState();
    renderCustomTimersWidget();
    updateNextApptBanner();
    setTimeout(() => loadQuoteOfDay(), 500);
  }
}

function completeOnboarding() {
  const name = document.getElementById('nameInput').value.trim();
  if (!name) { document.getElementById('nameInput').focus(); return; }
  cfg.name = name;
  saveConfig(cfg);
  document.getElementById('onboarding').classList.add('hidden');
  applyName(name);
  loadState();
}

function applyName(name) {
  document.getElementById('headerTitle').textContent = name ? name + ' — daily check-in' : 'daily check-in';
}

// ── Settings panel ────────────────────────────────────────────────────────
// ── Tab navigation ────────────────────────────────────────────────────────
function switchTab(tab) {
  const tabNames = { today: 'Today', history: 'Log and appointments', stats: 'Stats', budget: 'Budget', journal: 'Journal' };
  ['today','history','stats','budget','journal'].forEach(t => {
    const tabEl  = document.getElementById('tab-' + t);
    const pageEl = document.getElementById('page-' + t);
    if (!tabEl || !pageEl) return;
    const active = t === tab;
    tabEl.classList.toggle('active', active);
    tabEl.setAttribute('aria-selected', active ? 'true' : 'false');
    pageEl.classList.toggle('active', active);
    pageEl.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
  announce((tabNames[tab] || tab) + ' tab.');
  if (tab === 'history')  renderHistory();
  if (tab === 'stats')    renderStats();
  if (tab === 'budget')   renderBudgetTab();
  if (tab === 'journal')  renderJournalList();
}

// ── Appointments data ────────────────────────────────────────────────────
function loadAppts() {
  try { return JSON.parse(localStorage.getItem('tracker-appts') || '[]'); } catch(e) { return []; }
}
function saveAppts(appts) {
  try { localStorage.setItem('tracker-appts', JSON.stringify(appts)); } catch(e) {}
}

function openApptModal(id) {
  const overlay = document.getElementById('apptModalOverlay');
  document.getElementById('apptModalTitle').textContent = id ? '// edit appointment' : '// new appointment';
  document.getElementById('apptEditId').value = id || '';
  if (id) {
    const appt = loadAppts().find(a => a.id === id);
    if (appt) {
      document.getElementById('apptTitle').value    = appt.title || '';
      document.getElementById('apptDateTime').value = appt.datetime || '';
      document.getElementById('apptLocation').value = appt.location || '';
      document.getElementById('apptNotes').value    = appt.notes || '';
      document.getElementById('apptReminder24').checked = appt.remind24 !== false;
      document.getElementById('apptReminder1').checked  = appt.remind1  !== false;
    }
  } else {
    document.getElementById('apptTitle').value    = '';
    document.getElementById('apptDateTime').value = '';
    document.getElementById('apptLocation').value = '';
    document.getElementById('apptNotes').value    = '';
    document.getElementById('apptReminder24').checked = true;
    document.getElementById('apptReminder1').checked  = true;
  }
  overlay.classList.remove('hidden');
  // Focus first input for keyboard/VoiceOver users
  setTimeout(() => {
    const firstInput = document.getElementById('apptTitle');
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeApptModal() {
  document.getElementById('apptModalOverlay').classList.add('hidden');
  // Return focus to the trigger element
  const addBtn = document.querySelector('button[onclick="openApptModal()"]');
  if (addBtn) addBtn.focus();
}

function saveAppt() {
  const title    = document.getElementById('apptTitle').value.trim();
  const datetime = document.getElementById('apptDateTime').value;
  if (!title || !datetime) { showToast('title and date/time required'); return; }
  const appts = loadAppts();
  const editId = document.getElementById('apptEditId').value;
  const appt = {
    id:       editId || 'appt_' + Date.now(),
    title,
    datetime,
    location: document.getElementById('apptLocation').value.trim(),
    notes:    document.getElementById('apptNotes').value.trim(),
    remind24: document.getElementById('apptReminder24').checked,
    remind1:  document.getElementById('apptReminder1').checked,
    created:  new Date().toISOString()
  };
  if (editId) {
    const idx = appts.findIndex(a => a.id === editId);
    if (idx > -1) appts[idx] = appt; else appts.push(appt);
  } else {
    appts.push(appt);
  }
  // Sort by datetime
  appts.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  saveAppts(appts);
  closeApptModal();
  scheduleApptReminders(appt);
  renderHistory();
  updateNextApptBanner();
}

function deleteAppt(id) {
  const appts = loadAppts().filter(a => a.id !== id);
  saveAppts(appts);
  renderHistory();
  updateNextApptBanner();
}

function apptCountdown(datetime) {
  const diff = new Date(datetime) - new Date();
  if (diff < 0) return { label: 'past', cls: 'overdue' };
  const days  = Math.floor(diff / 86400000);
  const hrs   = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  let label;
  if (days > 1)      label = 'in ' + days + ' days';
  else if (days === 1) label = 'tomorrow, ' + hrs + 'h away';
  else if (hrs > 0)  label = 'in ' + hrs + 'h ' + mins + 'm';
  else               label = 'in ' + mins + ' minutes';
  const cls = diff < 3600000 ? 'soon' : '';
  return { label, cls };
}

function updateNextApptBanner() {
  const banner  = document.getElementById('nextApptBanner');
  const textEl  = document.getElementById('nextApptBannerText');
  const subEl   = document.getElementById('nextApptBannerSub');
  if (!banner) return;
  const upcoming = loadAppts().filter(a => new Date(a.datetime) > new Date());
  if (upcoming.length === 0) { banner.classList.remove('visible'); return; }
  const next = upcoming[0];
  const cd   = apptCountdown(next.datetime);
  textEl.textContent = next.title + ' — ' + cd.label;
  const dt = new Date(next.datetime);
  subEl.textContent  = dt.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })
    + ' at ' + dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  banner.classList.add('visible');
}

function scheduleApptReminders(appt) {
  const prefs = cfg.notifPrefs || {};
  const dt    = new Date(appt.datetime);
  const now   = new Date();
  const name  = cfg.name || 'hey';

  if (appt.remind24 && prefs.apptBrowser !== false) {
    const delay24 = dt - now - 86400000;
    if (delay24 > 0) swSchedule(delay24,
      name + ' — appointment tomorrow',
      appt.title + (appt.location ? ' at ' + appt.location : '') + ' is tomorrow.',
      'appt-24-' + appt.id
    );
  }
  if (appt.remind1 && prefs.apptBrowser !== false) {
    const delay1 = dt - now - 3600000;
    if (delay1 > 0) {
      swSchedule(delay1,
        name + ' — appointment in 1 hour',
        appt.title + (appt.location ? ' at ' + appt.location : '') + ' is in 1 hour.',
        'appt-1-' + appt.id
      );
      setTimeout(() => playAlertSound('appt'), Math.max(0, delay1));
    }
  }
  if (prefs.apptTelegram !== false && cfg.tgToken && cfg.tgChatId) {
    if (appt.remind24 && dt - now - 86400000 > 0) {
      setTimeout(() => sendTelegramMessage(
        '📅 Reminder: ' + appt.title + ' is tomorrow at ' +
        new Date(appt.datetime).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
      ), Math.max(0, dt - now - 86400000));
    }
  }
}

// ── Pre-appointment summary ───────────────────────────────────────────────
function generateSummary(apptTitle) {
  const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
  const last7   = history.slice(0, 7);
  const name    = cfg.name || 'Patient';
  const today   = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });

  if (last7.length === 0) return 'No check-in data available yet.\nStart logging daily check-ins to generate a summary.';

  const avgDone  = last7.length > 0
    ? (last7.reduce((s,e) => s + (e.done / (e.total || 1)), 0) / last7.length * 100).toFixed(0) : '—';
  const moods    = last7.map(e => e.mood).filter(Boolean);
  const energies = last7.map(e => e.energy).filter(Boolean);
  const totalFlags = last7.reduce((s, e) => s + (e.flags || 0), 0);

  // Pull symptom flags from individual day states
  const flagCounts = {};
  last7.forEach(e => {
    try {
      const day = JSON.parse(localStorage.getItem('tracker-' + e.date) || '{}');
      (day.symptoms || []).forEach(s => { flagCounts[s] = (flagCounts[s] || 0) + 1; });
    } catch(_) {}
  });
  const topFlags = Object.entries(flagCounts)
    .sort((a,b) => b[1]-a[1]).slice(0,5)
    .map(([s,n]) => s + ' (' + n + 'x)').join(', ');

  const moodSummary    = moods.length    ? moods.join(', ')    : 'not recorded';
  const energySummary  = energies.length ? energies.join(', ') : 'not recorded';

  const dailyLines = last7.map(e =>
    e.date + ' - ' + e.done + '/' + e.total + ' tasks' +
    ', mood: ' + (e.mood || '-') +
    ', energy: ' + (e.energy || '-') +
    (e.flags > 0 ? ', flags: ' + e.flags : '')
  ).join('\n');

  return [
    'PRE-APPOINTMENT SUMMARY',
    'Generated: ' + today,
    'Patient: ' + name,
    'Appointment: ' + apptTitle,
    '',
    'LAST ' + last7.length + ' DAYS',
    '',
    'Task completion: ' + avgDone + '% average',
    'Mood (recent): ' + moodSummary,
    'Energy (recent): ' + energySummary,
    'Total symptom flags: ' + totalFlags + ' across ' + last7.length + ' days',
    topFlags ? 'Most frequent symptoms: ' + topFlags : '',
    '',
    'DAILY LOG',
    dailyLines,
    '',
    '---',
    'Generated by Daily Structure Tracker'
  ].join('\n');
}

function showSummary(apptId) {
  const appt = loadAppts().find(a => a.id === apptId);
  const text = generateSummary(appt ? appt.title : 'appointment');
  document.getElementById('summaryText').textContent = text;
  document.getElementById('summaryModalOverlay').classList.remove('hidden');
  earnBadge('appointment');
}

function closeSummaryModal() {
  document.getElementById('summaryModalOverlay').classList.add('hidden');
}

async function shareSummary() {
  const text = document.getElementById('summaryText').textContent;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Pre-appointment summary', text });
      return;
    } catch(e) {}
  }
  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text);
    showToast('summary copied to clipboard');
  } catch(e) {
    showToast('select all text and copy manually');
  }
}

// ── renderHistory — now includes appointments ─────────────────────────────
function renderHistory() {
  const el     = document.getElementById('historyList');
  const dateEl = document.getElementById('historyDateDisplay');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });

  // Render appointments
  const apptEl = document.getElementById('apptList');
  if (!apptEl) return;
  const appts    = loadAppts();
  const upcoming = appts.filter(a => new Date(a.datetime) >= new Date());
  const past     = appts.filter(a => new Date(a.datetime) <  new Date());

  apptEl.innerHTML = upcoming.length === 0
    ? `<div style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text3);margin-bottom:8px">no upcoming appointments</div>`
    : upcoming.map((a, i) => {
        const cd = apptCountdown(a.datetime);
        const dt = new Date(a.datetime);
        const dtStr = dt.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })
          + ' ' + dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        return `<div class="appt-card ${i === 0 ? 'next' : ''}">
          <div class="appt-top">
            <div class="appt-title">${escHtml(a.title)}</div>
            <div class="appt-actions">
              <button class="appt-btn" onclick="openApptModal('${a.id}')">edit</button>
              <button class="appt-btn danger" onclick="deleteAppt('${a.id}')">✕</button>
            </div>
          </div>
          <div class="appt-meta">${dtStr}${a.location ? ' · ' + escHtml(a.location) : ''}</div>
          <div class="appt-countdown ${cd.cls}">${cd.label}</div>
          ${a.notes ? `<div class="appt-notes">${escHtml(a.notes)}</div>` : ''}
          <button class="appt-summary-btn" onclick="showSummary('${a.id}')">📋 generate pre-appointment summary</button>
        </div>`;
      }).join('');

  // Render check-in history
  try {
    if (!el) return;
    const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
    el.innerHTML = history.length === 0
      ? `<div style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text3);padding:8px 0">no entries yet — save a check-in on the today tab</div>`
      : history.map(e => `
        <div class="history-entry">
          <div class="history-entry-top">
            <span class="history-date">${e.date}</span>
            <span>${e.done}/${e.total} tasks</span>
            ${e.flags > 0 ? `<span class="history-flags">⚑ ${e.flags} flag${e.flags > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="history-meta">
            <span>mood: ${e.mood || '—'}</span>
            <span>energy: ${e.energy || '—'}</span>
          </div>
        </div>
      `).join('');
  } catch(e) { el.textContent = 'error loading history'; }
}

function renderStats() {
  document.getElementById('bigStreak').textContent = state.medStreak || 0;
  renderPointsDisplay(true);  // announces to screen readers
  renderBadges();
  renderFavQuotes();
  renderWeeklySummaryCard();
  renderMonthlySummaryCard();
  renderSpendMoodCorrelation();
  try {
    const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
    document.getElementById('bigDaysLogged').textContent = history.length;
    if (history.length > 0) {
      const avgDone  = (history.reduce((s,e) => s + (e.done / (e.total || 1)), 0) / history.length * 100).toFixed(0);
      const avgFlags = (history.reduce((s,e) => s + e.flags, 0) / history.length).toFixed(1);
      document.getElementById('bigAvgDone').textContent  = avgDone + '%';
      document.getElementById('bigAvgFlags').textContent = avgFlags;
    }
    // Mood timeline — last 14 entries as a simple text chart
    const moodMap = { dark:-3, low:-2, flat:-1, ok:0, good:1, high:2 };
    const timeline = document.getElementById('moodTimeline');
    timeline.innerHTML = history.slice(0,14).reverse().map(e => {
      const score = moodMap[e.mood] ?? null;
      const bar = score === null ? '·' : score >= 1 ? '▮' : score === 0 ? '▯' : '▮';
      const col = score === null ? 'var(--text3)' : score >= 1 ? 'var(--success)' : score === 0 ? 'var(--accent)' : 'var(--danger)';
      return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;font-family:var(--font-mono);font-size:0.6875rem">
        <span style="color:var(--text3);width:80px;flex-shrink:0">${e.date.slice(5)}</span>
        <span style="color:${col};font-size:1rem;letter-spacing:1px">${bar}</span>
        <span style="color:var(--text3)">${e.mood || '—'} / ${e.energy || '—'}</span>
      </div>`;
    }).join('') || '<div style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text3)">no data yet</div>';
  } catch(err) {}
}

function renderSettingsPanel() {
  document.getElementById('settingsName').value = cfg.name || '';
  updateThemePill(cfg.theme || 'system');
  updateIntervalPill(cfg.reminderInterval || '30');
  // Telegram fields
  const tgTokenEl = document.getElementById('tgToken');
  if (tgTokenEl) tgTokenEl.value = cfg.tgToken || '';
  if (cfg.tgChatId) tgStatusMsg('connected ✓ chat ID: ' + cfg.tgChatId, 'var(--success)');
  // Timer fields
  const wct = document.getElementById('windowCloseTime');
  if (wct) wct.value = cfg.windowCloseTime || '';
  renderTaskDeadlineSettings();
  renderCustomTimerSettings();
  syncNotifPrefsUI();

  function taskRows(list, containerId) {
    document.getElementById(containerId).innerHTML = list.map((t, i) => `
      <div class="settings-task-row">
        <input type="text" value="${escHtml(t.name)}" placeholder="task name"
               onchange="updateTask('${containerId}', ${i}, 'name', this.value)">
        <input type="text" class="sub-input" value="${escHtml(t.sub || '')}" placeholder="subtitle (optional)"
               onchange="updateTask('${containerId}', ${i}, 'sub', this.value)">
        <button class="del-btn" onclick="removeTask('${containerId}', ${i})">×</button>
      </div>
    `).join('');
  }

  taskRows(CRITICAL, 'settingsCritical');
  taskRows(DAILY,    'settingsDaily');

  document.getElementById('settingsSymptoms').innerHTML = SYMPTOMS.map((s, i) => `
    <div class="sym-edit-chip">
      <span>${escHtml(s)}</span>
      <button onclick="removeSymptom(${i})">×</button>
    </div>
  `).join('');
}

function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;')
    .replace(/\//g,'&#x2F;');
}

// Sanitise user input — strips dangerous patterns before storage
function sanitiseInput(str, maxLen = 200) {
  if (!str) return '';
  return String(str)
    .trim()
    .slice(0, maxLen)
    // Strip script tags and event handlers
    .replace(/<script[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, '');
}

// Safe number parser — returns 0 for invalid input
function safeFloat(val, min = 0, max = 999999) {
  const n = parseFloat(val);
  if (isNaN(n)) return 0;
  return Math.max(min, Math.min(max, n));
}
