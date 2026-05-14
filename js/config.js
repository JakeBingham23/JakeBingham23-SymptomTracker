// ═════════════════════════════════════════════════════════════════
// CONFIG MODULE — Daily Structure Tracker v5
// OWNS: cfg object, task/symptom defaults, saveConfig/loadConfig, fonts
// DOES NOT OWN: TODAY, CRITICAL, DAILY, SYMPTOMS live vars → core.js
// Load order: 2nd (after crypto.js)
// ═════════════════════════════════════════════════════════════════

const DEFAULT_CRITICAL = [
  { id:'meds',   name:'take meds',     sub:'non-negotiable. no excuses.' },
  { id:'shower', name:'shower',        sub:'yes, this one counts too' },
  { id:'eat1',   name:'eat something', sub:'first meal' },
];
const DEFAULT_DAILY = [
  { id:'water', name:'drink water',  sub:'not just coffee' },
  { id:'eat2',  name:'second meal',  sub:'' },
  { id:'meds2', name:'evening meds', sub:'if applicable' },
  { id:'wind',  name:'wind down',    sub:'phones down' },
];
const DEFAULT_SYMPTOMS = [
  'dissociation','intrusive thoughts','paranoia','sensory overload',
  "can't initiate",'rage','shutdown','impulsivity',
  'insomnia','hypersomnia','appetite gone','appetite excessive'
];

// ── Persistence ───────────────────────────────────────────────────────────
function loadConfig() {
  try { const r = localStorage.getItem('tracker-config'); if (r) return JSON.parse(r); } catch(e) {}
  return null;
}
function saveConfig(c) {
  try { localStorage.setItem('tracker-config', JSON.stringify(c)); } catch(e) {}
}

let cfg = loadConfig() || {
  name:'', critical:DEFAULT_CRITICAL, daily:DEFAULT_DAILY, symptoms:DEFAULT_SYMPTOMS,
  symptomCategories:null, reminderInterval:'30', tgToken:'', tgChatId:'',
  windowCloseTime:'', taskDeadlines:{}, customTimers:[],
  gcal:{ clientId:'', connected:false, lastSync:null, calendarId:'primary' },
  accentSeed:null,
};

// Backfill keys missing from older saved configs
if (!cfg.critical)          cfg.critical          = DEFAULT_CRITICAL;
if (!cfg.daily)             cfg.daily             = DEFAULT_DAILY;
if (!cfg.symptoms)          cfg.symptoms          = DEFAULT_SYMPTOMS;
if (!cfg.symptomCategories) cfg.symptomCategories = null;
if (!cfg.reminderInterval)  cfg.reminderInterval  = '30';
if (!cfg.tgToken)           cfg.tgToken           = '';
if (!cfg.tgChatId)          cfg.tgChatId          = '';
if (!cfg.windowCloseTime)   cfg.windowCloseTime   = '';
if (!cfg.taskDeadlines)     cfg.taskDeadlines     = {};
if (!cfg.customTimers)      cfg.customTimers      = [];
if (!cfg.gcal)              cfg.gcal              = { clientId:'', connected:false, lastSync:null, calendarId:'primary' };
if (!cfg.gcal.calendarId)   cfg.gcal.calendarId   = 'primary';
if (!cfg.accentSeed)        cfg.accentSeed        = null;
if (!cfg.a11y)              cfg.a11y              = { textSize:'normal', highContrast:false, reduceMotion:false, largeTouchTargets:false, font:'default' };
if (!cfg.lineSpacing)        cfg.lineSpacing   = 'normal';
if (!cfg.letterSpacing)      cfg.letterSpacing = 'normal';

// Apply spacing before paint
(function initSpacing() {
  const root = document.documentElement;
  if (cfg.lineSpacing   && cfg.lineSpacing   !== 'normal') root.setAttribute('data-line-spacing',   cfg.lineSpacing);
  if (cfg.letterSpacing && cfg.letterSpacing !== 'normal') root.setAttribute('data-letter-spacing', cfg.letterSpacing);
  if (cfg.a11yPreset) {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-a11y-preset]').forEach(el => {
        const match = el.getAttribute('data-a11y-preset') === cfg.a11yPreset;
        el.classList.toggle('active', match);
        el.setAttribute('aria-pressed', String(match));
      });
    });
  }
})();
if (!cfg.notifPrefs)        cfg.notifPrefs        = {
  taskBrowser:true, taskTelegram:true, taskVib:'gentle',
  timerBrowser:true, windowBrowser:true, timerVib:'gentle',
  apptBrowser:true,  apptTelegram:true, apptVib:'gentle'
};
if (!cfg.vibPatterns) cfg.vibPatterns = { gentle:[50,30,80], firm:[100,50,200], urgent:[300,100,300,100,600] };

// Theme migration: old 'system'/'dark' → 'werkstatt', old 'light' → 'breuer'
if (!cfg.theme || ['system','light','dark'].includes(cfg.theme)) {
  cfg.theme = cfg.theme === 'light' ? 'breuer' : 'werkstatt';
}
if (!cfg.font) cfg.font = cfg.a11y?.font || 'default';

