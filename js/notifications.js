// ═════════════════════════════════════════════════════════════════
// NOTIFICATIONS MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Configurable reminder interval ───────────────────────────────────────
let _reminderTimer = null;

function startReminderTimer() {
  if (_reminderTimer) clearInterval(_reminderTimer);
  const mins = parseInt(cfg.reminderInterval || '30', 10);
  _reminderTimer = setInterval(() => {
    const nagItems = CRITICAL.filter(t => !state.tasks[t.id]);
    if (nagItems.length === 0) return;
    const name = cfg.name || 'hey';
    nagUser(name, nagItems);
  }, mins * 60 * 1000);
}

// Also check task deadlines every minute and nag if overdue
setInterval(() => {
  if (!cfg.taskDeadlines) return;
  const overdueItems = CRITICAL.filter(t => {
    if (state.tasks[t.id]) return false; // already done
    const dl = cfg.taskDeadlines[t.id];
    if (!dl) return false;
    return minsUntil(dl) < 0; // past deadline
  });
  if (overdueItems.length > 0) {
    const prefs = cfg.notifPrefs || {};
    const name  = cfg.name || 'hey';
    if (prefs.taskBrowser !== false) {
      swNotify(name + ' — overdue',
        overdueItems.map(t => t.name).join(', ') + ' is overdue.',
        'tracker-overdue', true);
      if (navigator.vibrate) navigator.vibrate(getVibPattern('task'));
    }
    if (prefs.taskTelegram !== false && cfg.tgToken && cfg.tgChatId) {
      sendTelegramMessage('🚨 OVERDUE: ' + overdueItems.map(t => t.name).join(', '));
    }
  }
}, 60000);

// Check window close time
setInterval(() => {
  if (!cfg.windowCloseTime) return;
  const mins = minsUntil(cfg.windowCloseTime);
  if (mins === null) return;
  // Warn at 30 mins
  if (mins > 0 && mins <= 30 && Math.floor(mins) % 10 === 0) {
    const prefs = cfg.notifPrefs || {};
    const name  = cfg.name || 'hey';
    if (prefs.windowBrowser !== false) {
      swNotify(name + ' — check-in closing soon',
        'Check-in window closes in ' + Math.floor(mins) + ' minutes.',
        'tracker-window', false);
      if (navigator.vibrate) navigator.vibrate(getVibPattern('timer'));
    }
    if (prefs.taskTelegram !== false && cfg.tgToken && cfg.tgChatId) {
      sendTelegramMessage('⏰ Check-in window closes in ' + Math.floor(mins) + ' minutes.');
    }
  }
  // Nag at exactly closed
  if (mins <= 0 && mins > -1) {
    const name = cfg.name || 'hey';
    nagUser(name, CRITICAL.filter(t => !state.tasks[t.id]));
  }
}, 60000);

function setInterval_(val) {
  cfg.reminderInterval = val;
  saveConfig(cfg);
  updateIntervalPill(val);
  startReminderTimer();
}

// ── Aggressive nag: repeat 3 times, 30 seconds apart ─────────────────────
function nagUser(name, nagItems) {
  const prefs = cfg.notifPrefs || {};
  const title = name + ' — do this now';
  const body  = nagItems.map(t => t.name).join(', ') + '. Right now. Not later.';
  const vib   = getVibPattern('task');

  if (prefs.taskBrowser !== false) {
    swNotify(title, body, 'tracker-nag', true);
    if (navigator.vibrate) navigator.vibrate(vib);
    playAlertSound('task');
    swSchedule(30000,  title, body, 'tracker-nag-2');
    swSchedule(90000, name + ' — STILL waiting', body + ' Still not done.', 'tracker-nag-3');
  }
  if (prefs.taskTelegram !== false && cfg.tgToken && cfg.tgChatId) {
    sendTelegramMessage('⚠️ ' + title + '\n' + body);
  }
}

