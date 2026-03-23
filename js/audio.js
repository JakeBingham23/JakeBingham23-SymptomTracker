// ═════════════════════════════════════════════════════════════════
// AUDIO MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Audio system ─────────────────────────────────────────────────────────
let _audioCtx = null;
const IDB_AUDIO_STORE = 'audio';

function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playChime(volume) {
  const ctx = getAudioCtx();
  const vol = (volume ?? 80) / 100;
  const freqs = [523, 659, 784, 1047];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol * 0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t); osc.stop(t + 0.45);
  });
}

function playBeep(volume) {
  const ctx = getAudioCtx();
  const vol = (volume ?? 80) / 100;
  [0, 0.25].forEach(offset => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = 880;
    const t = ctx.currentTime + offset;
    gain.gain.setValueAtTime(vol * 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t); osc.stop(t + 0.2);
  });
}

function playAlarm(volume) {
  const ctx = getAudioCtx();
  const vol = (volume ?? 80) / 100;
  [0, 0.15, 0.3].forEach(offset => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = 1200 - offset * 800;
    const t = ctx.currentTime + offset;
    gain.gain.setValueAtTime(vol * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.start(t); osc.stop(t + 0.15);
  });
}

async function saveAudioFile(type, file) {
  try {
    const db  = await openIDB();
    const buf = await file.arrayBuffer();
    const tx  = db.transaction(IDB_AUDIO_STORE, 'readwrite');
    tx.objectStore(IDB_AUDIO_STORE).put({ buf, name: file.name, mime: file.type }, type + '-audio');
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch(e) { console.warn('Could not save audio:', e); }
}

async function loadAudioFile(type) {
  try {
    const db  = await openIDB();
    const tx  = db.transaction(IDB_AUDIO_STORE, 'readonly');
    const rec = await new Promise((res, rej) => {
      const req = tx.objectStore(IDB_AUDIO_STORE).get(type + '-audio');
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
    db.close();
    return rec || null;
  } catch(e) { return null; }
}

async function playCustomAudio(type, volume) {
  const rec = await loadAudioFile(type);
  if (!rec) return false;
  const ctx    = getAudioCtx();
  const buf    = await ctx.decodeAudioData(rec.buf.slice(0));
  const source = ctx.createBufferSource();
  const gain   = ctx.createGain();
  source.buffer = buf;
  gain.gain.value = (volume ?? 80) / 100;
  source.connect(gain); gain.connect(ctx.destination);
  source.start();
  return true;
}

async function playAlertSound(type) {
  const prefs  = cfg.notifPrefs || {};
  const tone   = prefs[type + 'Snd'] || 'none';
  const volume = prefs[type + 'Vol'] ?? 80;
  if (tone === 'none') return;
  try { await getAudioCtx().resume(); } catch(e) {}
  if (tone === 'chime')  { playChime(volume);  return; }
  if (tone === 'beep')   { playBeep(volume);   return; }
  if (tone === 'alarm')  { playAlarm(volume);  return; }
  if (tone === 'custom') { await playCustomAudio(type, volume); }
}

function setAudioTone(type, tone) {
  if (!cfg.notifPrefs) cfg.notifPrefs = {};
  cfg.notifPrefs[type + 'Snd'] = tone;
  saveConfig(cfg);
  ['none','chime','beep','alarm','custom'].forEach(t => {
    const el = document.getElementById(type + 'Snd-' + t);
    if (el) { el.classList.toggle('active', t === tone); el.setAttribute('aria-pressed', t === tone ? 'true' : 'false'); }
  });
  const customRow = document.getElementById(type + 'CustomRow');
  if (customRow) customRow.style.display = tone === 'custom' ? 'flex' : 'none';
  announce(type + ' sound set to ' + tone + '.');
  if (tone !== 'none' && tone !== 'custom') playAlertSound(type);
}

async function uploadCustomSound(type, input) {
  const file = input.files[0];
  if (!file) return;
  await saveAudioFile(type, file);
  const nameEl = document.getElementById(type + 'FileName');
  if (nameEl) nameEl.textContent = file.name;
  announce('Custom sound uploaded: ' + file.name);
  setTimeout(() => playAlertSound(type), 300);
}

async function previewTone(type) {
  await playAlertSound(type);
  announce('Previewing ' + type + ' sound.');
}

function setVolume(type, val) {
  if (!cfg.notifPrefs) cfg.notifPrefs = {};
  cfg.notifPrefs[type + 'Vol'] = parseInt(val);
  saveConfig(cfg);
  const valEl = document.getElementById(type + 'VolVal');
  if (valEl) valEl.textContent = val + '%';
}

function syncAudioUI() {
  const prefs = cfg.notifPrefs || {};
  ['task','timer','appt'].forEach(type => {
    const tone = prefs[type + 'Snd'] || 'none';
    ['none','chime','beep','alarm','custom'].forEach(t => {
      const el = document.getElementById(type + 'Snd-' + t);
      if (el) { el.classList.toggle('active', t === tone); el.setAttribute('aria-pressed', t === tone ? 'true' : 'false'); }
    });
    const customRow = document.getElementById(type + 'CustomRow');
    if (customRow) customRow.style.display = tone === 'custom' ? 'flex' : 'none';
    const vol = prefs[type + 'Vol'] ?? 80;
    const volEl = document.getElementById(type + 'Vol');
    if (volEl) volEl.value = vol;
    const valEl = document.getElementById(type + 'VolVal');
    if (valEl) valEl.textContent = vol + '%';
    if (tone === 'custom') {
      loadAudioFile(type).then(rec => {
        const nameEl = document.getElementById(type + 'FileName');
        if (nameEl && rec) nameEl.textContent = rec.name;
      });
    }
  });
}

// ── Celebration sounds — rich audio for all users including blind ─────────

// Haptic patterns per celebration type
const HAPTIC = {
  task:         [40, 20, 80],                          // quick double
  allDone:      [80, 40, 80, 40, 200],                 // two bumps + long
  badge:        [30, 20, 30, 20, 30, 40, 150],         // triple tap + long
  streak7:      [100, 50, 100, 50, 300],               // firm double + long
  streak30:     [100, 50, 100, 50, 100, 50, 400],      // triple firm + long
  streak100:    [200, 80, 200, 80, 200, 80, 600],      // strong triple + boom
  streak365:    [300, 100, 300, 100, 300, 100, 800],   // max intensity
  points:       [30, 20, 60],                          // light confirm
};

function hap(type) {
  const reduceMotion = (cfg.a11y || {}).reduceMotion;
  if (navigator.vibrate && !reduceMotion) {
    navigator.vibrate(HAPTIC[type] || HAPTIC.task);
  }
}

// Task completion — ascending 5-note chime
function playSuccess() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    [523, 659, 784, 1047, 1319].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t); osc.stop(t + 0.4);
    });
  } catch(e) {}
}

