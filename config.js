// ═════════════════════════════════════════════════════════════════
// CONFIG MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Default config (overridden by user settings in localStorage) ──────────
const DEFAULT_CRITICAL = [
  { id:'meds',   name:'take meds',      sub:'non-negotiable. no excuses.' },
  { id:'shower', name:'shower',         sub:'yes, this one counts too' },
  { id:'eat1',   name:'eat something',  sub:'first meal' },
];
const DEFAULT_DAILY = [
  { id:'water', name:'drink water',  sub:'not just coffee' },
  { id:'eat2',  name:'second meal',  sub:'' },
  { id:'meds2', name:'evening meds', sub:'if applicable' },
  { id:'wind',  name:'wind down',    sub:'phones down' },
];
const DEFAULT_SYMPTOMS = [
  "dissociation","intrusive thoughts","paranoia","sensory overload",
  "can't initiate","rage","shutdown","impulsivity",
  "insomnia","hypersomnia","appetite gone","appetite excessive"
];

// ── User config ───────────────────────────────────────────────────────────
function loadConfig() {
  try {
    const raw = localStorage.getItem('tracker-config');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

function saveConfig(cfg) {
  try { localStorage.setItem('tracker-config', JSON.stringify(cfg)); } catch(e) {}
}

let cfg = loadConfig() || {
  name: '',
  critical: DEFAULT_CRITICAL,
  daily: DEFAULT_DAILY,
  symptoms: DEFAULT_SYMPTOMS,
  reminderInterval: '30',
  tgToken: '',
  tgChatId: '',
  windowCloseTime: '',
  taskDeadlines: {},
  customTimers: []
};
// Ensure older saved configs get new keys
if (!cfg.critical)           cfg.critical  = DEFAULT_CRITICAL;
if (!cfg.daily)              cfg.daily     = DEFAULT_DAILY;
if (!cfg.symptoms)           cfg.symptoms  = DEFAULT_SYMPTOMS;
if (!cfg.reminderInterval)   cfg.reminderInterval = '30';
if (!cfg.tgToken)            cfg.tgToken = '';
if (!cfg.tgChatId)           cfg.tgChatId = '';
if (!cfg.windowCloseTime)    cfg.windowCloseTime = '';
if (!cfg.taskDeadlines)      cfg.taskDeadlines = {};
if (!cfg.customTimers)       cfg.customTimers = [];
if (!cfg.a11y)               cfg.a11y = { textSize: 'normal', highContrast: false, reduceMotion: false, largeTouchTargets: false, font: 'default' };
if (!cfg.notifPrefs) cfg.notifPrefs = {
  taskBrowser: true,   taskTelegram: true,   taskVib: 'gentle',
  timerBrowser: true,  windowBrowser: true,  timerVib: 'gentle',
  apptBrowser: true,   apptTelegram: true,   apptVib: 'gentle'
};
if (!cfg.vibPatterns) cfg.vibPatterns = {
  gentle: [50, 30, 80],
  firm:   [100, 50, 200],
  urgent: [300, 100, 300, 100, 600]
};

// Live arrays (used throughout)
let CRITICAL  = cfg.critical  || DEFAULT_CRITICAL;
let DAILY     = cfg.daily     || DEFAULT_DAILY;
let SYMPTOMS  = cfg.symptoms  || DEFAULT_SYMPTOMS;

// ── Font loading registry ─────────────────────────────────────────────────
const FONT_SOURCES = {
  jost:         'https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap',
  ibmplexmono:  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap',
  atkinson:     'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap',
  opendyslexic: 'https://fonts.cdnfonts.com/css/opendyslexic',
};
const _loadedFonts = new Set();

async function loadFontIfNeeded(font) {
  if (!FONT_SOURCES[font] || _loadedFonts.has(font)) return;
  return new Promise((resolve) => {
    const link   = document.createElement('link');
    link.rel     = 'stylesheet';
    link.href    = FONT_SOURCES[font];
    link.onload  = () => { _loadedFonts.add(font); resolve(); };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

async function applyFont(font) {
  if (font && FONT_SOURCES[font]) await loadFontIfNeeded(font);
  const root = document.documentElement;
  root.removeAttribute('data-font');
  if (font && font !== 'default') root.setAttribute('data-font', font);
  updateFontUI(font || 'default');
}

// setFont is the canonical entry point — theme.js defers to this
async function setFont(font) {
  cfg.font     = font;           // top-level key (v4.1+)
  cfg.a11y     = cfg.a11y || {};
  cfg.a11y.font = font;          // keep legacy key in sync
  saveConfig(cfg);
  await applyFont(font);
  if (typeof announce === 'function')
    announce('Font changed to ' + (font === 'default' ? 'system default' : font) + '.');
}

function updateFontUI(font) {
  const f = font || 'default';
  ['default','jost','ibmplexmono','atkinson','opendyslexic','comic','mono'].forEach(k => {
    const key = k.charAt(0).toUpperCase() + k.slice(1);
    [
      document.getElementById('fontOpt'  + key),
      document.getElementById('menuFont' + key),
    ].forEach(el => {
      if (!el) return;
      el.classList.toggle('active', k === f);
      el.setAttribute('aria-checked', String(k === f));
    });
  });
}

// Ensure cfg.theme is a valid Bauhaus theme name
if (!cfg.theme || ['system','light','dark'].includes(cfg.theme)) {
  // Migrate old system/dark → werkstatt, old light → breuer
  cfg.theme = cfg.theme === 'light' ? 'breuer' : 'werkstatt';
}
if (!cfg.font) cfg.font = cfg.a11y?.font || 'default';
