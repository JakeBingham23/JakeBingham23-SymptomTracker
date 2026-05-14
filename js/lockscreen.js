import { SecureStore } from './crypto.js';
import { announce, escHtml } from './core.js';
// ═══════════════════════════════════════════════════════════════════════════
// LOCKSCREEN MODULE — PIN + WebAuthn UI Controller
// Daily Structure Tracker
// ═══════════════════════════════════════════════════════════════════════════

export const lockScreen = (() => {
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

      // Offer WebAuthn after PIN is set — only on valid contexts (HTTPS or localhost)
      const contextOk = SecureStore.isWebAuthnAvailable();
      const available = contextOk && await (
        window.PublicKeyCredential
          ?.isUserVerifyingPlatformAuthenticatorAvailable?.()
          .catch(() => false)
        ?? Promise.resolve(false)
      );

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
            console.warn('[lockscreen] WebAuthn setup skipped:', e.message);
            announce('Biometric setup skipped. PIN only will be used.');
          }
        }
      }

      // Generate + show recovery code — one time only
      try {
        const code = await SecureStore.generateRecoveryCode();
        showRecoveryCodeModal(code);
        // dismiss() fires after user confirms they've saved it
        return;
      } catch(e) {
        console.warn('[lockscreen] Recovery code generation failed:', e.message);
        // Proceed without it — not ideal but don't block setup
      }

      // Migration + dismiss handled by confirmRecoveryCodeSaved() after user saves code
      setError('setupPINError', '');
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
        announce('Biometric unlock successful.');
        dismiss();
      } else {
        // Presence-only — biometric verified but PIN still needed for key
        setError('unlockPINError', 'biometric verified — enter your PIN to decrypt');
        if (btn) btn.style.display = 'none';
        announce('Biometric verified. Enter your PIN to decrypt your data.');
      }
    } catch(e) {
      if (btn) { btn.textContent = 'fingerprint / face unlock'; btn.disabled = false; }
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') {
        // User cancelled — silent
      } else if (e.message && e.message.includes('HTTPS')) {
        // IP address / non-HTTPS context — explain clearly
        setError('unlockPINError', 'biometric needs HTTPS domain — use PIN');
        if (btn) btn.style.display = 'none';
        announce('Biometric unlock requires HTTPS. Use your PIN instead.');
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

      // Check biometric availability — requires credential stored AND valid context
      const hasBio    = await idbGet('__webauthn_cred') !== null;
      const canUseBio = hasBio && SecureStore.isWebAuthnAvailable();
      const btn       = document.getElementById('biometricBtn');
      if (btn && canUseBio) {
        btn.style.display = 'block';
        setTimeout(() => tryBiometric(), 500);
      } else if (btn) {
        btn.style.display = 'none';
      }

      // Show forgot PIN link if a recovery code was set up
      const hasRecovery = await SecureStore.hasRecoveryCode();
      const forgotBtn   = document.getElementById('forgotPINBtn');
      if (forgotBtn) forgotBtn.style.display = hasRecovery ? 'block' : 'none';

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

  // ── Recovery code modal (shown once on first setup) ───────────────────
  function showRecoveryCodeModal(code) {
    const overlay = document.getElementById('recoveryCodeOverlay');
    const codeEl  = document.getElementById('recoveryCodeDisplay');
    if (!overlay || !codeEl) { dismiss(); return; }
    codeEl.textContent = code;
    overlay.classList.remove('hidden');
    announce('Write down your recovery code. You will need it if you forget your PIN.');
  }

  function confirmRecoveryCodeSaved() {
    const overlay = document.getElementById('recoveryCodeOverlay');
    if (overlay) overlay.classList.add('hidden');

    // Now migrate + dismiss
    SecureStore.migrateFromLocalStorage()
      .then(result => console.log(`[SecureStore] Migrated ${result.migrated} keys`))
      .catch(e => console.warn('[SecureStore] Migration error:', e.message))
      .finally(() => dismiss());
  }

  // ── Forgot PIN flow ───────────────────────────────────────────────────
  function showForgotPIN() {
    const overlay = document.getElementById('forgotPINOverlay');
    if (overlay) overlay.classList.remove('hidden');
    const input = document.getElementById('recoveryCodeInput');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
    announce('Enter your recovery code to reset your PIN. Warning: this will clear your data.');
  }

  function hideForgotPIN() {
    const overlay = document.getElementById('forgotPINOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  async function submitRecoveryCode() {
    const input  = document.getElementById('recoveryCodeInput');
    const errEl  = document.getElementById('recoveryCodeError');
    const code   = input?.value?.trim().toUpperCase();
    if (!code) return;

    try {
      const valid = await SecureStore.resetWithRecoveryCode(code);
      if (!valid) {
        if (errEl) errEl.textContent = 'invalid recovery code';
        announce('Invalid recovery code. Check your written copy and try again.');
        return;
      }
      // Valid — wipe complete, start fresh setup
      hideForgotPIN();
      _mode     = 'setup-first';
      _attempts = 0;
      _pin      = '';
      document.getElementById('lockSetup').style.display  = 'block';
      document.getElementById('lockUnlock').style.display = 'none';
      document.getElementById('setupStep').textContent    = 'set up your new PIN';
      buildPad('setupPINPad');
      updateDots('setupPINDots', 0);
      announce('Recovery successful. Set up a new PIN.');
    } catch(e) {
      if (errEl) errEl.textContent = e.message;
    }
  }

  return { show, tryBiometric, _key, submit, confirmRecoveryCodeSaved, showForgotPIN, hideForgotPIN, submitRecoveryCode };
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


// initApp() and DOMContentLoaded bootstrap are owned by security.js.
// Removed duplicate definitions from lockscreen.js that were shadowing the real ones.
