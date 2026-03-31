// ═════════════════════════════════════════════════════════════════
// MENU MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Hamburger menu ───────────────────────────────────────────────────────
let _menuPrevFocus = null;

function openMenu() {
  _menuPrevFocus = document.activeElement;
  const overlay = document.getElementById('menuOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  syncMenuUI();
  setTimeout(() => {
    const close = overlay.querySelector('.menu-close-btn');
    if (close) close.focus();
  }, 50);
  announce('Menu opened.');
}

function closeMenu() {
  const overlay = document.getElementById('menuOverlay');
  if (overlay) overlay.classList.add('hidden');
  if (_menuPrevFocus) _menuPrevFocus.focus();
  announce('Menu closed.');
}

function syncMenuUI() {
  const a11y  = cfg.a11y || {};
  const theme = cfg.theme || 'system';
  const dnd   = getDNDConfig ? getDNDConfig() : { enabled: false };

  ['system','light','dark'].forEach(t => {
    const el = document.getElementById('menuTheme' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) { el.classList.toggle('active', t === theme); el.setAttribute('aria-checked', t === theme ? 'true' : 'false'); }
  });

  const size = a11y.textSize || 'normal';
  ['Small','Normal','Large','XL'].forEach(s => {
    const el = document.getElementById('menuSize' + s);
    const key = s.toLowerCase();
    if (el) { el.classList.toggle('active', key === size); el.setAttribute('aria-checked', key === size ? 'true' : 'false'); }
  });

  const hcEl = document.getElementById('menuHighContrast');   if (hcEl) hcEl.checked = !!a11y.highContrast;
  const rmEl = document.getElementById('menuReduceMotion');   if (rmEl) rmEl.checked = !!a11y.reduceMotion;
  const ltEl = document.getElementById('menuLargeTargets');   if (ltEl) ltEl.checked = !!a11y.largeTouchTargets;
  const dndEl = document.getElementById('menuDND');           if (dndEl) dndEl.checked = dnd.enabled;

  const font = a11y.font || 'default';
  ['Default','Ibmplexmono','Atkinson','Opendyslexic','Comic'].forEach(f => {
    const el = document.getElementById('menuFont' + f);
    if (el) { el.classList.toggle('active', f.toLowerCase() === font); el.setAttribute('aria-checked', f.toLowerCase() === font ? 'true' : 'false'); }
  });
}

function updateMenuThemeUI() {
  const theme = cfg.theme || 'system';
  ['system','light','dark'].forEach(t => {
    const el = document.getElementById('menuTheme' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) { el.classList.toggle('active', t === theme); el.setAttribute('aria-checked', t === theme ? 'true' : 'false'); }
    const el2 = document.getElementById('themeOpt' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el2) { el2.classList.toggle('active', t === theme); el2.setAttribute('aria-checked', t === theme ? 'true' : 'false'); }
  });
}

// ── Menu sub-page navigation ─────────────────────────────────────────────
let _activeSubPage = null;

function openMenuSubPage(name) {
  const el = document.getElementById('subpage-' + name);
  if (!el) return;
  _activeSubPage = name;

  const menu = document.getElementById('menuOverlay');
  if (menu) {
    menu.classList.add('shifted');
  }

  // Populate sub-page content
  populateSubPage(name);

  el.classList.add('active');
  setTimeout(() => {
    const back = el.querySelector('.menu-back-btn');
    if (back) back.focus();
  }, 50);
  announce(name + ' settings opened.');
}

function closeMenuSubPage(name) {
  const el = document.getElementById('subpage-' + name);
  if (!el) return;

  el.classList.remove('active');

  // Restore menu smoothly via CSS transition
  const menu = document.getElementById('menuOverlay');
  if (menu) {
    menu.classList.remove('shifted');
  }
  _activeSubPage = null;
  // Return focus to the menu item that opened this
  announce('Returned to menu.');
}

function populateSubPage(name) {
  if (name === 'tasks') {
    renderSubpageTasks();
  }
  if (name === 'notifications') {
    renderSubpageNotifications();
  }
  if (name === 'timers') {
    renderSubpageTimers();
  }
  if (name === 'integrations') {
    renderSubpageIntegrations();
  }
  if (name === 'data') {
    renderSubpageData();
  }
}

function renderSubpageTasks() {
  // Sync name field
  const nameEl = document.getElementById('settingsName2');
  if (nameEl) nameEl.value = cfg.name || '';
  // Reuse existing render functions
  const critEl = document.getElementById('subTasksCritical');
  const dailyEl = document.getElementById('subTasksDaily');
  const symEl  = document.getElementById('subTasksSymptoms');
  if (critEl)  critEl.innerHTML  = document.getElementById('settingsCritical')?.innerHTML || '';
  if (dailyEl) dailyEl.innerHTML = document.getElementById('settingsDaily')?.innerHTML    || '';
  if (symEl)   symEl.innerHTML   = document.getElementById('settingsSymptoms')?.innerHTML || '';
}

function saveName2() {
  const val = document.getElementById('settingsName2')?.value?.trim();
  if (val) { cfg.name = val; saveConfig(cfg); applyName(val); announce('Name saved: ' + val); showToast('name saved ✓'); }
}

function addSymptomFromSub() {
  const input = document.getElementById('subNewSymInput');
  if (input) {
    document.getElementById('newSymInput').value = input.value;
    addSymptom();
    input.value = '';
    renderSubpageTasks();
  }
}

function renderSubpageNotifications() {
  const el = document.getElementById('subNotifContent');
  if (!el) return;
  // Clone the notification segments from settings page
  const segs = ['seg-task-notifs', 'seg-timer-notifs', 'seg-appt-notifs', 'seg-dnd'];
  el.innerHTML = '';
  segs.forEach(id => {
    const orig = document.getElementById(id);
    if (!orig) return;
    const section = orig.closest('.settings-segment');
    if (section) {
      const clone = section.cloneNode(true);
      // Re-wire onclick handlers — they reference same functions so work fine
      el.appendChild(clone);
    }
  });
  syncNotifPrefsUI();
  syncDNDUI();
  syncAudioUI();
}

function renderSubpageTimers() {
  const el = document.getElementById('subTimersContent');
  if (!el) return;
  el.innerHTML = `
    <div class="settings-segment" style="margin-bottom:var(--sp-4)">
      <h3 class="settings-section-title" style="margin-top:0">check-in window</h3>
      <div class="settings-task-row">
        <input type="time" id="subWindowTime"
               style="background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-mono);font-size:0.8125rem;padding:6px 10px;outline:none;flex:1"
               aria-label="Daily check-in window closing time">
        <button class="add-btn" onclick="saveSubWindowTime()">save</button>
        <button class="add-btn" onclick="clearWindowTime()">clear</button>
      </div>
    </div>
    <div class="settings-segment" style="margin-bottom:var(--sp-4)">
      <h3 class="settings-section-title" style="margin-top:0">task deadlines</h3>
      <div id="subTaskDeadlines"></div>
    </div>
    <div class="settings-segment" style="margin-bottom:var(--sp-4)">
      <h3 class="settings-section-title" style="margin-top:0">custom timers</h3>
      <div id="subCustomTimers"></div>
      <div class="settings-task-row" style="margin-top:8px">
        <input type="text" id="subNewTimerName" placeholder="timer name" maxlength="30" style="flex:2" aria-label="Timer name">
        <input type="number" id="subNewTimerMins" placeholder="mins" min="1" max="1440"
               style="flex:1;background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-mono);font-size:0.75rem;padding:6px 10px;outline:none"
               aria-label="Timer duration in minutes">
        <button class="add-btn" onclick="addSubCustomTimer()">+ add</button>
      </div>
    </div>
    <div class="settings-segment">
      <h3 class="settings-section-title" style="margin-top:0">do not disturb schedule</h3>
      <div id="subDNDContent"></div>
    </div>`;

  // Populate
  const wct = document.getElementById('subWindowTime');
  if (wct) wct.value = cfg.windowCloseTime || '';
  renderTaskDeadlineSettings();
  // Clone deadline and timer content
  const dlEl = document.getElementById('subTaskDeadlines');
  if (dlEl) dlEl.innerHTML = document.getElementById('taskDeadlineSettings')?.innerHTML || '';
  const ctEl = document.getElementById('subCustomTimers');
  if (ctEl) ctEl.innerHTML = document.getElementById('customTimerSettings')?.innerHTML || '';
  // DND
  const dndEl = document.getElementById('subDNDContent');
  if (dndEl) {
    dndEl.innerHTML = document.getElementById('dndWindowsList')?.parentElement?.innerHTML || '';
  }
  syncDNDUI();
}

function saveSubWindowTime() {
  const val = document.getElementById('subWindowTime')?.value;
  if (val) { cfg.windowCloseTime = val; saveConfig(cfg); updateWindowTimer(); showToast('window time saved ✓'); }
}

function addSubCustomTimer() {
  const name = document.getElementById('subNewTimerName')?.value?.trim();
  const mins = parseInt(document.getElementById('subNewTimerMins')?.value || '0');
  if (!name || !mins) { showToast('name and duration required'); return; }
  document.getElementById('newTimerName').value = name;
  document.getElementById('newTimerMins').value = mins;
  addCustomTimer();
  renderSubpageTimers();
}

function renderSubpageIntegrations() {
  const el = document.getElementById('subIntegrationsContent');
  if (!el) return;
  // Clone Telegram and AI quotes segments
  const segs = ['seg-telegram', 'seg-quotes'];
  el.innerHTML = '';
  segs.forEach(id => {
    const orig = document.getElementById(id);
    if (!orig) return;
    const section = orig.closest('.settings-segment');
    if (section) el.appendChild(section.cloneNode(true));
  });
  syncQuoteSettingsUI();
  // Sync Telegram status
  const storedKey = sessionStorage.getItem('tracker-anthropic-key');
  if (storedKey) {
    const keyEl = el.querySelector('#anthropicKey');
    if (keyEl) keyEl.value = storedKey;
  }
}

function renderSubpageData() {
  const el = document.getElementById('subDataContent');
  if (!el) return;
  const seg = document.getElementById('seg-data');
  if (seg) {
    const section = seg.closest('.settings-segment');
    if (section) el.innerHTML = section.cloneNode(true).innerHTML;
  }
  renderBucketLimitSettings();
}

// Close sub-page on back button / Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _activeSubPage) {
    closeMenuSubPage(_activeSubPage);
  }
});

