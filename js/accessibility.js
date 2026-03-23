// ═════════════════════════════════════════════════════════════════
// ACCESSIBILITY MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Low vision / accessibility system ────────────────────────────────────

function applyTextSize(size) {
  // Apply to <html> so rem units cascade from it
  const html = document.documentElement;
  html.removeAttribute('data-text-size');
  if (size && size !== 'normal') html.setAttribute('data-text-size', size);
  updateTextSizeUI(size || 'normal');
}

function setTextSize(size) {
  cfg.a11y = cfg.a11y || {};
  cfg.a11y.textSize = size;
  saveConfig(cfg);
  applyTextSize(size);
  announce('Text size set to ' + size + '.');
}

function cycleTextSize() {
  const sizes  = ['normal','large','xl','small'];
  const current = (cfg.a11y || {}).textSize || 'normal';
  const next    = sizes[(sizes.indexOf(current) + 1) % sizes.length];
  setTextSize(next);
}

function updateTextSizeUI(size) {
  const icons  = { small:'a', normal:'A', large:'A+', xl:'A++' };
  const iconEl = document.getElementById('navTextSizeIcon');
  const lblEl  = document.getElementById('navTextSizeLabel');
  if (iconEl) iconEl.textContent = icons[size] || 'A';
  if (lblEl)  lblEl.textContent  = 'text';
  const btn = document.getElementById('navTextSizeBtn');
  if (btn) btn.setAttribute('aria-label', 'Text size: ' + size + '. Click to cycle.');

  // Sync settings and menu pills
  ['small','normal','large','xl'].forEach(s => {
    // Ensures XL is capitalized correctly for both IDs
    const key = s === 'xl' ? 'XL' : s.charAt(0).toUpperCase() + s.slice(1);

    // Settings page
    const el = document.getElementById('textSize' + key);
    if (el) { el.classList.toggle('active', s === size); el.setAttribute('aria-checked', s === size ? 'true' : 'false'); }

    // Hamburger menu
    const menuEl = document.getElementById('menuSize' + key);
    if (menuEl) { menuEl.classList.toggle('active', s === size); menuEl.setAttribute('aria-checked', s === size ? 'true' : 'false'); }
  });
}

function applyHighContrast(on) {
  const root = document.documentElement;
  if (on) root.setAttribute('data-contrast', 'high');
  else    root.removeAttribute('data-contrast');
  // Update nav button state
  const btn = document.getElementById('navContrastBtn');
  if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  const settEl = document.getElementById('settingsHighContrast');
  if (settEl) settEl.checked = !!on;
}

function setHighContrast(on) {
  cfg.a11y = cfg.a11y || {};
  cfg.a11y.highContrast = on;
  saveConfig(cfg);
  applyHighContrast(on);
  announce('High contrast ' + (on ? 'enabled' : 'disabled') + '.');
}

function toggleHighContrast() {
  const current = (cfg.a11y || {}).highContrast;
  setHighContrast(!current);
}

function applyReduceMotion(on) {
  const root = document.documentElement;
  if (on) root.setAttribute('data-reduce-motion', 'true');
  else    root.removeAttribute('data-reduce-motion');
  const btn    = document.getElementById('navMotionBtn');
  if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  const settEl = document.getElementById('settingsReduceMotion');
  if (settEl) settEl.checked = !!on;
}

function toggleReduceMotion(val) {
  const on = typeof val === 'boolean' ? val : !(cfg.a11y || {}).reduceMotion;
  cfg.a11y = cfg.a11y || {};
  cfg.a11y.reduceMotion = on;
  saveConfig(cfg);
  applyReduceMotion(on);
  announce('Reduce motion ' + (on ? 'enabled' : 'disabled') + '.');
}

function setLargeTouchTargets(on) {
  cfg.a11y = cfg.a11y || {};
  cfg.a11y.largeTouchTargets = on;
  saveConfig(cfg);
  const root = document.documentElement;
  if (on) root.setAttribute('data-large-targets', 'true');
  else    root.removeAttribute('data-large-targets');
  announce('Larger touch targets ' + (on ? 'enabled' : 'disabled') + '.');
}

