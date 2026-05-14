import { cfg, saveConfig } from './config.js';
// ═════════════════════════════════════════════════════════════════
// THEME MODULE — Daily Structure Tracker v5
// Material You dynamic color layered on Bauhaus aesthetics.
// werkstatt = dark industrial  |  breuer = light functional
// User accent seed → OKLCH tonal palette → CSS custom properties.
// The theme names never change — M3 powers them invisibly.
// Load order: after config.js
// ═════════════════════════════════════════════════════════════════

// ── OKLCH support check ───────────────────────────────────────────────────
const _oklchOK = (() => {
  try { return CSS.supports('color', 'oklch(50% 0.2 150)'); } catch(e) { return false; }
})();

// ── Colour math ───────────────────────────────────────────────────────────
function _hex2rgb(hex) {
  const h = hex.replace('#','');
  return { r:parseInt(h.slice(0,2),16)/255, g:parseInt(h.slice(2,4),16)/255, b:parseInt(h.slice(4,6),16)/255 };
}
function _lin(c) { return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
function _rgb2xyz({r,g,b}) {
  const [rl,gl,bl] = [r,g,b].map(_lin);
  return {
    x: rl*0.4124564 + gl*0.3575761 + bl*0.1804375,
    y: rl*0.2126729 + gl*0.7151522 + bl*0.0721750,
    z: rl*0.0193339 + gl*0.1191920 + bl*0.9503041,
  };
}
function _xyz2oklab({x,y,z}) {
  const l = Math.cbrt(0.8189330101*x + 0.3618667424*y - 0.1288597137*z);
  const m = Math.cbrt(0.0329845436*x + 0.9293118715*y + 0.0361456387*z);
  const s = Math.cbrt(0.0482003018*x + 0.2643662691*y + 0.6338517070*z);
  return {
    L:  0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
    a:  1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
    b:  0.0259040371*l + 0.7827717662*m - 0.8086757660*s,
  };
}
function _lch({L,a,b}) {
  const C = Math.sqrt(a*a + b*b);
  const H = Math.atan2(b,a) * 180 / Math.PI;
  return { L, C, H: H < 0 ? H+360 : H };
}

function _tone(seedHex, lightness) {
  if (!_oklchOK) return _toneHsl(seedHex, lightness);
  const {C,H} = _lch(_xyz2oklab(_rgb2xyz(_hex2rgb(seedHex))));
  const chroma = (lightness < 0.08 || lightness > 0.92) ? C * 0.4 : C;
  return `oklch(${(lightness*100).toFixed(1)}% ${chroma.toFixed(4)} ${H.toFixed(1)})`;
}

function _toneHsl(seedHex, lightness) {
  const {r,g,b} = _hex2rgb(seedHex);
  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2*l-1));
  let h = 0;
  if (d) {
    h = max===r ? ((g-b)/d%6)*60 : max===g ? ((b-r)/d+2)*60 : ((r-g)/d+4)*60;
    if (h < 0) h += 360;
  }
  return `hsl(${h.toFixed(0)},${(s*100).toFixed(0)}%,${(lightness*100).toFixed(0)}%)`;
}