// ── Spend modal ───────────────────────────────────────────────────────────
function openSpendModal(id) {
  const overlay = document.getElementById('spendModalOverlay');
  if (!overlay) return;
  document.getElementById('spendEditId').value = id || '';
  document.getElementById('spendModalTitle').textContent = id ? '// edit expense' : '// log expense';
  if (id) {
    const spend = getSpends().find(s => s.id === id);
    if (spend) {
      document.getElementById('spendAmount').value   = spend.amount;
      const bucketEl = document.getElementById('spendBucket');
      if (bucketEl) bucketEl.value = spend.bucket || 'daily';
      document.getElementById('spendCategory').value = spend.category || 'other';
      document.getElementById('spendNote').value     = spend.note || '';
      document.getElementById('spendDate').value     = spend.date;
    }
  } else {
    document.getElementById('spendAmount').value   = '';
    const bucketEl = document.getElementById('spendBucket');
    if (bucketEl) bucketEl.value = 'daily';
    document.getElementById('spendCategory').value = 'food';
    document.getElementById('spendNote').value     = '';
    document.getElementById('spendDate').value     = TODAY;
  }
  const fn = document.getElementById('frictionNotice');
  if (fn) fn.classList.remove('visible');
  overlay.classList.remove('hidden');
  setTimeout(() => document.getElementById('spendAmount')?.focus(), 100);
}

