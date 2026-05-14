import { state } from './state-obj.js';
import { saveState, saveHistoryEntry } from './state.js';
import { cfg, CRITICAL, DAILY, SYMPTOMS, SYMPTOM_CATS, saveConfig } from './config.js';
import { Store } from './storage.js';

// ═════════════════════════════════════════════════════════════════
// CORE MODULE — Daily Structure Tracker v5
//
// ██████████████████████████████████████████████████████████████
// ██  THIS FILE IS SACRED.                                    ██
// ██  render · saveAll · toggleTask · setMood · toggleSymptom ██
// ██  TODAY · CRITICAL · DAILY · SYMPTOMS                     ██
// ██  live here and ONLY here.                                ██
// ██  Never define these in any other file.                   ██
// ██████████████████████████████████████████████████████████████
//
// Load order: 5th — after config.js, symptoms/config.js, state.js
//             before symptoms/render.js, render.js
// ═════════════════════════════════════════════════════════════════

export const TODAY   = new Date().toISOString().split('T')[0];
let CRITICAL  = cfg.critical || DEFAULT_CRITICAL;
let DAILY     = cfg.daily    || DEFAULT_DAILY;
let SYMPTOMS  = cfg.symptoms || DEFAULT_SYMPTOMS;

// ── render() ─────────────────────────────────────────────────────────────
export function render() {
  const dateEl = document.getElementById('dateDisplay');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday:'short', year:'numeric', month:'short', day:'numeric'
  });

  const all    = [...CRITICAL, ...DAILY];
  const done   = all.filter(t =>  state.tasks[t.id]).length;
  const missed = all.filter(t => !state.tasks[t.id]).length;
  _setStatEl('statDone',   done,              'tasks done today: '   + done);
  _setStatEl('statMissed', missed,            'tasks missed: '       + missed);
  _setStatEl('statStreak', state.medStreak||0,'medication streak: '  + (state.medStreak||0) + ' days');

  // Nag banner
  const nagItems = (CRITICAL||[]).filter(t => !state.tasks[t.id]);
  const banner   = document.getElementById('nagBanner');
  if (banner) {
    if (nagItems.length > 0) {
      banner.classList.add('visible');
      const nagText = document.getElementById('nagText');
      if (nagText) nagText.textContent = (cfg.name||'hey') + '. ' + nagItems.map(t=>t.name).join(', ') + '. Right now.';
      const encEl = document.getElementById('nagEncouragement');
      if (encEl && typeof getEncouragement === 'function') encEl.textContent = getEncouragement();
    } else {
      banner.classList.remove('visible');
    }
  }

  _renderList(CRITICAL||[], 'criticalTasks', true);
  _renderList(DAILY||[],    'dailyTasks',    false);

  // Symptom grid — delegated to symptoms/render.js
  if (typeof renderSymptomGrid === 'function') renderSymptomGrid();

  // Mood buttons
  ['energy','mood'].forEach(type => {
    document.querySelectorAll(`#${type}Opts .mood-btn`).forEach(btn => {
      const active = btn.textContent === state.mood[type];
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  });

  const notesEl = document.getElementById('symptomNotes');
  if (notesEl) notesEl.value = state.notes || '';

  // Mini history panel
  try {
    const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
    const histEl  = document.getElementById('historyList');
    if (histEl) {
      histEl.innerHTML = history.length === 0
        ? `<div style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text3)">no entries yet</div>`
        : history.slice(0,7).map(e => `
          <div class="history-entry">
            <span class="history-date">${e.date}</span>
            <span>${e.done}/${e.total} tasks</span>
            <span>mood: ${e.mood||'—'} / energy: ${e.energy||'—'}</span>
            ${e.flags > 0 ? `<span class="history-flags">${e.flags} flag${e.flags>1?'s':''}</span>` : ''}
          </div>`).join('');
    }
  } catch(e) {}
}

function _setStatEl(id, value, ariaLabel) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
}