// ── Font loading ──────────────────────────────────────────────────────────
// ── Font sources — all served from reliable CDNs ───────────────────────────
// cdnfonts.com removed — unreliable. OpenDyslexic now via jsDelivr (npm mirror).
// Atkinson Hyperlegible Next (2023 update) used over original.
const FONT_SOURCES = {
  jost:         'https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap',
  ibmplexmono:  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap',
  atkinson:     'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,700;1,400&display=swap',
  lexend:       'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500&display=swap',
  inclusive:    'https://fonts.googleapis.com/css2?family=Inclusive+Sans:ital@0;1&display=swap',
  opendyslexic: 'https://cdn.jsdelivr.net/npm/opendyslexic@0.91.12/css/Regular.css',
};

// ── Accessibility presets ────────────────────────────────────────────────────
// Each preset sets multiple properties at once for a coherent reading experience.
// Stored under cfg.a11yPreset. Individual overrides still work on top.
const A11Y_PRESETS = {
  default: {
    font: 'default', textSize: 'normal', lineSpacing: 'normal',
    letterSpacing: 'normal', highContrast: false, largeTouchTargets: false,
  },
  dyslexia: {
    font: 'opendyslexic', textSize: 'large', lineSpacing: 'relaxed',
    letterSpacing: 'wide', highContrast: false, largeTouchTargets: true,
    desc: 'OpenDyslexic typeface with wider spacing and larger text',
  },
  lowvision: {
    font: 'atkinson', textSize: 'xl', lineSpacing: 'normal',
    letterSpacing: 'normal', highContrast: true, largeTouchTargets: true,
    desc: 'Atkinson Hyperlegible at maximum size with high contrast',
  },
  cognitive: {
    font: 'lexend', textSize: 'large', lineSpacing: 'relaxed',
    letterSpacing: 'normal', highContrast: false, largeTouchTargets: true,
    desc: 'Lexend — designed to reduce cognitive load while reading',
  },
};
const _loadedFonts = new Set();

async function loadFontIfNeeded(font) {
  if (!FONT_SOURCES[font] || _loadedFonts.has(font)) return;
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = FONT_SOURCES[font];
    link.onload = () => { _loadedFonts.add(font); resolve(); };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

async function applyFont(font) {
  if (font && FONT_SOURCES[font]) {
    // Show loading state on picker button
    const activeBtn = document.querySelector('[id^="fontOpt"]:not([id$="Default"]).active,' +
      '[id^="menuFont"]:not([id$="Default"]).active');
    await loadFontIfNeeded(font);
  }
  const root = document.documentElement;
  root.removeAttribute('data-font');
  if (font && font !== 'default') root.setAttribute('data-font', font);
  updateFontUI(font || 'default');
}

function applyLineSpacing(spacing) {
  const root = document.documentElement;
  root.removeAttribute('data-line-spacing');
  if (spacing && spacing !== 'normal') root.setAttribute('data-line-spacing', spacing);
  cfg.lineSpacing = spacing; cfg.a11y = cfg.a11y || {}; cfg.a11y.lineSpacing = spacing;
}

function applyLetterSpacing(spacing) {
  const root = document.documentElement;
  root.removeAttribute('data-letter-spacing');
  if (spacing && spacing !== 'normal') root.setAttribute('data-letter-spacing', spacing);
  cfg.letterSpacing = spacing; cfg.a11y = cfg.a11y || {}; cfg.a11y.letterSpacing = spacing;
}

async function setFont(font) {
  cfg.font = font; cfg.a11y = cfg.a11y || {}; cfg.a11y.font = font;
  saveConfig(cfg); await applyFont(font);
  if (typeof announce === 'function') announce('Font changed to ' + (font === 'default' ? 'system default' : font) + '.');
}

async function applyA11yPreset(presetName) {
  const preset = A11Y_PRESETS[presetName];
  if (!preset) return;
  cfg.a11yPreset = presetName;
  cfg.a11y = cfg.a11y || {};
  // Apply all properties
  await applyFont(preset.font);
  if (typeof setTextSize === 'function')       setTextSize(preset.textSize);
  if (typeof setHighContrast === 'function')   setHighContrast(preset.highContrast);
  if (typeof setLargeTouchTargets === 'function') setLargeTouchTargets(preset.largeTouchTargets);
  applyLineSpacing(preset.lineSpacing);
  applyLetterSpacing(preset.letterSpacing);
  saveConfig(cfg);
  if (typeof announce === 'function')
    announce('Accessibility preset: ' + presetName + '. ' + (preset.desc || ''));
  // Update preset UI
  document.querySelectorAll('[data-a11y-preset]').forEach(el => {
    const active = el.getAttribute('data-a11y-preset') === presetName;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  });
}

function updateFontUI(font) {
  const f = font || 'default';
  ['default','jost','ibmplexmono','atkinson','lexend','inclusive','opendyslexic','comic','mono'].forEach(k => {
    const key = k.charAt(0).toUpperCase() + k.slice(1);
    [document.getElementById('fontOpt'+key), document.getElementById('menuFont'+key)]
      .forEach(el => { if (!el) return; el.classList.toggle('active', k===f); el.setAttribute('aria-checked', String(k===f)); });
  });
}
