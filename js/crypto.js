// ═════════════════════════════════════════════════════════════════
// CRYPTO MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

const SecureStore = (() => {
  // ── Constants ─────────────────────────────────────────────────────────
  const DB_NAME      = 'tracker-secure';
  const DB_VERSION   = 1;
  const STORE_DATA   = 'data';
  const STORE_META   = 'meta';
  // Adaptive PBKDF2 iterations — calibrates to device speed on first run
  // Target: ~300ms per derivation (makes brute force expensive on fast hardware)
  // Minimum: 310,000 (OWASP 2023 recommendation)
  // Stored in IDB meta so calibration only runs once
  const PBKDF2_MIN_ITERS   = 310000;
  const PBKDF2_TARGET_MS   = 300;
  const PBKDF2_ITERS_KEY   = '__pbkdf2_iters';
  let   PBKDF2_ITERS        = 310000; // Updated after calibration

  async function calibratePBKDF2() {
    // Check if already calibrated
    const stored = await idbGet(STORE_META, PBKDF2_ITERS_KEY);
    if (stored) { PBKDF2_ITERS = stored; return stored; }

    // Measure time for baseline iterations
    const salt   = crypto.getRandomValues(new Uint8Array(32));
    const enc    = new TextEncoder();
    const keyMat = await crypto.subtle.importKey(
      'raw', enc.encode('calibration'), 'PBKDF2', false, ['deriveKey']);

    const t0 = performance.now();
    await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_MIN_ITERS, hash: 'SHA-256' },
      keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const baseMs = performance.now() - t0;

    // Scale to hit target
    const ratio    = PBKDF2_TARGET_MS / baseMs;
    const iters    = Math.max(PBKDF2_MIN_ITERS, Math.round(PBKDF2_MIN_ITERS * ratio));
    PBKDF2_ITERS   = iters;

    await idbSet(STORE_META, PBKDF2_ITERS_KEY, iters);
    console.log(`[SecureStore] PBKDF2 calibrated: ${iters.toLocaleString()} iterations (${Math.round(baseMs * ratio)}ms target on this device)`);
    return iters;
  }
  const SALT_KEY     = '__salt';
  const WEBAUTHN_KEY = '__webauthn_cred';
  const PIN_HASH_KEY = '__pin_hash';

  // ── State (memory only — never persisted) ─────────────────────────────
  let _key        = null;   // CryptoKey — AES-256-GCM
  let _db         = null;   // IDBDatabase
  let _unlocked   = false;

  // ── IndexedDB setup ───────────────────────────────────────────────────
  async function openDB() {
    if (_db) return _db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_DATA))
          db.createObjectStore(STORE_DATA);
        if (!db.objectStoreNames.contains(STORE_META))
          db.createObjectStore(STORE_META);
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = () => reject(req.error);
    });
  }

  async function idbGet(store, key) {
    const db  = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function idbSet(store, key, value) {
    const db  = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function idbGetAll(store) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(store, 'readonly');
      const keys  = [];
      const vals  = [];
      tx.objectStore(store).openCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) { keys.push(cursor.key); vals.push(cursor.value); cursor.continue(); }
        else resolve({ keys, vals });
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Key derivation ────────────────────────────────────────────────────
  async function getOrCreateSalt() {
    let salt = await idbGet(STORE_META, SALT_KEY);
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(32));
      await idbSet(STORE_META, SALT_KEY, salt);
    }
    return salt;
  }

  async function deriveKey(pin, salt) {
    const enc     = new TextEncoder();
    const keyMat  = await crypto.subtle.importKey(
      'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      keyMat,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ── PIN hash (to verify PIN without decrypting all data) ──────────────
  async function hashPIN(pin, salt) {
    const enc    = new TextEncoder();
    const keyMat = await crypto.subtle.importKey(
      'raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits   = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
      keyMat, 256);
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  }

  // ── Encryption / decryption ───────────────────────────────────────────
  async function encrypt(data) {
    if (!_key) throw new Error('Not unlocked');
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct  = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, _key, enc.encode(JSON.stringify(data)));
    // Pack iv + ciphertext
    const packed = new Uint8Array(12 + ct.byteLength);
    packed.set(iv, 0);
    packed.set(new Uint8Array(ct), 12);
    return packed;
  }

  async function decrypt(packed) {
    if (!_key) throw new Error('Not unlocked');
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, _key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  }

  // ── Public API — secure read/write ────────────────────────────────────
  async function setItem(key, value) {
    if (!_unlocked) throw new Error('App is locked');
    const encrypted = await encrypt(value);
    await idbSet(STORE_DATA, key, encrypted);
  }

  async function getItem(key) {
    if (!_unlocked) throw new Error('App is locked');
    const raw = await idbGet(STORE_DATA, key);
    if (!raw) return null;
    try { return await decrypt(raw); }
    catch(e) { return null; } // Tampered or wrong key
  }

  async function removeItem(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_DATA, 'readwrite');
      const req = tx.objectStore(STORE_DATA).delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // ── Auth: first time setup ────────────────────────────────────────────
  async function isFirstRun() {
    await openDB();
    // Calibrate PBKDF2 iterations for this device
    await calibratePBKDF2();
    const hash = await idbGet(STORE_META, PIN_HASH_KEY);
    return !hash;
  }

  async function setupPIN(pin) {
    if (pin.length < 4) throw new Error('PIN must be at least 4 digits');
    const salt    = await getOrCreateSalt();
    const pinHash = await hashPIN(pin, salt);
    await idbSet(STORE_META, PIN_HASH_KEY, pinHash);
    _key      = await deriveKey(pin, salt);
    _unlocked = true;
    return true;
  }

  // ── Auth: unlock with PIN ─────────────────────────────────────────────
  async function unlockWithPIN(pin) {
    const salt    = await getOrCreateSalt();
    const pinHash = await hashPIN(pin, salt);
    const stored  = await idbGet(STORE_META, PIN_HASH_KEY);
    if (pinHash !== stored) throw new Error('Wrong PIN');
    _key      = await deriveKey(pin, salt);
    _unlocked = true;
    return true;
  }

  // ── Auth: WebAuthn setup ──────────────────────────────────────────────
  // ── Auth: WebAuthn + PRF (true biometric key derivation) ─────────────────
  // Chrome 116+ / Android 14+ / Safari 17+ support PRF extension
  // PRF derives a deterministic 32-byte secret from the authenticator
  // This secret derives the AES key — fingerprint IS the key, PIN not needed
  // Falls back gracefully: presence-only WebAuthn → PIN still required

  const PRF_SALT_1 = new TextEncoder().encode('tracker-prf-salt-v1');

  async function setupWebAuthn(pin) {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');
    const available = await PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) throw new Error('No biometric authenticator found');

    // Use stable user ID derived from app salt — same user across setups
    const appSalt = await getOrCreateSalt();
    const credId  = appSalt.slice(0, 32); // Deterministic, device-bound
    const rpId    = location.hostname || 'localhost';

    const pubKeyOpts = {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp:   { name: 'Daily Structure Tracker', id: rpId },
      user: { id: credId, name: 'tracker-user', displayName: 'Tracker User' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7   },  // ES256
        { type: 'public-key', alg: -257 },  // RS256 fallback
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification:        'required',
        residentKey:             'preferred',
      },
      // Request PRF extension — the key feature
      extensions: { prf: { eval: { first: PRF_SALT_1 } } },
      timeout: 60000,
    };

    const cred      = await navigator.credentials.create({ publicKey: pubKeyOpts });
    const prfResult = cred.getClientExtensionResults()?.prf?.results?.first;
    const hasPRF    = !!(prfResult && prfResult.byteLength === 32);

    // Store rawId as Uint8Array directly — avoids base64 encoding issues
    await idbSet(STORE_META, WEBAUTHN_KEY, {
      rawId:   new Uint8Array(cred.rawId),
      hasPRF,
      pinHash: hasPRF ? null : await hashPIN(pin, await getOrCreateSalt()),
    });

    if (hasPRF) {
      // True biometric: derive key directly from fingerprint
      _key      = await _keyFromPRF(new Uint8Array(prfResult));
      _unlocked = true;
    }

    return { hasPRF };
  }

  async function _keyFromPRF(prfBytes) {
    const salt   = await getOrCreateSalt();
    const keyMat = await crypto.subtle.importKey(
      'raw', prfBytes, 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMat,
      { name: 'AES-GCM', length: 256 },
      false, ['encrypt', 'decrypt']
    );
  }

  async function unlockWithWebAuthn() {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');
    const stored = await idbGet(STORE_META, WEBAUTHN_KEY);
    if (!stored)  throw new Error('Biometric not set up — use PIN');

    // rawId stored as Uint8Array directly — no base64 decode needed
    const rawId   = stored.rawId instanceof Uint8Array
      ? stored.rawId
      : Uint8Array.from(atob(stored.rawId), c => c.charCodeAt(0)); // legacy fallback
    const rpId    = location.hostname || 'localhost';
    const getOpts = {
      publicKey: {
        challenge:        crypto.getRandomValues(new Uint8Array(32)),
        rpId,
        allowCredentials: [{ type: 'public-key', id: rawId }],
        userVerification: 'required',
        timeout:          60000,
      }
    };

    // Request PRF on assertion if credential supports it
    if (stored.hasPRF) {
      getOpts.publicKey.extensions = { prf: { eval: { first: PRF_SALT_1 } } };
    }

    const assertion = await navigator.credentials.get(getOpts);
    const prfResult = assertion.getClientExtensionResults()?.prf?.results?.first;

    if (stored.hasPRF && prfResult) {
      // True biometric unlock — fingerprint derives the key
      _key      = await _keyFromPRF(new Uint8Array(prfResult));
      _unlocked = true;
      return { method: 'prf', needsPIN: false };
    } else {
      // PRF not available — biometric verified presence but PIN still needed for key
      return { method: 'presence', needsPIN: true };
    }
  }


  // ── Migration: localStorage → encrypted IndexedDB ─────────────────────
  async function migrateFromLocalStorage() {
    if (!_unlocked) throw new Error('Must unlock before migrating');
    const migrationKey = '__migrated_v1';
    const already = await idbGet(STORE_META, migrationKey);
    if (already) return { migrated: 0 };

    const trackerKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('tracker-')) trackerKeys.push(k);
    }

    let migrated = 0;
    for (const key of trackerKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          await setItem(key, raw); // Store as encrypted string
          migrated++;
        }
      } catch(e) {
        console.warn('Migration failed for key:', key, e);
      }
    }

    // Mark migration complete
    await idbSet(STORE_META, migrationKey, true);

    // Clear localStorage after successful migration
    if (migrated > 0) {
      trackerKeys.forEach(k => localStorage.removeItem(k));
    }

    return { migrated, keys: trackerKeys };
  }

  // ── Lock ──────────────────────────────────────────────────────────────
  function lock() {
    _key      = null;
    _unlocked = false;
    // Force GC by overwriting (best effort in JS)
    if (window.gc) window.gc();
  }

  // ── Status ────────────────────────────────────────────────────────────
  function isUnlocked() { return _unlocked; }
  function isWebAuthnAvailable() {
    return !!(window.PublicKeyCredential &&
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable);
  }

  // ── Public interface ──────────────────────────────────────────────────
  return {
    setItem, getItem, removeItem,
    setupPIN, unlockWithPIN,
    setupWebAuthn, unlockWithWebAuthn,
    migrateFromLocalStorage,
    isFirstRun, isUnlocked, isWebAuthnAvailable,
    lock,
    // Expose for app layer wrappers
    _idbGetAll: idbGetAll,
    _idbSet:    idbSet,
    _idbGet:    idbGet,
  };
})();

