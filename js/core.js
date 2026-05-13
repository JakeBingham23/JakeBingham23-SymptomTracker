// ═════════════════════════════════════════════════════════════════
// CORE — Daily Structure Tracker
// Loaded first (after crypto.js). Every other module depends on this.
//
// Owns:
//   TODAY           — YYYY-MM-DD string, immutable for the session
//   SCHEMA_VERSION  — bump when storage shape changes
//   render()        — full UI repaint from current state
//   announce()      — ARIA live region helper
//   escHtml()       — XSS-safe HTML escaping
//   sanitiseInput() — max-length + strip null bytes
//
// Rule: nothing in this file may reference a module-level function
// defined in any other file at parse time. Cross-module calls are
// only made inside function bodies (called at runtime, not parse time).
// ═════════════════════════════════════════════════════════════════

// ── Date ─────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];

// ── Schema version — bump when storage shape changes ─────────────
const SCHEMA_VERSION = 1;

// ── Utility: HTML escape ─────────────────────────────────────────
function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Utility: sanitise user input ─────────────────────────────────
function sanitiseInput(str, maxLen = 200) {
  if (str == null) return '';
  // Strip null bytes and control chars except newline/tab
  return String(str)
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .slice(0, maxLen);
}

// ── ARIA live region announcer ────────────────────────────────────
function announce(msg, assertive) {
  const id = assertive ? 'ariaAlert' : 'ariaStatus';
  const el = document.getElementById(id);
  if (!el) return;
  // Clear first so repeated identical messages still fire
  el.setAttribute('aria-hidden', 'true');
  el.textContent = '';
  requestAnimationFrame(() => {
    el.setAttribute('aria-hidden', 'false');
    el.textContent = msg || '\u200B';
  });
}

// ── render() ─────────────────────────────────────────────────────
// Full UI repaint. Called after any state mutation.
// Depends on: state, cfg, CRITICAL, DAILY, SYMPTOMS (all globals
// from config.js / state.js which load before this runs).
// Safe to call repeatedly — pure DOM writes, no side effects.

