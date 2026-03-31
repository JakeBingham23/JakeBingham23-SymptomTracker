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
(function() {
  if (!('serviceWorker' in navigator)) return;

  const swCode = `
const CACHE = 'tracker-v4.0';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});

// ── Push / scheduled alarm messages from the main thread ──
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'NOTIFY') {
    const { title, body, tag, requireInteraction, badge } = e.data;
    const ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAAVUlEQVR42u3WUQoAEBAFQAdw/+tyAaQUu5n3K5nQa0sNlgIE9AGoTbJeOt8LBAQEpKk1NRAQkKZWjNunhrghICAgI+yVJxvm5R8CAgJKOaBpaqDcoA5EXN4e5Unw9wAAAABJRU5ErkJggg==";
    self.registration.showNotification(title, {
      body,
      tag:               tag || 'tracker-reminder',
      requireInteraction: requireInteraction !== false, // stays until dismissed
      renotify:          true,   // buzz again even if same tag
      silent:            false,
      vibrate:           [300, 100, 300, 100, 600], // buzz pattern
      icon:              'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect width=%22192%22 height=%22192%22 fill=%22%230f0f0f%22/><text x=%2296%22 y=%22130%22 font-size=%2290%22 text-anchor=%22middle%22 fill=%22%23c8a96e%22>%E2%9C%93</text></svg>',
      badge:             badge || undefined,
      actions: [
        { action: 'done',   title: 'Mark done' },
        { action: 'snooze', title: 'Snooze 10m' }
      ]
    });
  }

  if (e.data && e.data.type === 'SCHEDULE') {
    // Schedule a future notification using setTimeout inside the SW
    const { delay, title, body, tag } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        tag:               tag || 'tracker-scheduled',
        requireInteraction: true,
        renotify:          true,
        silent:            false,
        vibrate:           [400, 200, 400, 200, 800],
        icon:              'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect width=%22192%22 height=%22192%22 fill=%22%230f0f0f%22/><text x=%2296%22 y=%22130%22 font-size=%2290%22 text-anchor=%22middle%22 fill=%22%23c8a96e%22>%E2%9C%93</text></svg>',
        actions: [
          { action: 'done',   title: 'Mark done' },
          { action: 'snooze', title: 'Snooze 10m' }
        ]
      });
    }, delay);
  }
});

// ── Notification action handler ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'snooze') {
    // Re-notify in 10 minutes
    setTimeout(() => {
      self.registration.showNotification(e.notification.title, {
        body:              'snoozed reminder: ' + e.notification.body,
        tag:               'tracker-snooze',
        requireInteraction: true,
        renotify:          true,
        vibrate:           [500, 200, 500],
        silent:            false
      });
    }, 10 * 60 * 1000);
  }
  // Focus or open the app on tap
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
  `;

  const blob = new Blob([swCode], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(blob);

  navigator.serviceWorker.register(swUrl, { scope: './' })
    .then(() => console.log('[PWA] Service worker registered'))
    .catch(err => console.warn('[PWA] SW registration failed (expected on file://):', err.message));
})();

// ─────────────────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().split('T')[0];
