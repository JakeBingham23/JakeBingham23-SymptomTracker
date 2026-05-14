// ═════════════════════════════════════════════════════════════════
// PWA MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── PWA: inject manifest dynamically ──────────────────────────────────────
(function() {
  const manifest = {
    name: 'Daily Structure Tracker',
    short_name: 'Tracker',
    description: 'AuDHD daily task and symptom tracker',
    start_url: './',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#0f0f0f',
    orientation: 'portrait',
    icons: [
      {
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAACHUlEQVR42u3YwQ2AQAgAwSvA/tvFt18VD2S2AaIZY2Ad0oOWVyCABJAAEkASQAJIAAkgCSABJIAEkASQABJAAkgCSAAJIAEkgCSA1BBQJFdh4q7RkR9AAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQD8FpMkBJIAEkAASQJI13hrvDgQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEkGYHkAASQAJIANnCbGEAAQQQQJdxSX8fgAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAB6DdCuhwUIoA6ANDmABJAAEkACSLLGW+PdgaoDyviUXaIBAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAgigMoA+Gx35AQRQc0CaHEACSAAJIAEkASSABJAAkgASQAJIAEkACSABJIAkgASQABJAAki60wnsMotYuXBi4QAAAABJRU5ErkJggg==",
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: "data:image/png;base64,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",
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  document.getElementById('manifestLink').setAttribute('href', url);
})();

// ── PWA: service worker (offline cache) via blob URL ──────────────────────
// Note: service workers require HTTPS or localhost — won't register from file://
// Blob URL SW registration removed — real sw.js handles caching and notifications.
// Registration happens in index.html after all scripts load.

// ─────────────────────────────────────────────────────────────────────────────

// ── SW update notification ────────────────────────────────────────────────
// When a new SW activates it broadcasts SW_ACTIVATED.
// Show a non-intrusive toast with a reload button.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'SW_ACTIVATED') return;

    const version = e.data.version || '';
    const banner  = document.createElement('div');
    banner.id = 'swUpdateBanner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%',
      'transform:translateX(-50%)',
      'background:var(--bg3)',
      'border:0.5px solid var(--accent)',
      'border-radius:var(--radius)',
      'padding:10px 16px',
      'font-family:var(--font-mono)',
      'font-size:0.6875rem',
      'color:var(--text)',
      'display:flex', 'align-items:center', 'gap:12px',
      'box-shadow:var(--shadow)',
      'z-index:99998',
      'white-space:nowrap',
    ].join(';');

    banner.innerHTML = `
      <span>⟳ app updated</span>
      <button onclick="window.location.reload()"
              style="background:var(--accent);color:var(--bg);border:none;
                     border-radius:var(--radius);padding:4px 12px;
                     font-family:var(--font-mono);font-size:0.625rem;
                     cursor:pointer;font-weight:600"
              aria-label="Reload to apply update">
        reload
      </button>
      <button onclick="this.parentElement.remove()"
              style="background:none;border:none;color:var(--text3);
                     font-family:var(--font-mono);font-size:0.75rem;
                     cursor:pointer;padding:0 4px"
              aria-label="Dismiss update notification">×</button>`;

    // Remove any existing banner before adding new
    document.getElementById('swUpdateBanner')?.remove();
    document.body.appendChild(banner);

    // Auto-dismiss after 30 seconds if ignored
    setTimeout(() => banner.remove(), 30000);
  });

  // Also check for waiting SW on page load — handles the case where
  // SW updated while the app was closed
  navigator.serviceWorker.ready.then(reg => {
    if (reg.waiting) {
      // New SW already waiting — tell it to activate now
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          // New SW installed, old one still active — activate immediately
          newSW.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  });
}