// ── App-level wrappers (drop-in replacements for localStorage) ────────────
// These replace localStorage.getItem/setItem throughout the app
// They are synchronous-looking but return Promises — callers must await

const AppStore = {
  async get(key) {
    try {
      const val = await SecureStore.getItem(key);
      return val; // Already parsed JSON or null
    } catch(e) {
      // Fallback to localStorage during migration
      return localStorage.getItem(key);
    }
  },

  async set(key, value) {
    try {
      await SecureStore.setItem(key, value);
    } catch(e) {
      // Fallback to localStorage if not unlocked yet
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  },

  async remove(key) {
    try {
      await SecureStore.removeItem(key);
    } catch(e) {
      localStorage.removeItem(key);
    }
  }
};

// ── Passphrase modal (replaces insecure prompt()) ────────────────────────
let _passphraseCallback = null;

function showPassphraseModal(callback) {
  _passphraseCallback = callback;
  const overlay = document.getElementById('passphraseModalOverlay');
  const input   = document.getElementById('passphraseInput');
  const errEl   = document.getElementById('passphraseError');
  if (!overlay || !input) {
    // Fallback if modal not found
    const pw = window.prompt('Enter backup passphrase:');
    callback(pw);
    return;
  }
  if (errEl) errEl.style.display = 'none';
  input.value = '';
  overlay.classList.remove('hidden');
  setTimeout(() => input.focus(), 100);
  announce('Enter your backup passphrase to decrypt and restore.');
}

function confirmPassphrase() {
  const input  = document.getElementById('passphraseInput');
  const errEl  = document.getElementById('passphraseError');
  const pw     = input?.value?.trim();
  if (!pw) { if (errEl) { errEl.textContent = 'passphrase required'; errEl.style.display = 'block'; } return; }
  cancelPassphrase();
  if (_passphraseCallback) _passphraseCallback(pw);
  _passphraseCallback = null;
}

function cancelPassphrase() {
  const overlay = document.getElementById('passphraseModalOverlay');
  const input   = document.getElementById('passphraseInput');
  if (overlay) overlay.classList.add('hidden');
  if (input)   input.value = '';
}

function showPassphraseError() {
  const errEl = document.getElementById('passphraseError');
  if (errEl) { errEl.textContent = 'wrong passphrase — try again'; errEl.style.display = 'block'; }
  const input = document.getElementById('passphraseInput');
  if (input)  { input.value = ''; input.focus(); }
  const overlay = document.getElementById('passphraseModalOverlay');
  if (overlay && _passphraseCallback) overlay.classList.remove('hidden');
}
