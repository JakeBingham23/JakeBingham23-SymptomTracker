// ═══════════════════════════════════════════════════════════════════════════
// LOCKSCREEN MODULE — PIN + WebAuthn + Biometric UI Controller
// Daily Structure Tracker
// ═══════════════════════════════════════════════════════════════════════════

const lockScreen = (() => {
  const MAX_PIN_LEN = 6;
  const MIN_PIN_LEN = 4;
  let _mode         = null; // 'setup-first' | 'setup-confirm' | 'unlock'
  let _pin          = '';
  let _firstPIN     = '';
  let _attempts     = 0;
  const MAX_ATTEMPTS = 5;

  // ── Build number pad ──────────────────────────────────────────────────
  function buildPad(containerId, onKey) {
    const pad    = document.getElementById(containerId);
    if (!pad) return;
    const keys   = ['1','2','3','4','5','6','7','8','9','✓','0','⌫'];
    pad.innerHTML = keys.map(k => {
      if (k === '✓') {
        // Manual submit — allows submission for PINs of any valid length (min 4)
        return `<button class="pin-key" style="color:var(--success);font-weight:bold;"
          onclick="lockScreen.submit('${containerId}' === 'setupPINPad')"
          aria-label="Submit PIN">✓</button>`;
      }
      if (k === '⌫') return `<button class="pin-key delete"
        onclick="lockScreen._key('${containerId}','del')"
        aria-label="Delete last digit">⌫</button>`;
      return `<button class="pin-key"
        onclick="lockScreen._key('${containerId}','${k}')"
        aria-label="${k}">${k}</button>`;
    }).join('');
  }

  // ── Update dot display ────────────────────────────────────────────────
  function updateDots(dotsId, length) {
    const el = document.getElementById(dotsId);
    if (!el) return;
    el.innerHTML = Array.from({ length: MAX_PIN_LEN }, (_, i) =>
      `<div class="pin-dot${i < length ? ' filled' : ''}"
            aria-hidden="true"></div>`
    ).join('');
  }

  function setError(errId, msg) {
    const el = document.getElementById(errId);
    if (el) el.textContent = msg;
  }

  // ── Key handler ───────────────────────────────────────────────────────
  function _key(padId, val) {
    const isSetup   = padId === 'setupPINPad';
    const dotsId    = isSetup ? 'setupPINDots' : 'unlockPINDots';
    const errId     = isSetup ? 'setupPINError' : 'unlockPINError';

    if (val === 'del') {
      _pin = _pin.slice(0, -1);
    } else if (_pin.length < MAX_PIN_LEN) {
      _pin += val;
      setError(errId, '');
    }

    updateDots(dotsId, _pin.length);

    // Auto-submit when max length reached
    if (_pin.length === MAX_PIN_LEN) {
      setTimeout(() => submit(isSetup), 80);
    }
    // Allow submit at min length on next key if already at max
  }

  // ── Submit handler ────────────────────────────────────────────────────
  async function submit(isSetup) {
    if (_pin.length < MIN_PIN_LEN) return;

    if (isSetup) {
      if (_mode === 'setup-first') {
        _firstPIN = _pin;
        _pin      = '';
        _mode     = 'setup-confirm';
        document.getElementById('setupStep').textContent = 'confirm your PIN';
        updateDots('setupPINDots', 0);
        setError('setupPINError', '');
        announce('PIN entered. Enter it again to confirm.');
      } else if (_mode === 'setup-confirm') {
        if (_pin !== _firstPIN) {
          _pin      = '';
          _firstPIN = '';
          _mode     = 'setup-first';
          updateDots('setupPINDots', 0);
          setError('setupPINError', 'PINs did not match — start again');
          document.getElementById('setupStep').textContent = 'set up your PIN';
          announce('PINs did not match. Please try again.');
          return;
        }
        await completePINSetup(_pin);
      }
    } else {
      await tryPINUnlock(_pin);
    }
  }

  // ── PIN setup ─────────────────────────────────────────────────────────
  async function completePINSetup(pin) {
    try {
      await SecureStore.setupPIN(pin);

      // Offer WebAuthn after PIN is set
      const available = await PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable()
        .catch(() => false);

      if (available) {
        const wantBio = confirm(
          'Set up fingerprint / face unlock? You will still need your PIN as a backup.'
        );
        if (wantBio) {
          try {
            const bio = await SecureStore.setupWebAuthn(pin);
            if (bio.hasPRF) {
              announce('Biometric unlock set up. Your fingerprint now unlocks your data directly.');
            } else {
              announce('Biometric set up. You will still need your PIN to decrypt data on this device.');
            }
          } catch(e) {
            console.warn('WebAuthn setup failed:', e.message);
            announce('Biometric setup failed. PIN only will be used.');
          }
        }
      }

      // Migrate existing data
      setError('setupPINError', '');
      document.getElementById('setupStep').textContent = 'migrating your data...';
      announce('PIN set. Migrating your existing data to encrypted storage.');

      const result = await SecureStore.migrateFromLocalStorage();
      console.log(`[SecureStore] Migrated ${result.migrated} keys`);

      dismiss();
    } catch(e) {
      setError('setupPINError', e.message);
      _pin = '';
      updateDots('setupPINDots', 0);
    }
  }

  // ── PIN unlock ────────────────────────────────────────────────────────
  async function tryPINUnlock(pin) {
    try {
      await SecureStore.unlockWithPIN(pin);
      _attempts = 0;
      dismiss();
    } catch(e) {
      _attempts++;
      _pin = '';
      updateDots('unlockPINDots', 0);

      if (_attempts >= MAX_ATTEMPTS) {
        setError('unlockPINError',
          `${MAX_ATTEMPTS} wrong attempts — try again in 30 seconds`);
        disablePad('unlockPINPad', 30);
        announce(`Too many wrong attempts. Disabled for 30 seconds.`);
      } else {
        const remaining = MAX_ATTEMPTS - _attempts;
        setError('unlockPINError',
          `wrong PIN — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`);
        announce(`Wrong PIN. ${remaining} attempts remaining.`);
      }
    }
  }

  // ── Biometric unlock ──────────────────────────────────────────────────
  async function tryBiometric() {
    const btn = document.getElementById('biometricBtn');
    if (btn) { btn.textContent = 'verifying...'; btn.disabled = true; }
    try {
      const result = await SecureStore.unlockWithWebAuthn();

      if (result.needsPIN === false) {
        // PRF success — key derived from fingerprint, fully unlocked
        announce('Biometric unlock successful.');
        dismiss();
      } else {
        // Presence-only — biometric verified but PIN still needed for key
        setError('unlockPINError', 'biometric verified — enter PIN to decrypt');
        if (btn) btn.style.display = 'none';
        announce('Biometric verified. Enter your PIN to decrypt your data.');
      }
    } catch(e) {
      if (btn) { btn.textContent = 'fingerprint / face unlock'; btn.disabled = false; }
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') {
        // User cancelled — silent
      } else {
        setError('unlockPINError', 'biometric failed — use your PIN');
        announce('Biometric failed. Please use your PIN.');
      }
    }
  }

  // ── Disable pad temporarily ───────────────────────────────────────────
  function disablePad(padId, seconds) {
    const pad  = document.getElementById(padId);
    const btns = pad?.querySelectorAll('.pin-key');
    if (!btns) return;
    btns.forEach(b => b.disabled = true);
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        btns.forEach(b => b.disabled = false);
        _attempts = 0;
        setError(padId.replace('Pad','Error'), '');
        announce('You can try your PIN again now.');
      }
    }, 1000);
  }

  // ── Show/hide ─────────────────────────────────────────────────────────
  async function show() {
    const el = document.getElementById('lockScreen');
    if (el) el.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const firstRun = await SecureStore.isFirstRun();

    if (firstRun) {
      _mode = 'setup-first';
      document.getElementById('lockSetup').style.display  = 'block';
      document.getElementById('lockUnlock').style.display = 'none';
      document.getElementById('setupStep').textContent    = 'set up your PIN';
      buildPad('setupPINPad');
      updateDots('setupPINDots', 0);
      announce('Welcome. Set up a PIN to encrypt your data.');
    } else {
      _mode = 'unlock';
      document.getElementById('lockSetup').style.display  = 'none';
      document.getElementById('lockUnlock').style.display = 'block';
      buildPad('unlockPINPad');
      updateDots('unlockPINDots', 0);

      // Check biometric availability
      const hasBio = await idbGet('__webauthn_cred') !== null;
      const btn    = document.getElementById('biometricBtn');
      if (btn && hasBio) {
        btn.style.display = 'block';
        // Auto-trigger biometric after a moment
        setTimeout(() => tryBiometric(), 500);
      }
      announce('App locked. Enter your PIN or use biometrics to unlock.');
    }
  }

  async function idbGet(key) {
    return SecureStore._idbGet('meta', key);
  }

  function dismiss() {
    const el = document.getElementById('lockScreen');
    if (el) el.style.display = 'none';
    document.body.style.overflow = '';
    _pin      = '';
    _firstPIN = '';
    // Initialise app
    initApp();
  }

  return { show, tryBiometric, _key, submit };
})();

