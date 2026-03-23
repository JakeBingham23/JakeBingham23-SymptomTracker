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