function applyA11yPrefs() {
  const a11y = cfg.a11y || {};
  applyTextSize(a11y.textSize || 'normal');
  applyHighContrast(!!a11y.highContrast);
  applyReduceMotion(!!a11y.reduceMotion);
  applyFont(a11y.font || 'default');
  if (a11y.largeTouchTargets) document.documentElement.setAttribute('data-large-targets', 'true');
  const lttEl = document.getElementById('largeTouchTargets');
  if (lttEl) lttEl.checked = !!a11y.largeTouchTargets;
}

// Also add high contrast CSS for data-contrast attribute (manual override)
// This is separate from prefers-contrast media query
(function() {
  const style = document.createElement('style');
  style.textContent = `
    :root[data-contrast="high"] {
      --bg: #000 !important; --bg2: #0a0a0a !important; --bg3: #111 !important;
      --border: rgba(255,255,255,0.4) !important; --border2: rgba(255,255,255,0.7) !important;
      --text: #fff !important; --text2: #ddd !important; --text3: #aaa !important;
      --accent: #ffd080 !important; --danger: #ff6060 !important; --success: #60dd90 !important;
    }
    :root[data-contrast="high"][data-theme="light"] {
      --bg: #fff !important; --bg2: #f0f0f0 !important; --bg3: #e0e0e0 !important;
      --text: #000 !important; --text2: #222 !important; --text3: #444 !important;
      --accent: #7a4800 !important; --danger: #cc0000 !important;
    }
  `;
  document.head.appendChild(style);
})();

// ── Screen reader announcements ───────────────────────────────────────────
// ── Notification preferences ─────────────────────────────────────────────
function saveNotifPrefs() {
  cfg.notifPrefs = {
    taskBrowser:   document.getElementById('notifTaskBrowser')?.checked   ?? true,
    taskTelegram:  document.getElementById('notifTaskTelegram')?.checked  ?? true,
    taskVib:       cfg.notifPrefs?.taskVib   || 'gentle',
    timerBrowser:  document.getElementById('notifTimerBrowser')?.checked  ?? true,
    windowBrowser: document.getElementById('notifWindowBrowser')?.checked ?? true,
    timerVib:      cfg.notifPrefs?.timerVib  || 'gentle',
    apptBrowser:   document.getElementById('notifApptBrowser')?.checked   ?? true,
    apptTelegram:  document.getElementById('notifApptTelegram')?.checked  ?? true,
    apptVib:       cfg.notifPrefs?.apptVib   || 'gentle',
  };
  saveConfig(cfg);
  announce('Notification preferences saved.');
}

function setVibPattern(type, pattern) {
  if (!cfg.notifPrefs) cfg.notifPrefs = {};
  cfg.notifPrefs[type + 'Vib'] = pattern;
  saveConfig(cfg);
  // Update pill UI
  ['gentle','firm','urgent'].forEach(p => {
    const el = document.getElementById(type + 'Vib-' + p);
    if (el) {
      el.classList.toggle('active', p === pattern);
      el.setAttribute('aria-pressed', p === pattern ? 'true' : 'false');
    }
  });
  // Preview the haptic
  const patterns = cfg.vibPatterns || { gentle:[50,30,80], firm:[100,50,200], urgent:[300,100,300,100,600] };
  if (navigator.vibrate) navigator.vibrate(patterns[pattern] || patterns.gentle);
  announce(type + ' vibration set to ' + pattern + '.');
}

function getVibPattern(type) {
  const key = (cfg.notifPrefs?.[type + 'Vib']) || 'gentle';
  return (cfg.vibPatterns || {})[key] || [50, 30, 80];
}

function syncNotifPrefsUI() {
  const p = cfg.notifPrefs || {};
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val !== false; };
  set('notifTaskBrowser',   p.taskBrowser);
  set('notifTaskTelegram',  p.taskTelegram);
  set('notifTimerBrowser',  p.timerBrowser);
  set('notifWindowBrowser', p.windowBrowser);
  set('notifApptBrowser',   p.apptBrowser);
  set('notifApptTelegram',  p.apptTelegram);
  ['task','timer','appt'].forEach(type => {
    const pat = p[type + 'Vib'] || 'gentle';
    ['gentle','firm','urgent'].forEach(p2 => {
      const el = document.getElementById(type + 'Vib-' + p2);
      if (el) {
        el.classList.toggle('active', p2 === pat);
        el.setAttribute('aria-pressed', p2 === pat ? 'true' : 'false');
      }
    });
  });
}