// ── Apply full M3 tonal palette to CSS custom properties ──────────────────
function applyM3Palette(seedHex) {
  const root = document.documentElement;
  const t    = l => _tone(seedHex, l);

  // Tonal slots — referenced by theme layers in CSS
  [0,.10,.20,.30,.40,.50,.60,.70,.80,.90,.95,.99,1].forEach(l => {
    const key = l === 0 ? '0' : l === 1 ? '100' : String(Math.round(l*100));
    root.style.setProperty('--m3-primary-' + key, t(l));
  });

  // Semantic accent tokens — theme-aware (dark uses high tones, light uses low)
  const isDark = document.documentElement.getAttribute('data-theme') !== 'breuer';
  root.style.setProperty('--accent',           isDark ? t(0.70) : t(0.40));
  root.style.setProperty('--accent-hover',     isDark ? t(0.80) : t(0.30));
  root.style.setProperty('--accent-container', isDark ? t(0.30) : t(0.90));
  root.style.setProperty('--on-accent',        isDark ? t(0.15) : t(0.99));

  // Category colour tokens derived from hue rotation of the seed
  root.style.setProperty('--cat-neuro',  isDark ? t(0.72) : t(0.38));
  root.style.setProperty('--cat-psych',  isDark ? t(0.68) : t(0.42));
  root.style.setProperty('--cat-phys',   isDark ? t(0.65) : t(0.35));
  root.style.setProperty('--cat-behav',  isDark ? t(0.60) : t(0.45));
  root.style.setProperty('--cat-custom', isDark ? t(0.75) : t(0.40));
}

// ── Detect OS/browser accent colour ──────────────────────────────────────
function detectSystemAccent() {
  try {
    const el = Object.assign(document.createElement('div'), {
      style: 'accent-color:auto;width:0;height:0;position:absolute;pointer-events:none'
    });
    document.body.appendChild(el);
    const v = getComputedStyle(el).accentColor;
    document.body.removeChild(el);
    const m = v.match(/rgb\((\d+),?\s*(\d+),?\s*(\d+)\)/);
    if (m) return '#' + [m[1],m[2],m[3]].map(n => (+n).toString(16).padStart(2,'0')).join('');
  } catch(e) {}
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────
export function applyTheme(theme) {
  const root   = document.documentElement;
  const themes = ['werkstatt','breuer','forst','bauhaus','constructivist','suprematist'];
  themes.forEach(t => root.classList.remove('theme-' + t));
  root.removeAttribute('data-theme');
  if (theme && theme !== 'system') {
    root.setAttribute('data-theme', theme);
    root.classList.add('theme-' + theme);
  }
  const seed = cfg.accentSeed || detectSystemAccent() || '#5b6ab0';
  applyM3Palette(seed);
  _updateThemeToggleBtn(theme);
  _updateThemePills(theme);
}

export function setTheme(theme) {
  cfg.theme = theme; saveConfig(cfg); applyTheme(theme);
  if (typeof announce === 'function') announce('Theme changed to ' + theme + '.');
}

export function toggleTheme() {
  setTheme((cfg.theme || 'werkstatt') === 'breuer' ? 'werkstatt' : 'breuer');
}

// ── Accent colour ─────────────────────────────────────────────────────────
function setAccentSeed(hex) {
  cfg.accentSeed = hex; saveConfig(cfg);
  applyM3Palette(hex);
  _updateAccentUI(hex);
}

function resetAccentToSystem() {
  cfg.accentSeed = null; saveConfig(cfg);
  const seed = detectSystemAccent() || '#5b6ab0';
  applyM3Palette(seed);
  _updateAccentUI(seed);
  if (typeof showToast === 'function') showToast('Accent reset to system colour');
}

function _updateAccentUI(hex) {
  const picker = document.getElementById('accentColorPicker');
  if (picker) picker.value = hex || '#5b6ab0';
}

function _updateThemeToggleBtn(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  btn.textContent = theme === 'breuer' ? 'dark' : 'light';
  btn.setAttribute('aria-label', 'current theme: ' + (theme || 'werkstatt') + '. switch theme.');
}

function _updateThemePills(theme) {
  document.querySelectorAll('[data-theme-opt]').forEach(el => {
    const t = el.getAttribute('data-theme-opt');
    el.classList.toggle('active', t === theme);
    el.setAttribute('aria-checked', String(t === theme));
  });
}

// ── Backwards-compat alias used by older callers ──────────────────────────
function updateNavThemeBtn(theme) { _updateThemeToggleBtn(theme); }

// Alias — HTML uses toggleLightDark, function was renamed to toggleTheme
export function toggleLightDark() { return toggleTheme(); }
