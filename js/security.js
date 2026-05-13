// ═════════════════════════════════════════════════════════════════
// SECURITY MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

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
