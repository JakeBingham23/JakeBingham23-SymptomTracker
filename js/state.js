// ═══════════════════════════════════════════════════════════════════════════
// STATE MODULE — App State, TODAY, CRITICAL/DAILY/SYMPTOMS
// Daily Structure Tracker
// ═══════════════════════════════════════════════════════════════════════════

// TODAY — used throughout the app
const TODAY = new Date().toISOString().split('T')[0];

// Task and symptom lists — populated from config after config.js loads
// Defaults applied in config.js via DEFAULT_CRITICAL etc
let CRITICAL  = cfg.critical  || DEFAULT_CRITICAL;
let DAILY     = cfg.daily     || DEFAULT_DAILY;
let SYMPTOMS  = cfg.symptoms  || DEFAULT_SYMPTOMS;

// ── Theme ─────────────────────────────────────

// ── App state ─────────────────────────────────────────────────────────────
let state = {
  tasks: {},
  mood: { energy: '', mood: '' },
  symptoms: [],
  notes: '',
  medStreak: 0
};

function getKey(date) { return 'tracker-' + date; }
function getStreakKey() { return 'tracker-med-streak'; }

function loadState() {
  try {
    const raw = localStorage.getItem(getKey(TODAY));
    if (raw) Object.assign(state, JSON.parse(raw));
    const streak = localStorage.getItem(getStreakKey());
    if (streak) state.medStreak = parseInt(streak) || 0;
  } catch(e) {}
  render();
}

function saveState() {
  try {
    localStorage.setItem(getKey(TODAY), JSON.stringify(state));
    // persist streak against any meds task
    const hasMeds = CRITICAL.some(t => t.id === 'meds');
    if (hasMeds) localStorage.setItem(getStreakKey(), String(state.medStreak));
  } catch(e) {}
}

function toggleTask(id) {
  state.tasks[id] = !state.tasks[id];
  const done = state.tasks[id];
  // Find task name for announcement
  const task = [...CRITICAL, ...DAILY].find(t => t.id === id);
  const name = task ? task.name : id;
  if (id === 'meds') {
    state.medStreak = done
      ? (state.medStreak || 0) + 1
      : Math.max(0, (state.medStreak || 0) - 1);
    if (done) {
      announce(name + ' marked done. Medication streak: ' + state.medStreak + ' days.');
      checkStreakMilestone(state.medStreak);
    } else {
      announce(name + ' unmarked. Medication streak reset to ' + state.medStreak + '.');
    }
  } else {
    announce(name + (done ? ' marked done.' : ' unmarked.'));
  }
  if (done) {
    const isNonNeg = CRITICAL.some(t => t.id === id);
    celebrateTask(id, name, isNonNeg);
  }
  saveState();
  render();
  // Update aria-pressed on the toggled element
  const taskEls = document.querySelectorAll('.task');
  taskEls.forEach(el => {
    const onclick = el.getAttribute('onclick') || '';
    if (onclick.includes(id)) {
      el.setAttribute('aria-pressed', done ? 'true' : 'false');
    }
  });
}

function setMood(type, btn) {
  const val = btn.textContent;
  state.mood[type] = val;
  announce(type + ' set to ' + val + '.');
  // Update aria-pressed on all buttons in this group
  const opts = document.querySelectorAll('#' + type + 'Opts .mood-btn');
  opts.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
  saveState();
  render();
}

function toggleSymptom(s) {
  const i = state.symptoms.indexOf(s);
  if (i > -1) {
    state.symptoms.splice(i, 1);
    announce(s + ' symptom flag removed.');
  } else {
    state.symptoms.push(s);
    announce(s + ' symptom flagged.');
  }
  saveState();
  render();
}

function saveAll() {
  state.notes = document.getElementById('symptomNotes').value;
  saveState();
  saveHistoryEntry();
  const c = document.getElementById('saveConfirm');
  c.style.display = 'block';
  setTimeout(() => { c.style.display = 'none'; }, 2500);
  const all  = [...CRITICAL, ...DAILY];
  const done = all.filter(t => state.tasks[t.id]).length;
  announce('Check-in saved. ' + done + ' of ' + all.length + ' tasks completed today. Mood: ' + (state.mood.mood || 'not set') + '. Energy: ' + (state.mood.energy || 'not set') + '.');
  checkBadges();
  renderPointsDisplay();
  // Show personalised post check-in message
  showCheckinMessage();
}