function closeSpendModal() {
  const overlay = document.getElementById('spendModalOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function saveSpend() {
  const amount = parseFloat(document.getElementById('spendAmount')?.value);
  const date   = document.getElementById('spendDate')?.value;
  if (isNaN(amount) || amount <= 0) { showToast('enter a valid amount'); return; }
  if (!date) { showToast('select a date'); return; }

  const spends  = getSpends();
  const editId  = document.getElementById('spendEditId')?.value;
  const rawAmount = Math.round(amount * 100) / 100;
  const spend   = {
    id:       editId || 'sp_' + Date.now(),
    amount:   rawAmount,
    bucket:   document.getElementById('spendBucket')?.value || 'daily',
    category: document.getElementById('spendCategory')?.value || 'other',
    note:     sanitiseInput(document.getElementById('spendNote')?.value, 100),
    date,
    flagged:  false,
  };

  function doSave(flagged) {
    if (flagged) spend.flagged = true;
    if (editId) {
      const idx = spends.findIndex(s => s.id === editId);
      if (idx > -1) spends[idx] = spend; else spends.push(spend);
    } else {
      spends.push(spend);
    }
    spends.sort((a,b) => b.date.localeCompare(a.date));
    saveSpends(spends);
    closeSpendModal();
    renderBudgetTab();
    renderDailyCard();
    renderBucketCards();
    const bucketName = BUCKET_DEFS[spend.bucket]?.label || spend.bucket;
    announce('Expense logged: $' + spend.amount.toFixed(2) + ' from ' + bucketName + ' bucket.');
    hapticSuccess();
  }
  checkFriction(rawAmount, doSave);
}

function deleteSpend(id) {
  saveSpends(getSpends().filter(s => s.id !== id));
  renderBudgetTab();
  announce('Expense deleted.');
}

// ── Daily card on Today tab ───────────────────────────────────────────────
function renderDailyCard() {
  const card = document.getElementById('dailySpendCard');
  if (!card) return;
  const buckets  = getBuckets();
  const dailyLim = buckets.daily?.limit || 0;
  if (dailyLim === 0) { card.style.display = 'none'; return; }
  card.style.display = 'block';

  const spends     = getSpends();
  const todayTotal = spends
    .filter(s => s.date === TODAY && s.bucket === 'daily')
    .reduce((t,s) => t + s.amount, 0);
  const remaining = Math.max(0, dailyLim - todayTotal);
  const pct       = Math.min(100, (todayTotal / dailyLim) * 100);
  const tight     = pct > 80;

  const remEl   = document.getElementById('dailyRemaining');
  const barEl   = document.getElementById('dailyBar');
  const spentEl = document.getElementById('dailySpent');
  const limEl   = document.getElementById('dailyLimit');
  if (remEl)   { remEl.textContent = '$' + remaining.toFixed(0); remEl.classList.toggle('tight', tight); }
  if (barEl)   { barEl.style.width = pct + '%'; barEl.style.background = tight ? 'var(--warning)' : 'var(--success)'; }
  if (spentEl) spentEl.textContent = '$' + todayTotal.toFixed(2) + ' spent today';
  if (limEl)   limEl.textContent   = 'of $' + dailyLim.toFixed(0) + ' limit';
}

// ── Dopamine / want list ──────────────────────────────────────────────────
function renderDopamineList() {
  const el = document.getElementById('dopamineList');
  if (!el) return;
  const list = getDopamineList ? getDopamineList() : [];
  if (list.length === 0) {
    el.innerHTML = '<p style="font-family:var(--font-mono);font-size:0.6875rem;color:var(--text3);margin-bottom:8px">nothing on the want list yet</p>';
    return;
  }
  el.innerHTML = list.map(item => {
    const bucket = BUCKET_DEFS[item.bucket] || BUCKET_DEFS.daily;
    return `
    <div class="dopamine-item${item.gotIt ? ' got-it' : ''}"
         role="article" aria-label="${escHtml(item.name)}${item.gotIt ? ', purchased' : ''}">
      <div class="dopamine-want" aria-hidden="true">
        ${[1,2,3,4,5].map(i => `<span class="want-star${i<=(item.want||3)?' lit':''}" style="cursor:default">★</span>`).join('')}
      </div>
      <div class="dopamine-info">
        <div class="dopamine-name">${escHtml(item.name)}</div>
        <div class="dopamine-meta">${bucket.icon} ${bucket.label}${item.gotIt ? ' · got it '+(item.gotDate||'') : ''}</div>
      </div>
      ${item.cost > 0 ? `<div class="dopamine-cost">$${item.cost.toFixed(0)}</div>` : ''}
      <div class="dopamine-actions">
        ${!item.gotIt ? `<button class="dopamine-btn got" onclick="markGotIt('${item.id}')" aria-label="Mark as purchased">got it</button>` : ''}
        <button class="dopamine-btn" onclick="openDopamineModal('${item.id}')" aria-label="Edit">edit</button>
        <button class="dopamine-btn" onclick="deleteDopamineItem('${item.id}')" aria-label="Remove">×</button>
      </div>
    </div>`;
  }).join('');
}

// Close menus on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const menuEl = document.getElementById('menuOverlay');
    if (menuEl && !menuEl.classList.contains('hidden')) { closeMenu(); return; }
    if (_activeSubPage) { closeMenuSubPage(_activeSubPage); return; }
    const apptEl = document.getElementById('apptModalOverlay');
    if (apptEl && !apptEl.classList.contains('hidden')) { closeApptModal(); return; }
    const spendEl = document.getElementById('spendModalOverlay');
    if (spendEl && !spendEl.classList.contains('hidden')) { closeSpendModal(); return; }
  }
});
