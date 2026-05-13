// ═════════════════════════════════════════════════════════════════
// STORAGE — Daily Structure Tracker
// Single source of truth for all persistence.
// No other module touches localStorage or sessionStorage directly.
//
// API:
//   Store.get(key)           → parsed value or default
//   Store.set(key, value)    → serialise + write
//   Store.remove(key)        → delete
//   Store.getSession(key)    → sessionStorage read (API keys)
//   Store.setSession(key, v) → sessionStorage write
//   Store.keys()             → all registered keys
//   Store.migrate()          → run schema migrations on load
//
// All keys are registered in REGISTRY below.
// Unregistered keys cause a console.warn — nothing breaks, but
// it surfaces drift early.
// ═════════════════════════════════════════════════════════════════

const Store = (() => {
  'use strict';

  // ── Schema version ────────────────────────────────────────────
  const CURRENT_SCHEMA = 1;
  const SCHEMA_KEY     = 'tracker-schema-version';

  // ── Key registry ──────────────────────────────────────────────
  // type: 'json' | 'string' | 'number'
  // def:  default value if key is missing or unparseable
  // sensitive: true = copy to SecureStore on migration (journal only)
  const REGISTRY = {
    // ── Config & identity ───────────────────────────────────────
    'tracker-config':          { type: 'json',   def: null },
    'tracker-schema-version':  { type: 'number', def: 0    },

    // ── Daily state (keyed by date at runtime) ──────────────────
    // Dynamic key: 'tracker-' + TODAY — handled via dayKey()
    'tracker-med-streak':      { type: 'string', def: '0'  },
    'tracker-history':         { type: 'json',   def: []   },

    // ── Journal (sensitive — also encrypted in SecureStore) ─────
    'tracker-journal':         { type: 'json',   def: [],  sensitive: true },
    'tracker-journal-draft':   { type: 'string', def: ''   },

    // ── Appointments ────────────────────────────────────────────
    'tracker-appts':           { type: 'json',   def: []   },

    // ── Budget & spending ────────────────────────────────────────
    'tracker-budget':          { type: 'json',   def: { monthly: 0 } },
    'tracker-spend':           { type: 'json',   def: []   },

    // ── Rewards ─────────────────────────────────────────────────
    'tracker-points':          { type: 'json',   def: 0    },
    'tracker-badges':          { type: 'json',   def: {}   },
    'tracker-weekly-summary':  { type: 'json',   def: null },
    'tracker-monthly-summary': { type: 'json',   def: null },

    // ── Quotes & messages ────────────────────────────────────────
    'tracker-quote-today':     { type: 'json',   def: null },
    'tracker-quote-favs':      { type: 'json',   def: []   },
    'tracker-quote-blocked':   { type: 'json',   def: []   },

    // ── DND config ───────────────────────────────────────────────
    'tracker-dnd':             { type: 'json',   def: null },

    // ── Session-only (never persisted to localStorage) ───────────
    // Accessed via getSession/setSession:
    // 'tracker-anthropic-key' → sessionStorage only
  };

  // ── Day-keyed state ────────────────────────────────────────────
  // Returns key for today's daily check-in state
  function dayKey(date) {
    return 'tracker-' + (date || TODAY);
  }

  // ── Core read ─────────────────────────────────────────────────
  function get(key, date) {
    // Day-state special case
    const storageKey = (key === 'tracker-today') ? dayKey(date) : key;

    const reg = REGISTRY[storageKey];
    if (!reg && !storageKey.match(/^tracker-\d{4}-\d{2}-\d{2}$/)) {
      console.warn('[Store] Unregistered key:', storageKey);
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return reg ? reg.def : null;
      if (!reg || reg.type === 'json') return JSON.parse(raw);
      if (reg.type === 'number') return Number(raw);
      return raw; // string
    } catch(e) {
      console.warn('[Store] Parse error for key:', storageKey, e.message);
      return reg ? reg.def : null;
    }
  }

  // ── Core write ────────────────────────────────────────────────
  function set(key, value, date) {
    const storageKey = (key === 'tracker-today') ? dayKey(date) : key;
    try {
      const serialised = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(storageKey, serialised);
      return true;
    } catch(e) {
      console.error('[Store] Write failed for key:', storageKey, e.message);
      return false;
    }
  }

  // ── Remove ────────────────────────────────────────────────────
  function remove(key, date) {
    const storageKey = (key === 'tracker-today') ? dayKey(date) : key;
    try { localStorage.removeItem(storageKey); } catch(e) {}
  }

  // ── Session storage (API keys only) ──────────────────────────
  function getSession(key) {
    try { return sessionStorage.getItem(key); } catch(e) { return null; }
  }

  function setSession(key, value) {
    try { sessionStorage.setItem(key, value); return true; } catch(e) { return false; }
  }

  function removeSession(key) {
    try { sessionStorage.removeItem(key); } catch(e) {}
  }

  // ── Key list ─────────────────────────────────────────────────
  function keys() { return Object.keys(REGISTRY); }

  // ── Schema migration ─────────────────────────────────────────
  // Runs once on app init before anything reads storage.
  // Returns the version migrated to.
  function migrate() {
    let version = 0;
    try { version = Number(localStorage.getItem(SCHEMA_KEY)) || 0; } catch(e) {}

    if (version >= CURRENT_SCHEMA) return version;

    // ── v0 → v1: nothing to migrate structurally ────────────────
    // The old "wipe localStorage" migration in crypto.js has been fixed.
    // This migration just sets the version marker so future migrations
    // have a clean baseline.
    if (version < 1) {
      // Ensure tracker-config is present (recover from old bad migration)
      // crypto.js _restoreLocalStorage handles the heavy lifting;
      // here we just stamp the version after unlock if not already set.
      // Note: this runs at parse time, before unlock, so we can only
      // do things that don't require SecureStore.
      console.log('[Store] Schema at v0, will stamp v1 after first write');
    }

    return version;
  }

  // Stamp schema version — called after successful unlock in security.js
  function stampVersion() {
    try { localStorage.setItem(SCHEMA_KEY, String(CURRENT_SCHEMA)); } catch(e) {}
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    get,
    set,
    remove,
    getSession,
    setSession,
    removeSession,
    keys,
    migrate,
    stampVersion,
    dayKey,
    REGISTRY,
  };
})();
