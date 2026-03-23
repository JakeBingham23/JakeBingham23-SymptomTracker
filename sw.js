// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WORKER — Daily Structure Tracker
// Real sw.js — replaces the blob URL hack
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_NAME    = 'tracker-v4.0';
const CACHE_STATIC  = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './css/animations.css',
  './css/toast.css',
  './js/crypto.js',
  './js/config.js',
  './js/state.js',
  './js/render.js',
  './js/today.js',
  './js/budget.js',
  './js/journal.js',
  './js/notifications.js',
  './js/rewards.js',
  './js/quotes.js',
  './js/accessibility.js',
  './js/backup.js',
  './js/menu.js',
  './js/security.js',
  './js/toast.js',
  './js/icons.js',
  './js/audio.js',
  './js/dnd.js',
  './js/timers.js',
  './js/screenshot.js',
  './js/pwa.js',
  './js/theme.js',
  './js/render.js',
  './rag-engine.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-48.png',
];

// ── Install: cache all static assets ─────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_STATIC.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('[SW] Cache install partial failure:', err);
        return self.skipWaiting();
      })
  );
});

// ── Activate: clear old caches ────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first with network fallback ──────────────────────────────
self.addEventListener('fetch', e => {
  // Skip non-GET and cross-origin requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request)
          .then(response => {
            // Cache successful responses
            if (response && response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
            }
            return response;
          })
          .catch(() => cached); // Return stale if network fails
      })
  );
});

// ── Push / scheduled notifications from main thread ──────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (e.data.type === 'NOTIFY') {
    const { title, body, tag, requireInteraction, icon, badge } = e.data;

    // Check DND from client before firing
    e.waitUntil(
      self.clients.matchAll().then(clients => {
        // Fire notification
        return self.registration.showNotification(title, {
          body,
          tag,
          icon:              icon  || './icons/icon-192.png',
          badge:             badge || './icons/icon-48.png',
          requireInteraction: !!requireInteraction,
          renotify:          true,
          vibrate:           [200, 100, 200],
          actions: [
            { action: 'done',   title: 'Mark done' },
            { action: 'snooze', title: 'Snooze 10m' },
          ],
          data: { tag, timestamp: Date.now() }
        });
      })
    );
  }

  if (e.data.type === 'SCHEDULE') {
    const { delay, title, body, tag, requireInteraction } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        tag,
        icon:              './icons/icon-192.png',
        badge:             './icons/icon-48.png',
        requireInteraction: !!requireInteraction,
        renotify:          true,
        vibrate:           [100, 50, 100],
        actions: [
          { action: 'done',   title: 'Mark done' },
          { action: 'snooze', title: 'Snooze 10m' },
        ],
      });
    }, delay);
  }
});

// ── Notification actions ──────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action === 'snooze') {
    // Snooze 10 minutes
    setTimeout(() => {
      self.registration.showNotification(e.notification.title, {
        body:   e.notification.body + ' (snoozed)',
        tag:    e.notification.data?.tag + '-snooze',
        icon:   './icons/icon-192.png',
        badge:  './icons/icon-48.png',
        vibrate: [200, 100, 200],
      });
    }, 10 * 60 * 1000);
    return;
  }

  // Focus or open app
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const client = clients.find(c => c.url.includes('index.html') || c.url.endsWith('/'));
        if (client) {
          client.focus();
          if (e.action === 'done') {
            client.postMessage({ type: 'NOTIFICATION_ACTION', action: 'done', tag: e.notification.data?.tag });
          }
        } else {
          self.clients.openWindow('./');
        }
      })
  );
});