function announce(msg, assertive) {
  const id = assertive ? 'ariaAlert' : 'ariaStatus';
  const el = document.getElementById(id);
  if (!el) return;
  // iOS VoiceOver needs a brief delay between clear and set
  el.textContent = '';
  el.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    el.setAttribute('aria-hidden', 'false');
    el.textContent = msg;
  }, 50);
}

function updateTask(containerId, idx, field, val) {
  const list = containerId === 'settingsCritical' ? CRITICAL : DAILY;
  list[idx][field] = val.trim();
}

function removeTask(containerId, idx) {
  const list = containerId === 'settingsCritical' ? CRITICAL : DAILY;
  list.splice(idx, 1);
  renderSettingsPanel();
}

function addTask(type) {
  const id = 'task_' + Date.now();
  if (type === 'critical') CRITICAL.push({ id, name: 'new task', sub: '' });
  else DAILY.push({ id, name: 'new task', sub: '' });
  renderSettingsPanel();
}

function removeSymptom(idx) {
  SYMPTOMS.splice(idx, 1);
  renderSettingsPanel();
}

function addSymptom() {
  const inp = document.getElementById('newSymInput');
  const val = inp.value.trim().toLowerCase();
  if (!val) return;
  SYMPTOMS.push(val);
  inp.value = '';
  renderSettingsPanel();
}

function saveName() {
  const name = document.getElementById('settingsName').value.trim();
  if (!name) {
    announce('Please enter a name first.', true);
    document.getElementById('settingsName').focus();
    return;
  }
  cfg.name = name;
  saveConfig(cfg);
  applyName(name);
  announce('Name saved: ' + name + '.');
  showToast('name saved ✓');
}

function saveSettings() {
  // Flush any typed-but-not-changed inputs from settings panel
  document.querySelectorAll('#settingsCritical input[type=text]').forEach((inp, i) => {
    const field = inp.classList.contains('sub-input') ? null : 'name';
    // handled via onchange already; just sync name
  });
  cfg.name     = document.getElementById('settingsName').value.trim() || cfg.name;
  cfg.critical = CRITICAL;
  cfg.daily    = DAILY;
  cfg.symptoms = SYMPTOMS;
  // interval + telegram are saved immediately on interaction, but sync here too
  const tgTokenEl = document.getElementById('tgToken');
  if (tgTokenEl && tgTokenEl.value.trim()) cfg.tgToken = tgTokenEl.value.trim();
  saveConfig(cfg);
  applyName(cfg.name);
  // Show brief confirmation
  const btn = document.querySelector('#page-settings .btn.primary');
  if (btn) { const orig = btn.textContent; btn.textContent = 'saved ✓'; setTimeout(() => btn.textContent = orig, 2000); }
  render();
}

// ── Haptic feedback helper ────────────────────────────────────────────────
function hapticSuccess() {
  // Short double-buzz — confirms save completed
  if (navigator.vibrate) navigator.vibrate([50, 30, 80]);
}

function hapticError() {
  // Long single buzz — something went wrong
  if (navigator.vibrate) navigator.vibrate([300]);
}

async function savePreviewImage() {
  if (!_pendingScreenshot) return;
  const { blob, filename, dataUrl } = _pendingScreenshot;
  const isIOS    = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isDDG    = /DuckDuckGo/i.test(navigator.userAgent);

  closePreview();

  // ── iOS: Web Share → Save to Photos ──────────────────────────────────────
  if (isIOS) {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Symptom record ' + TODAY
          });
          // Share sheet completed — haptic fires when user taps Save to Photos
          // We can't know exactly when that happens, so fire on share sheet open
          hapticSuccess();
          announce('Image shared. Use Save to Photos in the share sheet.');
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return;
          hapticError();
        }
      }
    }
    // iOS fallback — show in-page overlay same as DDG
    showImageTab(dataUrl, filename);
    return;
  }

  // ── DDG: in-page long-press overlay ──────────────────────────────────────
  if (isDDG) {
    showImageTab(dataUrl, filename);
    // Haptic fires when overlay opens so user knows image is ready
    hapticSuccess();
    return;
  }

  // ── Chrome/Edge: File System Access with persistent folder ────────────────
  if (window.showDirectoryPicker) {
    const dir = await getGalleryFolder();
    if (dir) {
      try {
        let targetDir = dir;
        if (dir.name.toLowerCase() === 'pictures' || dir.name.toLowerCase() === 'dcim') {
          try {
            targetDir = await dir.getDirectoryHandle('SymptomTracker', { create: true });
            _galleryDirHandle = targetDir;
            await saveFolderHandle(targetDir);
          } catch(e) { targetDir = dir; }
        }
        const fileHandle = await targetDir.getFileHandle(filename, { create: true });
        const writable   = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        // File fully written — haptic fires NOW in sync with save completion
        hapticSuccess();
        showToast('saved to ' + targetDir.name + ' ✓');
        announce('Image saved to ' + targetDir.name + '.');
        return;
      } catch(e) {
        _galleryDirHandle = null;
        hapticError();
        console.warn('Folder write failed:', e);
      }
    }
  }

  // ── Universal fallback: download ──────────────────────────────────────────
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 15000);
  // Download triggers immediately — haptic fires right after click
  hapticSuccess();
  showToast('saved to Downloads — check your Gallery');
  announce('Image downloading to Downloads folder.');
}

