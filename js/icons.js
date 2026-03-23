// ═══════════════════════════════════════════════════════════════════════════
// ICONS MODULE — Custom SVG Icon System
// Daily Structure Tracker
// ═══════════════════════════════════════════════════════════════════════════
//
// All icons derived from the FUF grid mark (app icon language).
// Grid-based geometry. Square corners. Monochrome.
// No external icon font dependencies.
// ═══════════════════════════════════════════════════════════════════════════

const Icons = (() => {

  // ── Base SVG wrapper ────────────────────────────────────────────────────
  function svg(content, size = 24, label = '') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-hidden="${label ? 'false' : 'true'}"
      ${label ? `role="img" aria-label="${label}"` : ''}
      style="flex-shrink:0">
      ${content}
    </svg>`;
  }

  // ── Icon definitions ────────────────────────────────────────────────────
  // Each icon uses the grid language of the app mark —
  // filled/empty squares, slashes, deliberate geometry

  const defs = {

    // ── Navigation ────────────────────────────────────────────────────────

    // Today — a filled circle with a dot (clock-like, present moment)
    today: svg(`
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
      <line x1="12" y1="3" x2="12" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="3" y1="12" x2="7" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="17" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    `),

    // History — a 2×2 grid, top row filled, bottom row half
    history: svg(`
      <rect x="3" y="3" width="7" height="7" fill="currentColor"/>
      <rect x="14" y="3" width="7" height="7" fill="currentColor"/>
      <rect x="3" y="14" width="7" height="7" fill="currentColor"/>
      <rect x="14" y="14" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
    `),

    // Stats — ascending bar chart, grid-based
    stats: svg(`
      <rect x="3" y="15" width="4" height="6" fill="currentColor"/>
      <rect x="10" y="9" width="4" height="12" fill="currentColor"/>
      <rect x="17" y="3" width="4" height="18" fill="currentColor"/>
    `),

    // Budget — a dollar sign in grid style
    budget: svg(`
      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <rect x="5" y="6" width="14" height="5" stroke="currentColor" stroke-width="1.5"/>
      <rect x="5" y="13" width="14" height="5" stroke="currentColor" stroke-width="1.5"/>
      <rect x="8" y="6" width="8" height="5" fill="currentColor"/>
    `),

    // Journal — lines of text, pen mark
    journal: svg(`
      <rect x="3" y="3" width="14" height="18" stroke="currentColor" stroke-width="1.5"/>
      <line x1="7" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="7" y1="12" x2="13" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="7" y1="16" x2="10" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="17" y1="15" x2="21" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="17" y1="19" x2="21" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    `),

    // ── Actions ───────────────────────────────────────────────────────────

    // Menu (hamburger) — three lines, grid-spaced
    menu: svg(`
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
    `),

    // Close (X) — square corners
    close: svg(`
      <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
    `),

    // Back (chevron left) — grid-aligned
    back: svg(`
      <line x1="15" y1="4" x2="7" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="7" y1="12" x2="15" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
    `),

    // Add / plus
    add: svg(`
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
    `),

    // Delete (trash) — grid-based
    delete: svg(`
      <rect x="5" y="7" width="14" height="14" stroke="currentColor" stroke-width="1.5"/>
      <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="9" y1="7" x2="9" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="15" y1="7" x2="15" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="9" y1="4" x2="15" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="9" y1="11" x2="9" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="15" y1="11" x2="15" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    `),

    // Edit (pencil) — diagonal slash language
    edit: svg(`
      <line x1="4" y1="20" x2="8" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <rect x="8" y="4" width="11.31" height="11.31" stroke="currentColor" stroke-width="1.5"
        transform="rotate(45 13.66 9.66)"/>
      <line x1="4" y1="20" x2="9" y2="20" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    `),

    // Save / check
    check: svg(`
      <line x1="3" y1="12" x2="9" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
      <line x1="9" y1="18" x2="21" y2="6" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
    `),

    // ── Status ────────────────────────────────────────────────────────────

    // Task done — filled square with check
    taskDone: svg(`
      <rect x="3" y="3" width="18" height="18" fill="currentColor"/>
      <line x1="7" y1="12" x2="10" y2="16" stroke="white" stroke-width="2" stroke-linecap="square"/>
      <line x1="10" y1="16" x2="17" y2="8" stroke="white" stroke-width="2" stroke-linecap="square"/>
    `),

    // Task pending — empty square
    taskPending: svg(`
      <rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="1.5"/>
    `),

    // Lock — padlock grid-style
    lock: svg(`
      <rect x="5" y="11" width="14" height="11" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
      <rect x="10" y="15" width="4" height="4" fill="currentColor"/>
    `),

    // Unlock — open padlock
    unlock: svg(`
      <rect x="5" y="11" width="14" height="11" stroke="currentColor" stroke-width="1.5"/>
      <path d="M8 11V7a4 4 0 0 1 8 0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
      <rect x="10" y="15" width="4" height="4" fill="currentColor"/>
    `),

    // Fingerprint — concentric arcs, grid-spaced
    fingerprint: svg(`
      <path d="M12 4a8 8 0 0 0-8 8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
      <path d="M12 7a5 5 0 0 0-5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
      <path d="M12 10a2 2 0 0 0-2 2v5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
      <path d="M12 4a8 8 0 0 1 8 8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
      <path d="M12 7a5 5 0 0 1 5 5v3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
    `),

    // ── Mood ──────────────────────────────────────────────────────────────

    // Mood high — filled grid, top heavy
    moodHigh: svg(`
      <rect x="3" y="3" width="7" height="7" fill="currentColor"/>
      <rect x="14" y="3" width="7" height="7" fill="currentColor"/>
      <rect x="3" y="14" width="7" height="7" fill="currentColor"/>
      <rect x="14" y="14" width="7" height="7" fill="currentColor"/>
    `),

    // Mood low — sparse grid
    moodLow: svg(`
      <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
      <rect x="14" y="3" width="7" height="7" fill="currentColor"/>
      <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
      <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="1.5"/>
    `),

    // ── Misc ──────────────────────────────────────────────────────────────

    // Mic — voice input
    mic: svg(`
      <rect x="9" y="2" width="6" height="12" rx="0" stroke="currentColor" stroke-width="1.5"/>
      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
      <line x1="12" y1="17" x2="12" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    `),

    // Star — want list
    star: svg(`
      <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
        stroke="currentColor" stroke-width="1.5" fill="none"/>
    `),
    starFilled: svg(`
      <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
        fill="currentColor"/>
    `),

    // Settings / gear
    settings: svg(`
      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
      <rect x="10" y="2" width="4" height="4" stroke="currentColor" stroke-width="1.5"/>
      <rect x="10" y="18" width="4" height="4" stroke="currentColor" stroke-width="1.5"/>
      <rect x="2" y="10" width="4" height="4" stroke="currentColor" stroke-width="1.5"/>
      <rect x="18" y="10" width="4" height="4" stroke="currentColor" stroke-width="1.5"/>
    `),

    // Export / download
    export: svg(`
      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="7" y1="10" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="17" y1="10" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="3" y1="19" x2="21" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="3" y1="19" x2="3" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="21" y1="19" x2="21" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    `),

    // Import / upload
    import: svg(`
      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="7" y1="8" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="17" y1="8" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="3" y1="19" x2="21" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      <line x1="3" y1="19" x2="3" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="21" y1="19" x2="21" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    `),

    // Notification bell
    bell: svg(`
      <path d="M6 10a6 6 0 0 1 12 0v5H6v-5Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
      <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="10" y1="15" x2="10" y2="19" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="14" y1="15" x2="14" y2="19" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="10" y1="19" x2="14" y2="19" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
    `),

    // Calendar
    calendar: svg(`
      <rect x="3" y="5" width="18" height="17" stroke="currentColor" stroke-width="1.5"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/>
      <rect x="7" y="13" width="3" height="3" fill="currentColor"/>
      <rect x="14" y="13" width="3" height="3" fill="currentColor"/>
    `),

    // // mark — the app brand
    brand: svg(`
      <line x1="5" y1="20" x2="9" y2="4" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
      <line x1="12" y1="20" x2="16" y2="4" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
    `, 24),

  };

  // ── Public API ────────────────────────────────────────────────────────────
  function get(name, size = 24, label = '') {
    if (!defs[name]) {
      console.warn(`[Icons] Unknown icon: ${name}`);
      return svg('<rect x="3" y="3" width="18" height="18" stroke="currentColor" stroke-width="1.5"/>', size, label);
    }
    // Re-render at requested size if different from default
    if (size !== 24) {
      return defs[name].replace(/width="24" height="24"/, `width="${size}" height="${size}"`);
    }
    return defs[name];
  }

  // Inject icon into an element
  function inject(el, name, size = 24, label = '') {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.innerHTML = get(name, size, label);
  }

  // Replace all [data-icon] elements in the DOM
  function applyAll() {
    document.querySelectorAll('[data-icon]').forEach(el => {
      const name  = el.dataset.icon;
      const size  = parseInt(el.dataset.iconSize || '24');
      const label = el.dataset.iconLabel || '';
      el.innerHTML = get(name, size, label);
    });
  }

  return { get, inject, applyAll, defs };
})();

// Apply icons after DOM ready
document.addEventListener('DOMContentLoaded', () => Icons.applyAll());
