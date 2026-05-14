// ═════════════════════════════════════════════════════════════════
// STATE MODULE — Daily Structure Tracker v5
//
// OWNS: state object, loadState(), saveState(), saveHistoryEntry(),
//       screenshot, gallery folder (IDB).
//
// DOES NOT OWN: TODAY, CRITICAL, DAILY, SYMPTOMS → core.js
//               render, saveAll, toggleTask, setMood, toggleSymptom → core.js
//
// Load order: after config.js, symptoms/config.js — before core.js
// ═════════════════════════════════════════════════════════════════

// CRITICAL, DAILY, SYMPTOMS declared in core.js — do not redefine here


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
    const raw = Store.get(getKey(TODAY));
    if (raw && typeof raw === 'object') Object.assign(state, raw);
    const streak = Store.get(getStreakKey());
    if (streak) state.medStreak = parseInt(streak) || 0;
  } catch(e) {}
  render();
}

function saveState() {
  try {
    Store.set(getKey(TODAY), state);
    // persist streak against any meds task
    const hasMeds = CRITICAL.some(t => t.id === 'meds');
    if (hasMeds) Store.set(getStreakKey(), String(state.medStreak));
  } catch(e) {}
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
    const existing = JSON.parse(JSON.stringify(Store.get('tracker-history') || []));
    const filtered = existing.filter(e => e.date !== TODAY);
    filtered.unshift(entry);
    Store.set('tracker-history', filtered.slice(0, 14));
  } catch(e) {}
}

// Holds the blob + filename while preview is open
let _pendingScreenshot = null;

async function takePhoto() {
  const btn = document.querySelector('button[onclick="takePhoto()"]');

  if (btn) { btn.textContent = 'capturing…'; btn.classList.add('loading'); }

  try {
    if (typeof renderCheckinImage !== 'function') {
      throw new Error('renderCheckinImage not loaded');
    }
    const canvas = renderCheckinImage();

    resetBtn(btn);

    const filename = 'tracker-checkin-' + TODAY + '.png';
    const dataUrl  = canvas.toDataURL('image/png');

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