// Allow user to reset/change the save folder from settings
async function changeSaveFolder() {
  _galleryDirHandle = null;
  const dir = await getGalleryFolder(true);
  if (dir) showToast('save folder updated: ' + dir.name);
}

function showImageTab(dataUrl, filename) {
  // DDG blocks window.open() — show image in a full-screen in-page overlay instead
  // User long-presses the image directly to get Android's "Save image" option
  let overlay = document.getElementById('ddgImageOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ddgImageOverlay';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.96);
      display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      gap:16px; padding:20px;
      touch-action:manipulation;
    `;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Save symptom record image');
    overlay.innerHTML = `
      <p id="ddgInstructions" style="color:#c8a96e;font-family:monospace;font-size:0.8125rem;text-align:center;line-height:1.6">
        hold your finger on the image<br>then tap <strong>Save image</strong>
      </p>
      <img id="ddgSaveImg"
           style="max-width:100%;max-height:60vh;border-radius:8px;border:1px solid rgba(255,255,255,0.15)"
           alt="Symptom record for ${TODAY}. Hold to save to gallery."
           aria-describedby="ddgInstructions"
           tabindex="0">
      <p style="color:#555;font-family:monospace;font-size:0.6875rem;text-align:center" id="ddgFilename"></p>
      <button onclick="document.getElementById('ddgImageOverlay').remove()"
        aria-label="Close save image overlay"
        style="background:transparent;border:0.5px solid rgba(255,255,255,0.2);border-radius:6px;
               color:#888;font-family:monospace;font-size:0.75rem;padding:10px 24px;
               cursor:pointer;min-height:44px">
        close
      </button>
    `;
    document.body.appendChild(overlay);
  }
  document.getElementById('ddgSaveImg').src     = dataUrl;
  document.getElementById('ddgFilename').textContent = filename;
  overlay.style.display = 'flex';
  announce('Save image overlay open. ' + filename + '. Hold your finger on the image then tap Save image to save to your gallery.', true);
  // Focus the image element so VoiceOver reads alt text + instructions
  setTimeout(() => {
    const img = document.getElementById('ddgSaveImg');
    if (img) img.focus();
  }, 150);
}

function showToast(msg) {
  announce(msg);
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:var(--bg3); border:0.5px solid var(--border2);
      color:var(--text); font-family:var(--font-mono); font-size:0.75rem;
      padding:10px 18px; border-radius:20px; z-index:999;
      white-space:nowrap; box-shadow:0 4px 16px rgba(0,0,0,0.4);
      opacity:0; transition:opacity 0.2s;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 3500);
}

function resetBtn(btn) {
  if (!btn) return;
  btn.classList.remove('loading');
  btn.textContent = 'screenshot record';
}

function render() {
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });

  const all = [...CRITICAL, ...DAILY];
  const done   = all.filter(t =>  state.tasks[t.id]).length;
  const missed = all.filter(t => !state.tasks[t.id]).length;
  document.getElementById('statDone').textContent   = done;
  document.getElementById('statMissed').textContent = missed;
  document.getElementById('statStreak').textContent = state.medStreak || 0;
  document.getElementById('statDone').setAttribute('aria-label',    'tasks done today: ' + done);
  document.getElementById('statMissed').setAttribute('aria-label',  'tasks missed: ' + missed);
  document.getElementById('statStreak').setAttribute('aria-label',  'medication streak: ' + (state.medStreak || 0) + ' days');

  const nagItems = (CRITICAL||[]).filter(t => !state.tasks[t.id]);
  const banner   = document.getElementById('nagBanner');
  if (nagItems.length > 0) {
    banner.classList.add('visible');
    const name = cfg.name || 'hey';
    document.getElementById('nagText').textContent =
      name + '. ' + nagItems.map(t => t.name).join(', ') + '. Right now.';
    const encEl = document.getElementById('nagEncouragement');
    if (encEl) encEl.textContent = getEncouragement();
  } else {
    banner.classList.remove('visible');
  }

  function renderList(list, containerId, critical) {
    document.getElementById(containerId).innerHTML = list.map(t => {
      const deadline     = critical && cfg.taskDeadlines[t.id];
      const ringData     = deadline ? getRingData(deadline, !!state.tasks[t.id]) : null;
      const ringClass    = ringData ? ringData.cls : '';
      const circumference = 2 * Math.PI * 12;
      const dashOffset   = ringData ? circumference * (1 - ringData.pct) : 0;
      const isDone       = !!state.tasks[t.id];
      const descId       = t.sub ? 'desc-' + t.id : '';
      const timerDescId  = ringData ? 'timer-' + t.id : '';
      const describedBy  = [descId, timerDescId].filter(Boolean).join(' ');
      return `
        <div class="task ${isDone ? 'done' : ''} ${critical ? 'critical' : ''}"
             role="button"
             tabindex="0"
             aria-pressed="${isDone}"
             aria-label="${escHtml(t.name)}${isDone ? ' — completed' : ' — not done'}"
             ${describedBy ? 'aria-describedby="' + describedBy + '"' : ''}
             onclick="toggleTask('${t.id}')"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleTask('${t.id}')}">
          <div class="ring-wrap">
            ${deadline ? `<svg class="ring-svg" viewBox="0 0 28 28" aria-hidden="true">
              <circle class="ring-track" cx="14" cy="14" r="12"/>
              <circle class="ring-fill ${ringClass}" cx="14" cy="14" r="12"
                data-ring-id="${t.id}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}"/>
            </svg>` : ''}
            <div class="check ${isDone ? 'checked' : ''}" aria-hidden="true"></div>
          </div>
          <div>
            <div class="task-name" aria-hidden="true">${escHtml(t.name)}</div>
            ${t.sub ? `<div class="task-sub" id="${descId}">${escHtml(t.sub)}</div>` : ''}
            ${ringData ? `<div class="task-timer ${ringClass}" id="${timerDescId}" data-timer-id="${t.id}" aria-live="polite">${ringData.label}</div>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  renderList(CRITICAL||[], 'criticalTasks', true);
  renderList(DAILY||[],    'dailyTasks',    false);

  document.getElementById('symptomGrid').innerHTML = SYMPTOMS.map(s => {
    const active = state.symptoms.includes(s);
    return `<button class="sym-btn ${active ? 'active' : ''}"
            role="checkbox"
            aria-checked="${active}"
            aria-label="symptom flag: ${escHtml(s)}"
            onclick="toggleSymptom(${JSON.stringify(s)})">${escHtml(s)}</button>`;
  }).join('');

  ['energy', 'mood'].forEach(type => {
    document.querySelectorAll(`#${type}Opts .mood-btn`).forEach(btn => {
      const active = btn.textContent === state.mood[type];
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  });

  document.getElementById('symptomNotes').value = state.notes || '';

  try {
    const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
    const histEl = document.getElementById('historyList');
    if (histEl) histEl.innerHTML = history.length === 0
      ? `<div style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text3)">no entries yet</div>`
      : history.slice(0, 7).map(e => `
        <div class="history-entry">
          <span class="history-date">${e.date}</span>
          <span>${e.done}/${e.total} tasks</span>
          <span>mood: ${e.mood || '—'} / energy: ${e.energy || '—'}</span>
          ${e.flags > 0 ? `<span class="history-flags">${e.flags} flag${e.flags > 1 ? 's' : ''}</span>` : ''}
        </div>
      `).join('');
  } catch(e) {}
}