function saveHistoryEntry() {
  const all = [...(CRITICAL||[]), ...(DAILY||[])];
  const done = all.filter(t => state.tasks[t.id]).length;
  const entry = {
    date: TODAY, done, total: all.length,
    mood: state.mood.mood, energy: state.mood.energy,
    flags: state.symptoms.length
  };
  try {
    const existing = JSON.parse(localStorage.getItem('tracker-history') || '[]');
    const filtered = existing.filter(e => e.date !== TODAY);
    filtered.unshift(entry);
    localStorage.setItem('tracker-history', JSON.stringify(filtered.slice(0, 14)));
  } catch(e) {}
}

// Holds the blob + filename while preview is open
let _pendingScreenshot = null;

async function takePhoto() {
  const btn = document.querySelector('button[onclick="takePhoto()"]');
  const target = document.getElementById('symptomBlock');

  if (btn) { btn.textContent = 'capturing…'; btn.classList.add('loading'); }

  try {
    // Resolve the actual background colour so canvas isn't transparent
    const bgColor = getComputedStyle(document.body).backgroundColor || '#0f0f0f';

    const canvas = await html2canvas(target, {
      backgroundColor: bgColor,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 0,
      removeContainer: true
    });

    resetBtn(btn);

    const filename = 'tracker-checkin-' + TODAY + '.png';
    const dataUrl  = canvas.toDataURL('image/png');

    // Show preview so user can confirm it looks right before saving
    canvas.toBlob(blob => {
      _pendingScreenshot = { blob, filename, dataUrl };
      document.getElementById('previewImg').src = dataUrl;
      document.getElementById('previewFilename').textContent = filename;
      document.getElementById('previewOverlay').classList.remove('hidden');
      setTimeout(() => {
        const saveBtn = document.querySelector('#previewOverlay .btn.primary');
        if (saveBtn) saveBtn.focus();
      }, 100);
    }, 'image/png');

  } catch (err) {
    console.error('Capture failed:', err);
    if (btn) { btn.textContent = 'failed — try again'; btn.classList.remove('loading'); }
    setTimeout(() => resetBtn(btn), 3000);
  }
}

function closePreview() {
  document.getElementById('previewOverlay').classList.add('hidden');
  _pendingScreenshot = null;
  // Return focus to screenshot button
  const btn = document.querySelector('button[onclick="takePhoto()"]');
  if (btn) btn.focus();
}

// Persisted folder handle for direct gallery saves
// ── Persistent folder handle (survives page reloads via IndexedDB) ────────
let _galleryDirHandle = null;
const IDB_NAME    = 'tracker-fs';
const IDB_STORE   = 'handles';
const IDB_KEY     = 'gallery-folder';

function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE))       db.createObjectStore(IDB_STORE);
      if (!db.objectStoreNames.contains(IDB_AUDIO_STORE)) db.createObjectStore(IDB_AUDIO_STORE);
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}

async function saveFolderHandle(handle) {
  try {
    const db    = await openIDB();
    const tx    = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch(e) { console.warn('Could not persist folder handle:', e); }
}

async function loadFolderHandle() {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const handle = await new Promise((res, rej) => {
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
    db.close();
    return handle || null;
  } catch(e) { return null; }
}

async function getGalleryFolder(forceNew) {
  // 1. Try cached in-memory handle
  if (!forceNew && _galleryDirHandle) {
    try {
      const perm = await _galleryDirHandle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return _galleryDirHandle;
      // Permission lapsed — re-request
      const req = await _galleryDirHandle.requestPermission({ mode: 'readwrite' });
      if (req === 'granted') return _galleryDirHandle;
    } catch(e) { _galleryDirHandle = null; }
  }

  // 2. Try persisted handle from IndexedDB
  if (!forceNew) {
    const saved = await loadFolderHandle();
    if (saved) {
      try {
        const perm = await saved.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') { _galleryDirHandle = saved; return saved; }
        const req = await saved.requestPermission({ mode: 'readwrite' });
        if (req === 'granted') { _galleryDirHandle = saved; return saved; }
      } catch(e) {}
    }
  }

  // 3. Show folder picker — guide user to create/select SymptomTracker folder
  try {
    showToast('select or create a "SymptomTracker" folder in Pictures');
    const handle = await window.showDirectoryPicker({
      startIn: 'pictures',
      mode:    'readwrite',
      id:      'symptom-tracker'
    });
    _galleryDirHandle = handle;
    await saveFolderHandle(handle);
    showToast('folder set: ' + handle.name + ' — saves will go here automatically');
    return handle;
  } catch(e) {
    if (e.name !== 'AbortError') console.warn('Folder picker failed:', e);
    return null;
  }
}
