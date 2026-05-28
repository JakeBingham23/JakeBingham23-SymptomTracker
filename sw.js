// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WORKER — Daily Structure Tracker
// Real sw.js — replaces the blob URL hack
// ═══════════════════════════════════════════════════════════════════════════

const CACHE_NAME    = 'tracker-v6.0.1';
const CACHE_STATIC  = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/themes.css',
  './css/layout.css',
  './css/components.css',
  './css/animations.css',
  './css/toast.css',
  './js/crypto.js',
  './js/config.js',
  './js/state.js',
  './js/app.js',
  './js/state-obj.js',
  './js/storage.js',
  './js/core.js',
  './js/render.js',
  './js/budget.js',
  './js/journal.js',
  './js/notifications.js',
  './js/rewards.js',
  './js/quotes.js',
  './js/accessibility.js',
  './js/backup.js',
  './js/menu.js',
  './js/security.js',
  './js/a11y-sr.js',
  './js/toast.js',
  './js/icons.js',
  './js/audio.js',
  './js/dnd.js',
  './js/timers.js',
  './js/screenshot.js',
  './js/checkin-render.js',
  './js/pwa.js',
  './js/theme.js',
  './js/symptoms/config.js',
  './js/symptoms/render.js',
  './js/gcal/auth.js',
  './js/gcal/sync.js',
  './rag-engine.js',
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
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
      .then(() => {
        // Broadcast version to all clients — triggers update toast in app
        return self.clients.matchAll({ includeUncontrolled: true })
          .then(clients => clients.forEach(c =>
            c.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME })
          ));
      })
  );
});

// ── Fetch strategy ────────────────────────────────────────────────────────
// HTML + JS: network-first — always get fresh code, fall back to cache
// CSS + images: stale-while-revalidate — fast load, update in background
// Everything else: cache-first
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);
  const isHTML = e.request.destination === 'document' || url.pathname.endsWith('.html');
  const isJS   = url.pathname.endsWith('.js');

  if (isHTML || isJS) {
    // Network-first: always fetch fresh, fall back to cache if offline
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Stale-while-revalidate for CSS, images, fonts
  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    )
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