// All non-negotiables done — triumphant resolution chord
function playAllDoneSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // Rising arpeggio then held chord
    [[523,0,'sine'],[659,0.12,'sine'],[784,0.24,'sine'],[1047,0.36,'sine'],
     [523,0.55,'triangle'],[659,0.55,'triangle'],[784,0.55,'triangle']].forEach(([freq,t,type]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      const st = now + t;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(t >= 0.55 ? 0.15 : 0.25, st + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, st + (t >= 0.55 ? 1.2 : 0.35));
      osc.start(st); osc.stop(st + (t >= 0.55 ? 1.3 : 0.4));
    });
  } catch(e) {}
}

// Badge earned — distinctive two-tone chime
function playBadgeSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    [[880,0],[1108,0.2],[880,0.45],[1320,0.6]].forEach(([freq,t]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const st = now + t;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.2, st + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.5);
      osc.start(st); osc.stop(st + 0.55);
    });
  } catch(e) {}
}

// Streak milestone — full fanfare, scaled by milestone size
function playMilestoneSound(days) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // Longer, richer fanfare for bigger milestones
    const notes = days >= 100
      ? [[523,0],[659,0.15],[784,0.3],[1047,0.5],[784,0.7],[1047,0.85],[1319,1.1],[1047,1.4],[1319,1.6]]
      : [[523,0],[659,0.15],[784,0.3],[1047,0.5],[784,0.7],[1047,0.85],[1319,1.0]];
    notes.forEach(([freq, t]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const st = now + t;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.3, st + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.45);
      osc.start(st); osc.stop(st + 0.5);
    });
  } catch(e) {}
}

// Points earned — quiet ascending two-note confirm
function playPointsSound(mult) {
  try {
    const ctx  = getAudioCtx();
    const now  = ctx.currentTime;
    const freq = mult > 1 ? 880 : 660;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 1.5, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now); osc.stop(now + 0.28);
  } catch(e) {}
}
