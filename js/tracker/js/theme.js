// ═════════════════════════════════════════════════════════════════
// THEME MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Theme ─────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
    document.querySelector('meta[name=theme-color]').setAttribute('content', '#f5f4f0');
  } else if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    document.querySelector('meta[name=theme-color]').setAttribute('content', '#0f0f0f');
  } else {
    root.removeAttribute('data-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.querySelector('meta[name=theme-color]').setAttribute('content', prefersDark ? '#0f0f0f' : '#f5f4f0');
  }
}

function setTheme(theme) {
  cfg.theme = theme;
  saveConfig(cfg);
  applyTheme(theme);
  updateThemePill(theme);
  updateNavThemeBtn(theme);
}

function cycleTheme() {
  const order = ['system', 'light', 'dark'];
  const current = cfg.theme || 'system';
  const next = order[(order.indexOf(current) + 1) % order.length];
  setTheme(next);
}

function updateNavThemeBtn(theme) {
  const icons  = { system: '◑', light: '○', dark: '●' };
  const labels = { system: 'auto', light: 'light', dark: 'dark' };
  const t = theme || 'system';
  const iconEl  = document.getElementById('navThemeIcon');
  const labelEl = document.getElementById('navThemeLabel');
  if (iconEl)  iconEl.textContent  = icons[t]  || '◑';
  if (labelEl) labelEl.textContent = labels[t] || 'auto';
  const btn = document.getElementById('navThemeBtn');
  if (btn) btn.setAttribute('aria-label', 'Colour theme: ' + (labels[t] || 'auto') + '. Click to cycle.');
}

function updateThemePill(theme) {
  ['system','light','dark'].forEach(t => {
    const el = document.getElementById('themeOpt' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.classList.toggle('active', t === (theme || 'system'));
  });
}

// Apply theme immediately on load (before paint)
applyTheme(cfg.theme || 'system');