// Close menus on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const menuEl = document.getElementById('menuOverlay');
    if (menuEl && !menuEl.classList.contains('hidden')) { closeMenu(); return; }
    if (_activeSubPage) { closeMenuSubPage(_activeSubPage); return; }
    const apptEl = document.getElementById('apptModalOverlay');
    if (apptEl && !apptEl.classList.contains('hidden')) { closeApptModal(); return; }
    const spendEl = document.getElementById('spendModalOverlay');
    if (spendEl && !spendEl.classList.contains('hidden')) { closeSpendModal(); return; }
  }
});

// ── App init gate — nothing renders until unlocked ────────────────────────
async function initApp() {
  if (!SecureStore.isUnlocked()) {
    console.warn('[Security] initApp called while locked — aborting');
    return;
  }
  // Normal init
  try {
    initOnboarding();
  } catch(e) {
    console.error('[INIT ERROR]', e);
    document.getElementById('page-today')?.classList.add('active');
  }
}

// ── Bootstrap — runs on DOMContentLoaded ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Hide all page content until unlocked
  document.getElementById('page-today')?.classList.remove('active');
  // Show lock screen
  lockScreen.show();
});


// ── Security: Inactivity timeout & visibility lock ────────────────────────
// Calls SecureStore.lock() (wipes in-memory key) then re-shows lock screen.
// Does nothing if the lock screen is already visible.

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes
let _idleTimer = null;

function _isLocked() {
  const el = document.getElementById('lockScreen');
  return el && el.style.display !== 'none';
}

function _hardLock() {
  if (_isLocked()) return;
  SecureStore.lock();          // wipes in-memory AES key
  lockScreen.show();
  console.log('[Security] Session locked.');
}

function _resetIdleTimer() {
  if (_isLocked()) return;     // don't bother counting when already locked
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(_hardLock, INACTIVITY_LIMIT);
}

// Activity events that reset the idle clock
['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, _resetIdleTimer, { passive: true, capture: true });
});

// Visibility lock — lock after 30 s of the tab being hidden
let _visTimer = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    _visTimer = setTimeout(() => {
      if (document.hidden) _hardLock();
    }, 30000);
  } else {
    clearTimeout(_visTimer);
  }
});

// Start idle clock once DOM is ready
document.addEventListener('DOMContentLoaded', _resetIdleTimer);
