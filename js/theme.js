// ═════════════════════════════════════════════════════════════════
// THEME MODULE — Daily Structure Tracker v4.1
// Bauhaus named themes: werkstatt | breuer | kandinsky | klee | itten
// Font system lives in config.js — setFont() is defined there.
// ═════════════════════════════════════════════════════════════════

const BAUHAUS_THEMES = ['werkstatt', 'breuer', 'kandinsky', 'klee', 'itten'];
const DARK_THEMES  = ['werkstatt', 'kandinsky', 'klee', 'itten'];
const LIGHT_THEMES = ['breuer'];
function isLightTheme(t) { return LIGHT_THEMES.includes(t); }


const THEME_META_COLORS = {
  werkstatt: '#100e0a',
  breuer:    '#f5f0e6',
  kandinsky: '#090c14',
  klee:      '#130f0b',
  itten:     '#000000',
};

function applyTheme(theme) {
  const resolved = BAUHAUS_THEMES.includes(theme) ? theme : 'werkstatt';
  document.documentElement.setAttribute('data-theme', resolved);
  const metaEl = document.querySelector('meta[name=theme-color]');
  if (metaEl) metaEl.setAttribute('content', THEME_META_COLORS[resolved] || '#100e0a');
}

function setTheme(theme) {
  const resolved = BAUHAUS_THEMES.includes(theme) ? theme : 'werkstatt';
  // Track last-used dark/light for the quick toggle
  if (isLightTheme(resolved)) {
    cfg._lastLightTheme = resolved;
  } else {
    cfg._lastDarkTheme = resolved;
  }
  cfg.theme = resolved;
  saveConfig(cfg);
  applyTheme(resolved);
  updateMenuThemeUI(resolved);
  updateLightDarkBtn(resolved);
}

function updateMenuThemeUI(theme) {
  const active = BAUHAUS_THEMES.includes(theme) ? theme : (cfg.theme || 'werkstatt');
  // Sync both the hamburger menu swatches AND the settings page swatches
  ['menu', 'settings'].forEach(prefix => {
    BAUHAUS_THEMES.forEach(t => {
      const id = prefix + 'Theme' + t.charAt(0).toUpperCase() + t.slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('active', t === active);
      el.setAttribute('aria-checked', String(t === active));
    });
  });
}

// Legacy stubs — callers from old theme pill still work
function updateThemePill(theme)   { updateMenuThemeUI(theme); }
function updateNavThemeBtn(theme) { /* removed in v4.1 */ }





// ── Init — runs before paint ──────────────────────────────────
(function initTheme() {
  // Theme
  applyTheme(cfg.theme || 'werkstatt');

  // Font (config.js loads + applies it)
  const font = cfg.font || cfg.a11y?.font || 'default';
  if (font && font !== 'default') {
    document.documentElement.setAttribute('data-font', font);
    if (typeof loadFontIfNeeded === 'function') loadFontIfNeeded(font);
  }

  // Text size
  if (cfg.textSize)
    document.documentElement.setAttribute('data-text-size', cfg.textSize);

  // High contrast
  if (cfg.highContrast || cfg.a11y?.highContrast)
    document.documentElement.setAttribute('data-high-contrast', 'true');

  // Reduce motion
  if (cfg.reduceMotion || cfg.a11y?.reduceMotion)
    document.documentElement.setAttribute('data-reduce-motion', 'true');

  // Large touch targets
  if (cfg.largeTouchTargets || cfg.a11y?.largeTouchTargets)
    document.documentElement.setAttribute('data-large-targets', 'true');

  // Light/dark button
  updateLightDarkBtn(cfg.theme || 'werkstatt');
})();

// ── Light / dark quick toggle ────────────────────────────
function toggleLightDark() {
  const current = cfg.theme || 'werkstatt';
  let next;

  if (isLightTheme(current)) {
    // Switch to last-used dark, or werkstatt
    next = cfg._lastDarkTheme || 'werkstatt';
  } else {
    // Save current dark, switch to last-used light, or breuer
    cfg._lastDarkTheme = current;
    next = cfg._lastLightTheme || 'breuer';
  }

  setTheme(next);
  updateLightDarkBtn(next);
}

function updateLightDarkBtn(theme) {
  const btn    = document.getElementById('navLightDarkBtn');
  const iconEl = document.getElementById('navLightDarkIcon');
  if (!iconEl) return;

  const light = isLightTheme(theme || cfg.theme || 'werkstatt');
  iconEl.textContent = light ? '●' : '○';
  if (btn) btn.setAttribute('aria-label',
    light ? 'Switch to dark mode' : 'Switch to light mode');
}
