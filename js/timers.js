// ═════════════════════════════════════════════════════════════════
// TIMERS MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Timer utilities ──────────────────────────────────────────────────────

// Returns minutes until a HH:MM time string today (negative = overdue)
function minsUntil(timeStr) {
  if (!timeStr) return null;
  const now  = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  return (target - now) / 60000;
}

function formatCountdown(mins, deadlineStr) {
  if (mins === null) return '';
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = Math.floor(abs % 60);
  const str = h > 0 ? h + 'h ' + m + 'm' : m + 'm';
  const atTime = deadlineStr ? ' (at ' + formatTime12h(deadlineStr) + ')' : '';
  if (mins < 0)   return 'overdue by ' + str + atTime;
  if (mins === 0) return 'due now' + atTime;
  return 'due in ' + str + atTime;
}

function getRingData(timeStr, done) {
  if (done) return { pct: 1, cls: 'complete', label: 'done ✓' };
  const mins = minsUntil(timeStr);
  if (mins === null) return null;
  // Ring fills over a 4-hour window before deadline
  const windowMins = 240;
  const pct = Math.min(1, Math.max(0, 1 - (mins / windowMins)));
  let cls = '';
  if (mins < 0)   cls = 'overdue';
  else if (mins < 30) cls = 'soon';
  return { pct, cls, label: formatCountdown(mins, timeStr) };
}