// ── Weekly/monthly notification scheduling ────────────────────────────────
function schedulePeriodicSummaries() {
  const now     = new Date();
  const day     = now.getDay();   // 0=Sun
  const date    = now.getDate();
  const hour    = now.getHours();
  const name    = cfg.name || 'hey';

  // Weekly — Sunday at 7pm
  if (day === 0 && hour === 19) {
    const summary = generateWeeklySummary();
    if (summary) {
      swNotify(name + ' — weekly summary',
        'This week: ' + summary.avgDone + '% task completion, ' +
        summary.days + ' days logged.',
        'weekly-summary', false);
      if (cfg.tgToken && cfg.tgChatId) {
        sendTelegramMessage('📅 Weekly summary: ' + summary.avgDone +
          '% task completion, top mood: ' + summary.topMood);
      }
    }
  }

  // Monthly — 1st of month at 9am
  if (date === 1 && hour === 9) {
    const summary = generateMonthlySummary();
    if (summary) {
      swNotify(name + ' — monthly summary',
        summary.monthName + ': ' + summary.avgDone + '% avg completion, ' +
        summary.days + ' days logged.',
        'monthly-summary', false);
    }
  }
}

// Check every hour
setInterval(schedulePeriodicSummaries, 3600000);

// ── Telegram ─────────────────────────────────────────────────────────────
async function sendTelegramMessage(text) {
  if (!cfg.tgToken || !cfg.tgChatId) return;
  try {
    await fetch('https://api.telegram.org/bot' + cfg.tgToken + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cfg.tgChatId, text })
    });
  } catch(e) { console.warn('Telegram send failed:', e); }
}

async function connectTelegram() {
  const token = document.getElementById('tgToken').value.trim();
  const statusEl = document.getElementById('tgStatus');
  if (!token) { tgStatusMsg('enter a token first', 'var(--danger)'); return; }
  tgStatusMsg('connecting…', 'var(--text3)');
  try {
    // getUpdates to find the chat_id from the most recent message to the bot
    const res  = await fetch('https://api.telegram.org/bot' + token + '/getUpdates');
    const data = await res.json();
    if (!data.ok) { tgStatusMsg('invalid token — check and retry', 'var(--danger)'); return; }
    const updates = data.result;
    if (!updates || updates.length === 0) {
      tgStatusMsg('no messages found — send your bot a message first, then retry', 'var(--warning)');
      return;
    }
    const chatId = updates[updates.length - 1].message?.chat?.id;
    if (!chatId) { tgStatusMsg('could not find chat ID — message your bot and retry', 'var(--warning)'); return; }
    cfg.tgToken  = token;
    cfg.tgChatId = String(chatId);
    saveConfig(cfg);
    tgStatusMsg('connected ✓ chat ID: ' + chatId, 'var(--success)');
  } catch(e) {
    tgStatusMsg('connection failed — check network', 'var(--danger)');
  }
}

function tgStatusMsg(msg, color) {
  const el = document.getElementById('tgStatus');
  if (el) { el.textContent = msg; el.style.color = color; }
}

async function sendTelegramTest() {
  if (!cfg.tgToken || !cfg.tgChatId) {
    tgStatusMsg('connect first', 'var(--danger)'); return;
  }
  const msg = document.getElementById('tgTestMsg').value.trim()
    || 'test from daily tracker — ' + TODAY;
  await sendTelegramMessage(msg);
  tgStatusMsg('test sent ✓', 'var(--success)');
  setTimeout(() => tgStatusMsg('', ''), 3000);
}

// ═════════════════════════════════════════════════════════════════
// SW BRIDGE — the missing link between app and service worker
// Every call to swNotify/swSchedule was a silent ReferenceError.
// These functions send postMessage to the registered SW.
// ═════════════════════════════════════════════════════════════════

function _getSW() {
  return navigator.serviceWorker && navigator.serviceWorker.controller;
}

function swNotify(title, body, tag, requireInteraction) {
  const sw = _getSW();
  if (!sw) {
    // SW not ready — fall back to Notification API directly if permitted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          tag:  tag || 'tracker',
          requireInteraction: !!requireInteraction,
          icon: './icons/icon-192.png',
        });
      } catch(e) {}
    }
    return;
  }
  sw.postMessage({
    type:               'NOTIFY',
    title:              title || '',
    body:               body  || '',
    tag:                tag   || 'tracker-reminder',
    requireInteraction: requireInteraction !== false,
    badge:              './icons/icon-48.png',
  });
}

function swSchedule(delayMs, title, body, tag) {
  const sw = _getSW();
  if (!sw) return; // can't schedule without SW
  sw.postMessage({
    type:  'SCHEDULE',
    delay: delayMs,
    title: title || '',
    body:  body  || '',
    tag:   tag   || 'tracker-scheduled',
  });
}