function render() {
  // Guard — if called before DOM is ready, bail silently
  if (!document.getElementById('dateDisplay')) return;

  // ── Date display ──────────────────────────────────────────────
  document.getElementById('dateDisplay').textContent =
    new Date().toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

  // ── Stat counts ───────────────────────────────────────────────
  const all    = [...(CRITICAL || []), ...(DAILY || [])];
  const done   = all.filter(t =>  state.tasks[t.id]).length;
  const missed = all.filter(t => !state.tasks[t.id]).length;

  const statDone   = document.getElementById('statDone');
  const statMissed = document.getElementById('statMissed');
  const statStreak = document.getElementById('statStreak');

  if (statDone)   { statDone.textContent = done;   statDone.setAttribute('aria-label', 'tasks done today: ' + done); }
  if (statMissed) { statMissed.textContent = missed; statMissed.setAttribute('aria-label', 'tasks missed: ' + missed); }
  if (statStreak) { statStreak.textContent = state.medStreak || 0; statStreak.setAttribute('aria-label', 'medication streak: ' + (state.medStreak || 0) + ' days'); }

  // ── Nag banner ────────────────────────────────────────────────
  const nagItems = (CRITICAL || []).filter(t => !state.tasks[t.id]);
  const banner   = document.getElementById('nagBanner');
  if (banner) {
    if (nagItems.length > 0) {
      banner.classList.add('visible');
      const name = (typeof cfg !== 'undefined' && cfg.name) ? cfg.name : 'hey';
      const nagText = document.getElementById('nagText');
      if (nagText) nagText.textContent = name + '. ' + nagItems.map(t => t.name).join(', ') + '. Right now.';
      const encEl = document.getElementById('nagEncouragement');
      if (encEl && typeof getEncouragement === 'function') encEl.textContent = getEncouragement();
    } else {
      banner.classList.remove('visible');
    }
  }

  // ── Task lists ────────────────────────────────────────────────
  function renderTaskList(list, containerId, critical) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = (list || []).map(t => {
      const deadline      = critical && typeof cfg !== 'undefined' && cfg.taskDeadlines && cfg.taskDeadlines[t.id];
      const ringData      = deadline && typeof getRingData === 'function' ? getRingData(deadline, !!state.tasks[t.id]) : null;
      const circumference = 2 * Math.PI * 12;
      const dashOffset    = ringData ? circumference * (1 - ringData.pct) : 0;
      const isDone        = !!state.tasks[t.id];
      const descId        = t.sub ? 'desc-' + t.id : '';
      const timerDescId   = ringData ? 'timer-' + t.id : '';
      const describedBy   = [descId, timerDescId].filter(Boolean).join(' ');

      return `<div class="task ${isDone ? 'done' : ''} ${critical ? 'critical' : ''}"
           role="button" tabindex="0"
           aria-pressed="${isDone}"
           aria-label="${escHtml(t.name)}${isDone ? ' — completed' : ' — not done'}"
           ${describedBy ? 'aria-describedby="' + describedBy + '"' : ''}
           onclick="toggleTask('${escHtml(t.id)}')"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleTask('${escHtml(t.id)}')}">
        <div class="ring-wrap">
          ${deadline ? `<svg class="ring-svg" viewBox="0 0 28 28" aria-hidden="true">
            <circle class="ring-track" cx="14" cy="14" r="12"/>
            <circle class="ring-fill ${ringData ? ringData.cls : ''}" cx="14" cy="14" r="12"
              data-ring-id="${t.id}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${dashOffset}"/>
          </svg>` : ''}
          <div class="check ${isDone ? 'checked' : ''}" aria-hidden="true"></div>
        </div>
        <div>
          <div class="task-name" aria-hidden="true">${escHtml(t.name)}</div>
          ${t.sub ? `<div class="task-sub" id="${descId}">${escHtml(t.sub)}</div>` : ''}
          ${ringData ? `<div class="task-timer ${ringData.cls}" id="${timerDescId}" data-timer-id="${t.id}" aria-live="polite">${ringData.label}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  renderTaskList(CRITICAL || [], 'criticalTasks', true);
  renderTaskList(DAILY    || [], 'dailyTasks',    false);

  // ── Symptom grid ──────────────────────────────────────────────
  const symptomGrid = document.getElementById('symptomGrid');
  if (symptomGrid && typeof SYMPTOMS !== 'undefined') {
    symptomGrid.innerHTML = (SYMPTOMS || []).map(s => {
      const active = state.symptoms.includes(s);
      return `<button class="sym-btn ${active ? 'active' : ''}"
              role="checkbox"
              aria-checked="${active}"
              aria-label="symptom flag: ${escHtml(s)}"
              onclick="toggleSymptom(${JSON.stringify(s)})">${escHtml(s)}</button>`;
    }).join('');
  }

  // ── Mood buttons ──────────────────────────────────────────────
  ['energy', 'mood'].forEach(type => {
    document.querySelectorAll(`#${type}Opts .mood-btn`).forEach(btn => {
      const active = btn.textContent === state.mood[type];
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  });

  // ── Notes ─────────────────────────────────────────────────────
  const notesEl = document.getElementById('symptomNotes');
  if (notesEl && document.activeElement !== notesEl) {
    notesEl.value = state.notes || '';
  }

  // ── History list (Today tab sidebar / history tab) ────────────
  try {
    const history = Store.get('tracker-history') || [];
    const histEl  = document.getElementById('historyList');
    if (histEl) {
      histEl.innerHTML = history.length === 0
        ? `<div style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text3)">no entries yet</div>`
        : history.slice(0, 7).map(e => `
          <div class="history-entry">
            <span class="history-date">${e.date}</span>
            <span>${e.done}/${e.total} tasks</span>
            <span>mood: ${e.mood || '—'} / energy: ${e.energy || '—'}</span>
            ${e.flags > 0 ? `<span class="history-flags">${e.flags} flag${e.flags > 1 ? 's' : ''}</span>` : ''}
          </div>`).join('');
    }
  } catch(e) {}
}