// ── Window close timer ────────────────────────────────────────────────────
function formatTime12h(timeStr) {
  // Convert HH:MM to 12-hour format e.g. "22:00" → "10:00 PM"
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm  = h >= 12 ? 'PM' : 'AM';
  const hour  = h % 12 || 12;
  return hour + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

function updateWindowTimer() {
  const el = document.getElementById('windowTimer');
  if (!el) return;
  if (!cfg.windowCloseTime) {
    el.textContent = '';
    el.className = 'window-timer';
    return;
  }
  const mins    = minsUntil(cfg.windowCloseTime);
  const timeStr = formatTime12h(cfg.windowCloseTime);
  if (mins === null) return;

  if (mins < 0) {
    el.textContent = 'check-in window closed at ' + timeStr;
    el.className   = 'window-timer closed';
  } else if (mins < 60) {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    const remaining = h > 0 ? h + 'h ' + m + 'm' : m + 'm';
    el.textContent = 'check-in window closes in ' + remaining + ' (at ' + timeStr + ')';
    el.className   = 'window-timer soon';
  } else {
    el.textContent = 'check-in window closes at ' + timeStr;
    el.className   = 'window-timer';
  }
}

// ── Custom timers ─────────────────────────────────────────────────────────
// Each custom timer: { id, name, durationMins, startedAt (ISO) | null }

function renderCustomTimersWidget() {
  const el = document.getElementById('customTimersWidget');
  if (!el) return;
  const timers = cfg.customTimers || [];
  if (timers.length === 0) { el.innerHTML = ''; return; }
  const circumference = 2 * Math.PI * 12;
  el.innerHTML = timers.map(t => {
    let pct = 0, countdown = '', cls = '', canStart = !t.startedAt;
    if (t.startedAt) {
      const elapsed = (Date.now() - new Date(t.startedAt)) / 60000;
      const remaining = t.durationMins - elapsed;
      pct = Math.min(1, elapsed / t.durationMins);
      if (remaining <= 0) {
        countdown = "time's up!"; cls = 'overdue'; pct = 1;
        playAlertSound('timer');
      } else {
        const h = Math.floor(remaining / 60), m = Math.ceil(remaining % 60);
        countdown = h > 0 ? h + 'h ' + m + 'm left' : m + 'm left';
        if (remaining < 5) cls = 'overdue';
        else if (remaining < 15) cls = 'soon';
      }
    } else {
      countdown = t.durationMins >= 60
        ? Math.floor(t.durationMins/60) + 'h ' + (t.durationMins%60||'') + (t.durationMins%60?'m':'')
        : t.durationMins + 'm';
      countdown = countdown.trim() + ' — tap start';
    }
    const dashOffset = circumference * (1 - pct);
    return `<div class="ctimer">
      <div class="ctimer-ring">
        <svg width="28" height="28" viewBox="0 0 28 28" style="transform:rotate(-90deg)">
          <circle class="ring-track" cx="14" cy="14" r="12"/>
          <circle class="ring-fill ${cls}" cx="14" cy="14" r="12"
            stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"/>
        </svg>
      </div>
      <div class="ctimer-info">
        <div class="ctimer-name">${escHtml(t.name)}</div>
        <div class="ctimer-countdown ${cls}">${countdown}</div>
      </div>
      <div class="ctimer-actions">
        ${canStart
          ? `<button class="ctimer-btn" onclick="startCustomTimer('${t.id}')">start</button>`
          : `<button class="ctimer-btn" onclick="resetCustomTimer('${t.id}')">reset</button>`}
        <button class="ctimer-btn danger" onclick="deleteCustomTimer('${t.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}

function addCustomTimer() {
  const name = document.getElementById('newTimerName').value.trim();
  const mins = parseInt(document.getElementById('newTimerMins').value, 10);
  if (!name || !mins || mins < 1) return;
  const id = 'ct_' + Date.now();
  cfg.customTimers.push({ id, name, durationMins: mins, startedAt: null });
  saveConfig(cfg);
  document.getElementById('newTimerName').value = '';
  document.getElementById('newTimerMins').value = '';
  renderCustomTimerSettings();
  renderCustomTimersWidget();
}

function startCustomTimer(id) {
  const t = cfg.customTimers.find(x => x.id === id);
  if (t) { t.startedAt = new Date().toISOString(); saveConfig(cfg); renderCustomTimersWidget(); }
}

function resetCustomTimer(id) {
  const t = cfg.customTimers.find(x => x.id === id);
  if (t) { t.startedAt = null; saveConfig(cfg); renderCustomTimersWidget(); }
}

function deleteCustomTimer(id) {
  cfg.customTimers = cfg.customTimers.filter(x => x.id !== id);
  saveConfig(cfg);
  renderCustomTimerSettings();
  renderCustomTimersWidget();
}

// ── Settings panel timer helpers ──────────────────────────────────────────
function saveWindowTime() {
  cfg.windowCloseTime = document.getElementById('windowCloseTime').value;
  saveConfig(cfg);
  updateWindowTimer();
}

function clearWindowTime() {
  cfg.windowCloseTime = '';
  document.getElementById('windowCloseTime').value = '';
  saveConfig(cfg);
  updateWindowTimer();
}

function renderTaskDeadlineSettings() {
  const el = document.getElementById('taskDeadlineSettings');
  if (!el) return;
  el.innerHTML = CRITICAL.map(t => `
    <div class="settings-task-row" style="margin-bottom:6px">
      <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text2);flex:1">${escHtml(t.name)}</span>
      <input type="time" data-task-id="${t.id}"
        value="${cfg.taskDeadlines[t.id] || ''}"
        onchange="setTaskDeadline('${t.id}', this.value)"
        style="background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-mono);font-size:0.75rem;padding:5px 8px;outline:none">
    </div>
  `).join('');
}

function setTaskDeadline(taskId, timeVal) {
  cfg.taskDeadlines[taskId] = timeVal;
  saveConfig(cfg);
  render();
}

function renderCustomTimerSettings() {
  const el = document.getElementById('customTimerSettings');
  if (!el) return;
  const timers = cfg.customTimers || [];
  el.innerHTML = timers.length === 0
    ? `<div style="font-family:var(--font-mono);font-size:0.625rem;color:var(--text3);margin-bottom:6px">no custom timers yet</div>`
    : timers.map(t => `
      <div class="settings-task-row" style="margin-bottom:6px">
        <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text2);flex:1">${escHtml(t.name)} (${t.durationMins}m)</span>
        <button class="del-btn" onclick="deleteCustomTimer('${t.id}')">×</button>
      </div>
    `).join('');
}

// ── 1-second tick for live timer updates ─────────────────────────────────
setInterval(() => {
  updateWindowTimer();
  renderCustomTimersWidget();
  updateNextApptBanner();
  if (Object.keys(cfg.taskDeadlines || {}).length > 0) {
    const todayPage = document.getElementById('page-today');
    if (todayPage && todayPage.classList.contains('active')) {
      const circumference = 2 * Math.PI * 12;
      CRITICAL.forEach(t => {
        const deadline = cfg.taskDeadlines[t.id];
        if (!deadline) return;
        const ringFill  = document.querySelector(`[data-ring-id="${t.id}"]`);
        const timerLabel = document.querySelector(`[data-timer-id="${t.id}"]`);
        if (!ringFill && !timerLabel) return;
        const rd = getRingData(deadline, !!state.tasks[t.id]);
        if (!rd) return;
        if (ringFill) {
          ringFill.setAttribute('stroke-dashoffset', circumference * (1 - rd.pct));
          ringFill.className.baseVal = 'ring-fill ' + rd.cls;
        }
        if (timerLabel) {
          timerLabel.textContent = rd.label;
          timerLabel.className   = 'task-timer ' + rd.cls;
        }
      });
    }
  }
}, 1000);

function updateIntervalPill(val) {
  ['15','30','60','120'].forEach(v => {
    const el = document.getElementById('interval' + v);
    if (el) el.classList.toggle('active', v === (val || '30'));
  });
}

// Request notification permission aggressively on load
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      swNotify('Notifications enabled', 'You will be nagged until tasks are done.', 'tracker-welcome', false);
    }
  }
}

requestNotificationPermission();
startReminderTimer();

// Re-schedule any saved appointment reminders on load
(function() {
  const appts = loadAppts();
  appts.forEach(a => scheduleApptReminders(a));
})();