// initApp() is now called by lockScreen.dismiss() after unlock
// Do NOT call initOnboarding directly — gate through lock screen

// ═══════════════════════════════════════════════════════════════════════
// LOCK SCREEN CONTROLLER
// ═══════════════════════════════════════════════════════════════════════
const lockScreen = (() => {
  const MAX_PIN_LEN = 6;
  const MIN_PIN_LEN = 4;
  let _mode         = null; // 'setup-first' | 'setup-confirm' | 'unlock'
  let _pin          = '';
  let _firstPIN     = '';
  let _attempts     = 0;
  const MAX_ATTEMPTS = 5;

  // ── Build number pad ──────────────────────────────────────────────────
  function buildPad(containerId, onKey) {
    const pad    = document.getElementById(containerId);
    if (!pad) return;
    const keys   = ['1','2','3','4','5','6','7','8','9','✓','0','⌫'];
    pad.innerHTML = keys.map(k => {
      if (k === '✓') {
        // Manual submit — allows submission for PINs of any valid length (min 4)
        return `<button class="pin-key" style="color:var(--success);font-weight:bold;"
          onclick="lockScreen.submit('${containerId}' === 'setupPINPad')"
          aria-label="Submit PIN">✓</button>`;
      }
      if (k === '⌫') return `<button class="pin-key delete"
        onclick="lockScreen._key('${containerId}','del')"
        aria-label="Delete last digit">⌫</button>`;
      return `<button class="pin-key"
        onclick="lockScreen._key('${containerId}','${k}')"
        aria-label="${k}">${k}</button>`;
    }).join('');
  }

  // ── Update dot display ────────────────────────────────────────────────
  function updateDots(dotsId, length) {
    const el = document.getElementById(dotsId);
    if (!el) return;
    el.innerHTML = Array.from({ length: MAX_PIN_LEN }, (_, i) =>
      `<div class="pin-dot${i < length ? ' filled' : ''}"
            aria-hidden="true"></div>`
    ).join('');
  }

  function setError(errId, msg) {
    const el = document.getElementById(errId);
    if (el) el.textContent = msg;
  }

  // ── Key handler ───────────────────────────────────────────────────────
  function _key(padId, val) {
    const isSetup   = padId === 'setupPINPad';
    const dotsId    = isSetup ? 'setupPINDots' : 'unlockPINDots';
    const errId     = isSetup ? 'setupPINError' : 'unlockPINError';

    if (val === 'del') {
      _pin = _pin.slice(0, -1);
    } else if (_pin.length < MAX_PIN_LEN) {
      _pin += val;
      setError(errId, '');
    }

    updateDots(dotsId, _pin.length);

    // Auto-submit when max length reached
    if (_pin.length === MAX_PIN_LEN) {
      setTimeout(() => submit(isSetup), 80);
    }
    // Allow submit at min length on next key if already at max
  }

  // ── Submit handler ────────────────────────────────────────────────────
  async function submit(isSetup) {
    if (_pin.length < MIN_PIN_LEN) return;

    if (isSetup) {
      if (_mode === 'setup-first') {
        _firstPIN = _pin;
        _pin      = '';
        _mode     = 'setup-confirm';
        document.getElementById('setupStep').textContent = 'confirm your PIN';
        updateDots('setupPINDots', 0);
        setError('setupPINError', '');
        announce('PIN entered. Enter it again to confirm.');
      } else if (_mode === 'setup-confirm') {
        if (_pin !== _firstPIN) {
          _pin      = '';
          _firstPIN = '';
          _mode     = 'setup-first';
          updateDots('setupPINDots', 0);
          setError('setupPINError', 'PINs did not match — start again');
          document.getElementById('setupStep').textContent = 'set up your PIN';
          announce('PINs did not match. Please try again.');
          return;
        }
        await completePINSetup(_pin);
      }
    } else {
      await tryPINUnlock(_pin);
    }
  }

  // ── PIN setup ─────────────────────────────────────────────────────────
  async function completePINSetup(pin) {
    try {
      await SecureStore.setupPIN(pin);

      // Offer WebAuthn after PIN is set
      const available = await PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable()
        .catch(() => false);

      if (available) {
        const wantBio = confirm(
          'Set up fingerprint / face unlock? You will still need your PIN as a backup.'
        );
        if (wantBio) {
          try {
            const bio = await SecureStore.setupWebAuthn(pin);
            if (bio.hasPRF) {
              announce('Biometric unlock set up. Your fingerprint now unlocks your data directly.');
            } else {
              announce('Biometric set up. You will still need your PIN to decrypt data on this device.');
            }
          } catch(e) {
            console.warn('WebAuthn setup failed:', e.message);
            announce('Biometric setup failed. PIN only will be used.');
          }
        }
      }

      // Migrate existing data
      setError('setupPINError', '');
      document.getElementById('setupStep').textContent = 'migrating your data...';
      announce('PIN set. Migrating your existing data to encrypted storage.');

      const result = await SecureStore.migrateFromLocalStorage();
      console.log(`[SecureStore] Migrated ${result.migrated} keys`);

      dismiss();
    } catch(e) {
      setError('setupPINError', e.message);
      _pin = '';
      updateDots('setupPINDots', 0);
    }
  }

  // ── PIN unlock ────────────────────────────────────────────────────────
  async function tryPINUnlock(pin) {
    try {
      await SecureStore.unlockWithPIN(pin);
      _attempts = 0;
      dismiss();
    } catch(e) {
      _attempts++;
      _pin = '';
      updateDots('unlockPINDots', 0);

      if (_attempts >= MAX_ATTEMPTS) {
        setError('unlockPINError',
          `${MAX_ATTEMPTS} wrong attempts — try again in 30 seconds`);
        disablePad('unlockPINPad', 30);
        announce(`Too many wrong attempts. Disabled for 30 seconds.`);
      } else {
        const remaining = MAX_ATTEMPTS - _attempts;
        setError('unlockPINError',
          `wrong PIN — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`);
        announce(`Wrong PIN. ${remaining} attempts remaining.`);
      }
    }
  }

  // ── Biometric unlock ──────────────────────────────────────────────────
  async function tryBiometric() {
    const btn = document.getElementById('biometricBtn');
    if (btn) { btn.textContent = 'verifying...'; btn.disabled = true; }
    try {
      const result = await SecureStore.unlockWithWebAuthn();

      if (result.needsPIN === false) {
        // PRF success — key derived from fingerprint, fully unlocked
        announce('Biometric unlock successful.');
        dismiss();
      } else {
        // Presence-only — biometric verified but PIN still needed for key
        setError('unlockPINError', 'biometric verified — enter PIN to decrypt');
        if (btn) btn.style.display = 'none';
        announce('Biometric verified. Enter your PIN to decrypt your data.');
      }
    } catch(e) {
      if (btn) { btn.textContent = 'fingerprint / face unlock'; btn.disabled = false; }
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') {
        // User cancelled — silent
      } else {
        setError('unlockPINError', 'biometric failed — use your PIN');
        announce('Biometric failed. Please use your PIN.');
      }
    }
  }

  // ── Disable pad temporarily ───────────────────────────────────────────
  function disablePad(padId, seconds) {
    const pad  = document.getElementById(padId);
    const btns = pad?.querySelectorAll('.pin-key');
    if (!btns) return;
    btns.forEach(b => b.disabled = true);
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        btns.forEach(b => b.disabled = false);
        _attempts = 0;
        setError(padId.replace('Pad','Error'), '');
        announce('You can try your PIN again now.');
      }
    }, 1000);
  }

  // ── Show/hide ─────────────────────────────────────────────────────────
  async function show() {
    const el = document.getElementById('lockScreen');
    if (el) el.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const firstRun = await SecureStore.isFirstRun();

    if (firstRun) {
      _mode = 'setup-first';
      document.getElementById('lockSetup').style.display  = 'block';
      document.getElementById('lockUnlock').style.display = 'none';
      document.getElementById('setupStep').textContent    = 'set up your PIN';
      buildPad('setupPINPad');
      updateDots('setupPINDots', 0);
      announce('Welcome. Set up a PIN to encrypt your data.');
    } else {
      _mode = 'unlock';
      document.getElementById('lockSetup').style.display  = 'none';
      document.getElementById('lockUnlock').style.display = 'block';
      buildPad('unlockPINPad');
      updateDots('unlockPINDots', 0);

      // Check biometric availability
      const hasBio = await idbGet('__webauthn_cred') !== null;
      const btn    = document.getElementById('biometricBtn');
      if (btn && hasBio) {
        btn.style.display = 'block';
        // Auto-trigger biometric after a moment
        setTimeout(() => tryBiometric(), 500);
      }
      announce('App locked. Enter your PIN or use biometrics to unlock.');
    }
  }

  async function idbGet(key) {
    return SecureStore._idbGet('meta', key);
  }

  function dismiss() {
    const el = document.getElementById('lockScreen');
    if (el) el.style.display = 'none';
    document.body.style.overflow = '';
    _pin      = '';
    _firstPIN = '';
    // Initialise app
    initApp();
  }

  return { show, tryBiometric, _key, submit };
})();
