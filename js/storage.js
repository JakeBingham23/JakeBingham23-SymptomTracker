// ═════════════════════════════════════════════════════════════════
// STORAGE v2 — Daily Structure Tracker
// IndexedDB backend with synchronous in-memory read cache.
//
// DESIGN — write-behind cache:
//   Store.get(key)      → sync from cache (localStorage fallback pre-init)
//   Store.set(key, val) → sync cache update + async IDB write
//   Store.getAsync(key) → Promise<val> guaranteed fresh from IDB
//   Store.init()        → opens IDB, migrates localStorage→IDB, loads cache
//
// After Store.init() all reads come from the in-memory cache which
// was populated from IDB. Before init(), falls back to localStorage
// so config.js parse-time reads work correctly.
// ═════════════════════════════════════════════════════════════════

const Store = (() => {
  'use strict';

  const DB_NAME  = 'tracker-idb';
  const DB_VER   = 1;
  const STORE_KV = 'kv';

  const _cache = new Map();
  let   _db    = null;
  let   _ready = false;
  let   _initP = null;

  // ── Key registry ─────────────────────────────────────────────
  const REGISTRY = {
    'tracker-config':          { def: null },
    'tracker-schema-version':  { def: 0    },
    'tracker-med-streak':      { def: '0'  },
    'tracker-history':         { def: []   },
    'tracker-journal':         { def: []   },
    'tracker-journal-draft':   { def: ''   },
    'tracker-appts':           { def: []   },
    'tracker-appointments':    { def: []   },
    'tracker-budget':          { def: { monthly: 0 } },
    'tracker-spend':           { def: []   },
    'tracker-points':          { def: 0    },
    'tracker-badges':          { def: {}   },
    'tracker-weekly-summary':  { def: null },
    'tracker-monthly-summary': { def: null },
    'tracker-quote-today':     { def: null },
    'tracker-quote-favs':      { def: []   },
    'tracker-quote-blocked':   { def: []   },
    'tracker-dnd':             { def: null },
  };

  function dayKey(date) {
    const d = date || (typeof TODAY !== 'undefined' ? TODAY
      : new Date().toISOString().split('T')[0]);
    return 'tracker-' + d;
  }

  function _def(key) {
    if (REGISTRY[key]) return REGISTRY[key].def;
    if (/^tracker-\d{4}-\d{2}-\d{2}$/.test(key)) return {};
    return null;
  }

  function _parse(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch(e) { return raw; }
  }

  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, { keyPath: 'key' });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function _loadAll(db) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_KV, 'readonly')
                    .objectStore(STORE_KV).getAll();
      req.onsuccess = () => {
        for (const row of req.result) _cache.set(row.key, row.value);
        resolve();
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  function _idbWrite(key, value) {
    if (!_db) return;
    try {
      _db.transaction(STORE_KV, 'readwrite')
         .objectStore(STORE_KV)
         .put({ key, value, updated: Date.now() });
    } catch(e) {
      console.warn('[Store] IDB write failed:', key, e.message);
    }
  }

  function _idbDelete(key) {
    if (!_db) return;
    try {
      _db.transaction(STORE_KV, 'readwrite')
         .objectStore(STORE_KV).delete(key);
    } catch(e) {}
  }

  async function _migrate(db) {
    const MARKER = '__idb-migrated-v2';
    const already = await new Promise(res => {
      const req = db.transaction(STORE_KV, 'readonly')
                    .objectStore(STORE_KV).get(MARKER);
      req.onsuccess = () => res(!!req.result);
      req.onerror   = () => res(false);
    });
    if (already) return;

    const tx    = db.transaction(STORE_KV, 'readwrite');
    const store = tx.objectStore(STORE_KV);
    let   n     = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('tracker-')) continue;
      try {
        const val = _parse(localStorage.getItem(key));
        store.put({ key, value: val, updated: Date.now() });
        _cache.set(key, val);
        n++;
      } catch(e) {}
    }

    store.put({ key: MARKER, value: true, updated: Date.now() });
    console.log('[Store] Migrated', n, 'keys localStorage → IDB');
  }

  // ── PUBLIC API ────────────────────────────────────────────────

  function init() {
    if (_initP) return _initP;
    _initP = (async () => {
      try {
        _db = await _openDB();
        await _migrate(_db);
        await _loadAll(_db);
        _ready = true;
        console.log('[Store] Ready. Cache:', _cache.size, 'keys.');
      } catch(e) {
        console.warn('[Store] IDB unavailable, using localStorage fallback:', e.message);
        _ready = true;
      }
    })();
    return _initP;
  }

  function get(key) {
    const k = key === 'tracker-today' ? dayKey() : key;
    if (_cache.has(k)) return _cache.get(k);
    // Pre-init fallback
    try {
      const raw = localStorage.getItem(k);
      if (raw !== null) {
        const val = _parse(raw);
        _cache.set(k, val);
        return val;
      }
    } catch(e) {}
    return _def(k);
  }

  function set(key, value) {
    const k = key === 'tracker-today' ? dayKey() : key;
    _cache.set(k, value);
    _idbWrite(k, value);
    // Mirror config to localStorage for parse-time bootstrap
    if (k === 'tracker-config') {
      try { localStorage.setItem(k, JSON.stringify(value)); } catch(e) {}
    }
    return true;
  }

  function remove(key) {
    const k = key === 'tracker-today' ? dayKey() : key;
    _cache.delete(k);
    _idbDelete(k);
    try { localStorage.removeItem(k); } catch(e) {}
  }

  function getAsync(key) {
    const k = key === 'tracker-today' ? dayKey() : key;
    if (!_db) return Promise.resolve(get(k));
    return new Promise(resolve => {
      try {
        const req = _db.transaction(STORE_KV, 'readonly')
                       .objectStore(STORE_KV).get(k);
        req.onsuccess = () => {
          const val = req.result ? req.result.value : _def(k);
          _cache.set(k, val);
          resolve(val);
        };
        req.onerror = () => resolve(get(k));
      } catch(e) { resolve(get(k)); }
    });
  }

  function getAll() {
    if (!_db) return Promise.resolve(Object.fromEntries(_cache));
    return new Promise(resolve => {
      const req = _db.transaction(STORE_KV, 'readonly')
                     .objectStore(STORE_KV).getAll();
      req.onsuccess = () => {
        const out = {};
        for (const row of req.result) out[row.key] = row.value;
        resolve(out);
      };
      req.onerror = () => resolve(Object.fromEntries(_cache));
    });
  }

  function getSession(key) {
    try { return sessionStorage.getItem(key); } catch(e) { return null; }
  }
  function setSession(key, value) {
    try {
      sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch(e) { return false; }
  }
  function removeSession(key) {
    try { sessionStorage.removeItem(key); } catch(e) {}
  }

  async function estimateSize() {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return {
        usedMB:  (usage  / 1048576).toFixed(1),
        quotaMB: (quota  / 1048576).toFixed(0),
        pct:     ((usage / quota)  * 100).toFixed(1),
      };
    }
    return null;
  }

  function keys()    { return Object.keys(REGISTRY); }
  function isReady() { return _ready; }

  return {
    init, get, set, remove, getAsync, getAll,
    getSession, setSession, removeSession,
    keys, isReady, dayKey, estimateSize,
    REGISTRY,
  };
})();
