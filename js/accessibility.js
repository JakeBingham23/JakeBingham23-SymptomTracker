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

// announce() is defined in core.js

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

// ── Category-aware symptom management ────────────────────────────────────

function addSymptomToCategory(catId, name) {
  const cat = SYMPTOM_CATS.find(c => c.id === catId);
  if (!cat || !name) return;
  const val = name.trim().toLowerCase();
  if (!val || cat.symptoms.includes(val)) return;
  cat.symptoms.push(val);
  cfg.symptomCats = SYMPTOM_CATS;
  saveConfig(cfg);
  renderSymptomCatSettings();
  render();
}

function removeSymptomFromCategory(catId, name) {
  const cat = SYMPTOM_CATS.find(c => c.id === catId);
  if (!cat) return;
  cat.symptoms = cat.symptoms.filter(s => s !== name);
  cfg.symptomCats = SYMPTOM_CATS;
  saveConfig(cfg);
  renderSymptomCatSettings();
  render();
}

function addCategory() {
  const inp = document.getElementById('newCatInput');
  if (!inp) return;
  const label = inp.value.trim();
  if (!label) return;
  const id = 'cat_' + Date.now();
  SYMPTOM_CATS.push({ id, label: label.toLowerCase(), color: 'var(--accent)', symptoms: [] });
  cfg.symptomCats = SYMPTOM_CATS;
  saveConfig(cfg);
  inp.value = '';
  renderSymptomCatSettings();
}

function removeCategory(catId) {
  const idx = SYMPTOM_CATS.findIndex(c => c.id === catId);
  if (idx === -1) return;
  SYMPTOM_CATS.splice(idx, 1);
  cfg.symptomCats = SYMPTOM_CATS;
  saveConfig(cfg);
  renderSymptomCatSettings();
  render();
}

function moveCategoryUp(catId) {
  const idx = SYMPTOM_CATS.findIndex(c => c.id === catId);
  if (idx <= 0) return;
  [SYMPTOM_CATS[idx-1], SYMPTOM_CATS[idx]] = [SYMPTOM_CATS[idx], SYMPTOM_CATS[idx-1]];
  cfg.symptomCats = SYMPTOM_CATS;
  saveConfig(cfg);
  renderSymptomCatSettings();
  render();
}

function moveCategoryDown(catId) {
  const idx = SYMPTOM_CATS.findIndex(c => c.id === catId);
  if (idx === -1 || idx >= SYMPTOM_CATS.length - 1) return;
  [SYMPTOM_CATS[idx], SYMPTOM_CATS[idx+1]] = [SYMPTOM_CATS[idx+1], SYMPTOM_CATS[idx]];
  cfg.symptomCats = SYMPTOM_CATS;
  saveConfig(cfg);
  renderSymptomCatSettings();
  render();
}

function moveSymptomUp(catId, name) {
  const cat = SYMPTOM_CATS.find(c => c.id === catId);
  if (!cat) return;
  const idx = cat.symptoms.indexOf(name);
  if (idx <= 0) return;
  [cat.symptoms[idx-1], cat.symptoms[idx]] = [cat.symptoms[idx], cat.symptoms[idx-1]];
  cfg.symptomCats = SYMPTOM_CATS;
  saveConfig(cfg);
  renderSymptomCatSettings();
  render();
}

function moveSymptomDown(catId, name) {
  const cat = SYMPTOM_CATS.find(c => c.id === catId);
  if (!cat) return;
  const idx = cat.symptoms.indexOf(name);
  if (idx === -1 || idx >= cat.symptoms.length - 1) return;
  [cat.symptoms[idx], cat.symptoms[idx+1]] = [cat.symptoms[idx+1], cat.symptoms[idx]];
  cfg.symptomCats = SYMPTOM_CATS;
  saveConfig(cfg);
  renderSymptomCatSettings();
  render();
}

function renderSymptomCatSettings() {
  const targets = [
    document.getElementById('settingsSymptoms'),
    document.getElementById('subSettingsSymptoms'),
  ].filter(Boolean);
  if (!targets.length) return;

  const html = SYMPTOM_CATS.map((cat, ci) => `
    <div class="sym-cat-settings-block" data-cat-id="${escHtml(cat.id)}">
      <div class="sym-cat-settings-header">
        <span class="sym-cat-settings-label">${escHtml(cat.label)}</span>
        <div class="sym-cat-settings-actions">
          ${ci > 0 ? `<button class="sym-reorder-btn" onclick="moveCategoryUp('${escHtml(cat.id)}')" aria-label="move ${escHtml(cat.label)} up">↑</button>` : ''}
          ${ci < SYMPTOM_CATS.length-1 ? `<button class="sym-reorder-btn" onclick="moveCategoryDown('${escHtml(cat.id)}')" aria-label="move ${escHtml(cat.label)} down">↓</button>` : ''}
          <button class="del-btn" onclick="removeCategory('${escHtml(cat.id)}')" aria-label="remove ${escHtml(cat.label)} category">×</button>
        </div>
      </div>
      <div class="sym-edit-grid">
        ${cat.symptoms.map((s, si) => `
          <div class="sym-edit-chip">
            <span>${escHtml(s)}</span>
            <div class="sym-chip-actions">
              ${si > 0 ? `<button onclick="moveSymptomUp('${escHtml(cat.id)}', ${JSON.stringify(s)})" aria-label="move ${escHtml(s)} up">↑</button>` : ''}
              ${si < cat.symptoms.length-1 ? `<button onclick="moveSymptomDown('${escHtml(cat.id)}', ${JSON.stringify(s)})" aria-label="move ${escHtml(s)} down">↓</button>` : ''}
              <button onclick="removeSymptomFromCategory('${escHtml(cat.id)}', ${JSON.stringify(s)})" aria-label="remove ${escHtml(s)}">×</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="sym-add-row" style="margin-top:4px">
        <input type="text" placeholder="add symptom" maxlength="40"
               id="newSym_${escHtml(cat.id)}"
               aria-label="new symptom for ${escHtml(cat.label)}"
               onkeydown="if(event.key==='Enter'){addSymptomToCategory('${escHtml(cat.id)}',this.value);this.value='';}">
        <button class="add-btn"
                onclick="addSymptomToCategory('${escHtml(cat.id)}',document.getElementById('newSym_${escHtml(cat.id)}').value);document.getElementById('newSym_${escHtml(cat.id)}').value=''">
          + add
        </button>
      </div>
    </div>
  `).join('') + `
    <div class="sym-add-row" style="margin-top:12px;border-top:0.5px solid var(--border);padding-top:12px">
      <input type="text" id="newCatInput" placeholder="new category name" maxlength="30"
             aria-label="New category name"
             onkeydown="if(event.key==='Enter')addCategory()">
      <button class="add-btn" onclick="addCategory()">+ category</button>
    </div>`;

  targets.forEach(t => { t.innerHTML = html; });
}

// Legacy stubs — keep so old callers don't throw
function removeSymptom(idx) {
  // Find which category this flat index maps to and remove
  let count = 0;
  for (const cat of SYMPTOM_CATS) {
    for (let i = 0; i < cat.symptoms.length; i++) {
      if (count === idx) { removeSymptomFromCategory(cat.id, cat.symptoms[i]); return; }
      count++;
    }
  }
}

function addSymptom() {
  // Add to first category by default (legacy flat-add path)
  const inp = document.getElementById('newSymInput') || document.getElementById('subNewSymInput');
  if (!inp || !inp.value.trim()) return;
  const cat = SYMPTOM_CATS[0];
  if (cat) addSymptomToCategory(cat.id, inp.value);
  inp.value = '';
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

// render() is defined in core.js