function _renderList(list, containerId, critical) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = list.map(t => {
    const deadline      = critical && cfg.taskDeadlines && cfg.taskDeadlines[t.id];
    const ringData      = deadline && typeof getRingData === 'function' ? getRingData(deadline, !!state.tasks[t.id]) : null;
    const circumference = 2 * Math.PI * 12;
    const dashOffset    = ringData ? circumference * (1 - ringData.pct) : 0;
    const isDone        = !!state.tasks[t.id];
    const descId        = t.sub    ? 'desc-'  + t.id : '';
    const timerDescId   = ringData ? 'timer-' + t.id : '';
    const describedBy   = [descId, timerDescId].filter(Boolean).join(' ');
    return `
      <div class="task ${isDone?'done':''} ${critical?'critical':''}"
           role="button" tabindex="0"
           aria-pressed="${isDone}"
           aria-label="${escHtml(t.name)}${isDone?' — completed':' — not done'}"
           ${describedBy ? 'aria-describedby="'+describedBy+'"' : ''}
           onclick="toggleTask('${t.id}')"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleTask('${t.id}')}">
        <div class="ring-wrap">
          ${deadline ? `<svg class="ring-svg" viewBox="0 0 28 28" aria-hidden="true">
            <circle class="ring-track" cx="14" cy="14" r="12"/>
            <circle class="ring-fill ${ringData.cls}" cx="14" cy="14" r="12"
              data-ring-id="${t.id}" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"/>
          </svg>` : ''}
          <div class="check ${isDone?'checked':''}" aria-hidden="true"></div>
        </div>
        <div>
          <div class="task-name" aria-hidden="true">${escHtml(t.name)}</div>
          ${t.sub ? `<div class="task-sub" id="${descId}">${escHtml(t.sub)}</div>` : ''}
          ${ringData ? `<div class="task-timer ${ringData.cls}" id="${timerDescId}"
                             data-timer-id="${t.id}" aria-live="polite">${ringData.label}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── saveAll() ─────────────────────────────────────────────────────────────
function saveAll() {
  const notesEl = document.getElementById('symptomNotes');
  if (notesEl) state.notes = notesEl.value;
  saveState();
  saveHistoryEntry();
  if (typeof gcalSyncOnSave === 'function') gcalSyncOnSave();
  const c = document.getElementById('saveConfirm');
  if (c) { c.style.display = 'block'; setTimeout(() => { c.style.display = 'none'; }, 2500); }
  const all  = [...CRITICAL, ...DAILY];
  const done = all.filter(t => state.tasks[t.id]).length;
  if (typeof announce === 'function')
    announce('Check-in saved. ' + done + ' of ' + all.length + ' tasks completed today. Mood: ' +
             (state.mood.mood||'not set') + '. Energy: ' + (state.mood.energy||'not set') + '.');
  if (typeof checkBadges          === 'function') checkBadges();
  if (typeof renderPointsDisplay  === 'function') renderPointsDisplay();
  if (typeof showCheckinMessage   === 'function') showCheckinMessage();
}

// ── toggleTask() ──────────────────────────────────────────────────────────
export function toggleTask(id) {
  state.tasks[id] = !state.tasks[id];
  const done = state.tasks[id];
  const task = [...CRITICAL, ...DAILY].find(t => t.id === id);
  const name = task ? task.name : id;
  if (id === 'meds') {
    state.medStreak = done
      ? (state.medStreak||0) + 1
      : Math.max(0, (state.medStreak||0) - 1);
    if (typeof announce === 'function') {
      if (done) {
        announce(name + ' marked done. Medication streak: ' + state.medStreak + ' days.');
        if (typeof checkStreakMilestone === 'function') checkStreakMilestone(state.medStreak);
      } else {
        announce(name + ' unmarked. Medication streak reset to ' + state.medStreak + '.');
      }
    }
  } else {
    if (typeof announce === 'function') announce(name + (done ? ' marked done.' : ' unmarked.'));
  }
  if (done && typeof celebrateTask === 'function') {
    celebrateTask(id, name, CRITICAL.some(t => t.id === id));
  }
  saveState();
  render();
}

// ── setMood() ─────────────────────────────────────────────────────────────
export function setMood(type, btn) {
  const val = btn.textContent;
  state.mood[type] = val;
  if (typeof announce === 'function') announce(type + ' set to ' + val + '.');
  document.querySelectorAll('#' + type + 'Opts .mood-btn')
    .forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
  saveState();
  render();
}

// ── toggleSymptom() ───────────────────────────────────────────────────────
export function toggleSymptom(s) {
  const i = state.symptoms.indexOf(s);
  if (i > -1) {
    state.symptoms.splice(i, 1);
    if (typeof announce === 'function') announce(s + ' symptom flag removed.');
  } else {
    state.symptoms.push(s);
    if (typeof announce === 'function') announce(s + ' symptom flagged.');
  }
  saveState();
  if (typeof renderSymptomGrid === 'function') renderSymptomGrid();
  else render();
}
