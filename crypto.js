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
  const SALT_KEY          = '__salt';
  const WEBAUTHN_KEY      = '__webauthn_cred';
  const PIN_HASH_KEY      = '__pin_hash';
  const RECOVERY_HASH_KEY = '__recovery_hash';

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
    // One-time recovery: restore non-journal keys that old migration may have wiped
    await _restoreLocalStorage();
    return true;
  }

  async function _restoreLocalStorage() {
    // If old migration wiped tracker-config etc from localStorage, restore them.
    // Check marker — if already recovered, skip.
    const recovered = await idbGet(STORE_META, '__ls_restored_v1');
    if (recovered) return;

    const restoreKeys = [
      'tracker-config', 'tracker-med-streak',
      'tracker-appts', 'tracker-quote-today',
      'tracker-quote-favs', 'tracker-quote-blocked',
    ];

    // Also restore tracker-history and today's state key
    const { keys: allKeys } = await idbGetAll(STORE_DATA).catch(() => ({ keys: [] }));
    const stateKeys = allKeys.filter(k =>
      typeof k === 'string' && (
        restoreKeys.includes(k) ||
        k.startsWith('tracker-2') || // tracker-YYYY-MM-DD
        k.startsWith('tracker-history') ||
        k.startsWith('tracker-spend') ||
        k.startsWith('tracker-budget')
      )
    );

    let restored = 0;
    for (const key of stateKeys) {
      try {
        // Only restore if localStorage is missing this key
        if (localStorage.getItem(key) !== null) continue;
        const val = await getItem(key);
        if (val !== null) {
          const str = typeof val === 'string' ? val : JSON.stringify(val);
          localStorage.setItem(key, str);
          restored++;
        }
      } catch(e) {}
    }

    await idbSet(STORE_META, '__ls_restored_v1', true);
    if (restored > 0) {
      console.log('[SecureStore] Restored', restored, 'keys from IDB to localStorage');
    }
  }

  // ── Recovery code ─────────────────────────────────────────────────────
  // Generates a one-time recovery code shown at setup.
  // Stores only a PBKDF2 hash — the raw code is never persisted.
  // resetWithRecoveryCode() wipes PIN + data so a new PIN can be set.
  // Data is lost on reset — user should restore from Duplicati backup.

  function _formatRecoveryCode(bytes) {
    // 20 bytes → 40 hex chars → groups of 5 separated by dashes → XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase();
    return hex.match(/.{5}/g).join('-'); // XXXXX-XXXXX-... (8 groups)
  }

  async function _hashRecoveryCode(code) {
    const salt   = await getOrCreateSalt();
    const enc    = new TextEncoder();
    const keyMat = await crypto.subtle.importKey(
      'raw', enc.encode(code.replace(/-/g, '')), 'PBKDF2', false, ['deriveBits']);
    const bits   = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PBKDF2_MIN_ITERS, hash: 'SHA-256' },
      keyMat, 256);
    return btoa(String.fromCharCode(...new Uint8Array(bits)));
  }

  async function generateRecoveryCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    const code  = _formatRecoveryCode(bytes);
    const hash  = await _hashRecoveryCode(code);
    await idbSet(STORE_META, RECOVERY_HASH_KEY, hash);
    return code;
  }

  async function hasRecoveryCode() {
    const h = await idbGet(STORE_META, RECOVERY_HASH_KEY);
    return !!h;
  }

  async function resetWithRecoveryCode(code) {
    const stored = await idbGet(STORE_META, RECOVERY_HASH_KEY);
    if (!stored) return false;
    const hash = await _hashRecoveryCode(code.trim().toUpperCase());
    if (hash !== stored) return false;

    // Valid — wipe encrypted data and auth keys so fresh setup can proceed
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_DATA, 'readwrite');
      const req = tx.objectStore(STORE_DATA).clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      // Remove auth keys but keep salt + PBKDF2 calibration
      const keysToRemove = [PIN_HASH_KEY, WEBAUTHN_KEY, RECOVERY_HASH_KEY];
      let pending = keysToRemove.length;
      keysToRemove.forEach(k => {
        const r = store.delete(k);
        r.onsuccess = () => { if (--pending === 0) resolve(); };
        r.onerror   = () => reject(r.error);
      });
    });

    // Reset in-memory state
    _key      = null;
    _unlocked = false;
    return true;
  }

  // ── Auth: WebAuthn + PRF ──────────────────────────────────────────────
  //
  // DESIGN: PIN is always the source of truth for the data encryption key.
  //   PRF biometrics work by securely storing the PIN, encrypted with a
  //   wrapping key derived from the PRF output.
  //
  //   Setup flow:
  //     1. PIN → data key (via PBKDF2, already done by setupPIN)
  //     2. PRF output → AES-GCM wrapping key
  //     3. Encrypt PIN bytes with wrapping key → store encryptedPIN
  //     4. _key is NOT replaced — PIN-derived key stays in effect
  //
  //   Unlock flow (PRF):
  //     1. PRF output → AES-GCM wrapping key
  //     2. Decrypt encryptedPIN → original PIN string
  //     3. unlockWithPIN(pin) → PIN-derived data key → _key set correctly
  //
  //   This means PIN and biometric always produce the same _key.
  //   No dual-key mismatch. Backup/restore with PIN always works.
  //
  // PRF extension requires ArrayBuffer inputs, not Uint8Array.
  // rpId must be a registrable domain — IP addresses are invalid per spec.

  // PRF evaluation salt — ArrayBuffer, not Uint8Array
  const PRF_SALT_1 = new TextEncoder().encode('tracker-prf-salt-v1').buffer;

  // IP address detector — WebAuthn rpId cannot be an IP
  function _safeRpId() {
    const h = location.hostname;
    // IP addresses cannot be WebAuthn rpIds — map to 'localhost'
    // 127.0.0.1 is a secure context but still needs rpId = 'localhost'
    if (!h || /^[\d.:]+$/.test(h) || h === 'localhost') return 'localhost';
    return h;
  }

  // Returns true if the current context can use WebAuthn at all
  function _webAuthnContextOk() {
    const h = location.hostname;
    const isLocalhost = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    const isHttps     = location.protocol === 'https:';
    return isLocalhost || isHttps;
  }

  // Derive a wrapping key from PRF output bytes (separate from data key)
  async function _prfWrapKey(prfBytes) {
    const keyMat = await crypto.subtle.importKey(
      'raw', prfBytes, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('tracker-prf-wrap-v1'),
        info: new TextEncoder().encode('pin-encryption'),
      },
      keyMat,
      { name: 'AES-GCM', length: 256 },
      false, ['encrypt', 'decrypt']
    );
  }

  // Encrypt PIN string with PRF wrapping key
  async function _encryptPIN(pin, wrapKey) {
    const iv  = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ct  = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, wrapKey, enc.encode(pin));
    // Pack iv + ciphertext
    const packed = new Uint8Array(12 + ct.byteLength);
    packed.set(iv);
    packed.set(new Uint8Array(ct), 12);
    return packed;
  }

  // Decrypt PIN string with PRF wrapping key
  async function _decryptPIN(packed, wrapKey) {
    const iv = packed.slice(0, 12);
    const ct = packed.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrapKey, ct);
    return new TextDecoder().decode(pt);
  }

  async function setupWebAuthn(pin) {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');

    const available = await window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable()
      .catch(() => false);
    if (!available) throw new Error('No biometric authenticator found');

    if (!_webAuthnContextOk()) {
      throw new Error(
        'Biometric unlock requires HTTPS or localhost. ' +
        'Access via your domain or localhost to use fingerprint.'
      );
    }
    const rpId = _safeRpId();

    const appSalt = await getOrCreateSalt();
    const credId  = appSalt.slice(0, 32); // Stable, device-bound user ID

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
      extensions: { prf: { eval: { first: PRF_SALT_1 } } },
      timeout: 60000,
    };

    const cred      = await navigator.credentials.create({ publicKey: pubKeyOpts });
    const prfRaw    = cred.getClientExtensionResults()?.prf?.results?.first;
    const hasPRF    = !!(prfRaw && prfRaw.byteLength === 32);

    let encryptedPIN = null;
    if (hasPRF) {
      // Wrap the PIN with the PRF-derived wrapping key
      // Data key stays as PIN-derived — no key mismatch possible
      const wrapKey    = await _prfWrapKey(new Uint8Array(prfRaw));
      encryptedPIN     = await _encryptPIN(pin, wrapKey);
    }

    await idbSet(STORE_META, WEBAUTHN_KEY, {
      rawId:        new Uint8Array(cred.rawId),
      rpId,                          // Store for assertion — must match setup
      hasPRF,
      encryptedPIN: encryptedPIN,    // null if no PRF
    });

    // _key is NOT replaced — setupPIN already set the correct PIN-derived key
    return { hasPRF };
  }

  async function unlockWithWebAuthn() {
    if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');
    const stored = await idbGet(STORE_META, WEBAUTHN_KEY);
    if (!stored)  throw new Error('Biometric not set up — use PIN');

    const rawId = stored.rawId instanceof Uint8Array
      ? stored.rawId
      : Uint8Array.from(atob(stored.rawId), c => c.charCodeAt(0)); // legacy

    // Use stored rpId to avoid hostname mismatch if accessed via different URL
    const rpId = stored.rpId || _safeRpId();

    const getOpts = {
      publicKey: {
        challenge:        crypto.getRandomValues(new Uint8Array(32)),
        rpId,
        allowCredentials: [{ type: 'public-key', id: rawId }],
        userVerification: 'required',
        timeout:          60000,
      }
    };

    if (stored.hasPRF) {
      getOpts.publicKey.extensions = { prf: { eval: { first: PRF_SALT_1 } } };
    }

    const assertion = await navigator.credentials.get(getOpts);
    const prfRaw    = assertion.getClientExtensionResults()?.prf?.results?.first;

    if (stored.hasPRF && prfRaw && stored.encryptedPIN) {
      // Unwrap PIN using PRF, then derive data key from PIN
      // This guarantees the same key as unlockWithPIN()
      const wrapKey = await _prfWrapKey(new Uint8Array(prfRaw));
      const pin     = await _decryptPIN(stored.encryptedPIN, wrapKey);
      await unlockWithPIN(pin);
      return { method: 'prf', needsPIN: false };
    } else {
      // Presence-only WebAuthn — biometric verified, PIN still required for key
      return { method: 'presence', needsPIN: true };
    }
  }


  // ── Migration: localStorage → encrypted IndexedDB ─────────────────────
  async function migrateFromLocalStorage() {
    if (!_unlocked) throw new Error('Must unlock before migrating');
    const migrationKey = '__migrated_v1';
    const already = await idbGet(STORE_META, migrationKey);
    if (already) return { migrated: 0 };

    // Only migrate journal entries — everything else (config, state, history,
    // streak, quotes, appts, budget) stays in localStorage.
    // Journal text is the only data worth encrypting at rest.
    const SENSITIVE_KEYS = ['tracker-journal'];

    let migrated = 0;
    for (const key of SENSITIVE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          await setItem(key, raw);
          // DO NOT remove from localStorage — journal.js reads IDB first,
          // localStorage is the plaintext fallback for pre-migration data.
          migrated++;
        }
      } catch(e) {
        console.warn('[SecureStore] Migration failed for key:', key, e);
      }
    }

    await idbSet(STORE_META, migrationKey, true);
    return { migrated, keys: SENSITIVE_KEYS };
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
    // Also requires a secure context — IP addresses other than loopback won't work
    return !!(
      window.PublicKeyCredential &&
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
      _webAuthnContextOk()
    );
  }

  // ── Public interface ──────────────────────────────────────────────────
  return {
    setItem, getItem, removeItem,
    setupPIN, unlockWithPIN,
    setupWebAuthn, unlockWithWebAuthn,
    generateRecoveryCode, hasRecoveryCode, resetWithRecoveryCode,
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