// ── Re-register SW after page load to ensure controller is set ────────────
// The SW controller is null on first load. Wait for it.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(() => {
    // SW is active and controlling — nothing else needed
  }).catch(() => {});
}

// ═════════════════════════════════════════════════════════════════
// PER-TASK SCHEDULED REMINDERS
// Each non-negotiable can have a scheduled reminder time (HH:MM)
// separate from its deadline. Fires once per day at that time
// whether or not the task is done — it's a "start now" interrupt.
// ═════════════════════════════════════════════════════════════════

// Tracks which reminder+date combos have already fired this session
const _firedReminders = new Set();

function scheduleTaskReminders() {
  const reminders = cfg.taskReminders || {}; // { taskId: 'HH:MM' }
  if (!Object.keys(reminders).length) return;

  const now    = new Date();
  const todayKey = now.toISOString().split('T')[0];

  CRITICAL.forEach(t => {
    const timeStr = reminders[t.id];
    if (!timeStr) return;
    if (state.tasks[t.id]) return; // already done — don't nag

    const key = t.id + ':' + todayKey + ':' + timeStr;
    if (_firedReminders.has(key)) return; // already fired today

    const [hh, mm]   = timeStr.split(':').map(Number);
    const fireAt     = new Date(now);
    fireAt.setHours(hh, mm, 0, 0);

    const minsLeft = (fireAt - now) / 60000;

    // Fire if we're within the current minute (0 to +1 min)
    if (minsLeft >= 0 && minsLeft < 1) {
      _firedReminders.add(key);
      const name  = cfg.name || 'hey';
      const prefs = cfg.notifPrefs || {};
      const title = name + ' — ' + t.name;
      const body  = 'Time to do: ' + t.name + '. Right now.';

      if (prefs.taskBrowser !== false) {
        swNotify(title, body, 'tracker-remind-' + t.id, true);
        if (navigator.vibrate) navigator.vibrate(getVibPattern('task'));
        playAlertSound('task');
      }
      if (prefs.taskTelegram !== false && cfg.tgToken && cfg.tgChatId) {
        sendTelegramMessage('⏰ Reminder: ' + t.name + '\n' + body);
      }
    }
  });
}

// Check reminders every 30 seconds (fine-grained enough for HH:MM accuracy)
setInterval(scheduleTaskReminders, 30000);

// Also check immediately on load in case we just opened the app at reminder time
setTimeout(scheduleTaskReminders, 3000);

// ── Save task reminder time ────────────────────────────────────────────────
function setTaskReminder(taskId, timeVal) {
  cfg.taskReminders = cfg.taskReminders || {};
  if (timeVal) {
    cfg.taskReminders[taskId] = timeVal;
  } else {
    delete cfg.taskReminders[taskId];
  }
  saveConfig(cfg);
}

// ═════════════════════════════════════════════════════════════════
// SW → APP MESSAGE HANDLER
// The SW sends NOTIFICATION_ACTION when the user taps an action
// button on a notification (mark done / snooze).
// ═════════════════════════════════════════════════════════════════

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (!e.data) return;

    if (e.data.type === 'NOTIFICATION_ACTION') {
      const { action, tag } = e.data;

      if (action === 'done') {
        // Extract task id from tag — format: tracker-remind-{taskId}
        const taskId = tag && tag.startsWith('tracker-remind-')
          ? tag.replace('tracker-remind-', '')
          : null;

        if (taskId) {
          // Mark the task done and save
          state.tasks[taskId] = true;
          if (typeof saveState === 'function')  saveState();
          if (typeof saveAll   === 'function')  saveAll();
          if (typeof render    === 'function')  render();
          if (typeof announce  === 'function')  announce('Marked done from notification.');
        } else {
          // Generic "done" — mark all outstanding critical tasks done
          (CRITICAL || []).forEach(t => { state.tasks[t.id] = true; });
          if (typeof saveState === 'function') saveState();
          if (typeof saveAll   === 'function') saveAll();
          if (typeof render    === 'function') render();
        }
      }

      if (action === 'snooze') {
        // SW handles the 10min re-fire; nothing to do in app state
        if (typeof announce === 'function')
          announce('Snoozed — you\'ll be reminded again in 10 minutes.');
      }
    }
  });
}
