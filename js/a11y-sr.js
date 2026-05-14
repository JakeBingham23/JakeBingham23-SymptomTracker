// ═════════════════════════════════════════════════════════════════
// SCREEN READER SUPPORT — Daily Structure Tracker v5.7
//
// Covers: VoiceOver (iOS/macOS), TalkBack (Android), NVDA, JAWS.
//
// Provides:
//   trapFocus(element)      — lock Tab within element, returns release fn
//   openModal(el, opener?)  — trap + announce + move focus
//   closeModal(el, opener?) — release + return focus
//   a11yAnnounce(msg, mode) — queued announcements (TalkBack-safe)
//   initTabKeyboard()       — arrow key nav on tablist
//   initPINKeyboard()       — digit key input for PIN pad
// ═════════════════════════════════════════════════════════════════

'use strict';

// ── Focusable selector ───────────────────────────────────────────
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
  '[role="button"]:not([tabindex="-1"])',
].join(', ');

function getFocusable(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE))
    .filter(el => !el.closest('[hidden]') && !el.closest('[aria-hidden="true"]'));
}

// ── Focus trap ───────────────────────────────────────────────────
// Returns a cleanup function. Always call cleanup() on close.
function trapFocus(container) {
  function handleKey(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable(container);
    if (!focusable.length) { e.preventDefault(); return; }
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  container.addEventListener('keydown', handleKey);
  // Move focus inside container immediately
  const focusable = getFocusable(container);
  if (focusable.length) {
    // Prefer the first heading or button, not just first focusable
    const heading = container.querySelector('h1,h2,h3,[data-autofocus]');
    (heading || focusable[0]).focus();
  }
  return () => container.removeEventListener('keydown', handleKey);
}

// ── Modal open/close with focus management ───────────────────────
const _modalStack = []; // [{el, cleanup, opener}]

function openModal(el, opener) {
  if (!el) return;
  el.classList.remove('hidden');
  el.removeAttribute('hidden');
  // Hide siblings from AT so VoiceOver doesn't read behind the modal
  document.querySelectorAll('body > *:not([aria-live])').forEach(sib => {
    if (sib !== el && !sib.dataset.modalShield) sib.setAttribute('aria-hidden', 'true');
  });
  const cleanup = trapFocus(el);
  _modalStack.push({ el, cleanup, opener: opener || document.activeElement });
}

function closeModal(el) {
  const entry = _modalStack.find(m => m.el === el);
  if (!entry) {
    // No tracked entry — just hide and return focus to body
    el?.classList.add('hidden');
    return;
  }
  _modalStack.splice(_modalStack.indexOf(entry), 1);
  entry.cleanup();
  el.classList.add('hidden');
  // Restore siblings
  if (_modalStack.length === 0) {
    document.querySelectorAll('[aria-hidden="true"]').forEach(sib => {
      if (!sib.closest('[id$="Overlay"],[id$="Modal"],[id$="overlay"],[id$="modal"]'))
        sib.removeAttribute('aria-hidden');
    });
  }
  // Return focus to opener
  if (entry.opener && typeof entry.opener.focus === 'function') {
    entry.opener.focus();
  }
}

// Expose globally so existing onclick="..." handlers can call them
window.openModal  = openModal;
window.closeModal = closeModal;

// ── Queued announce — TalkBack-safe ─────────────────────────────
// TalkBack can miss rapid consecutive live region updates.
// Queue ensures each message gets its own clear + set cycle with
// enough time between them for the AT to register.
const _announceQueue = [];
let   _announcing    = false;

function a11yAnnounce(msg, assertive) {
  if (!msg) return;
  _announceQueue.push({ msg, assertive });
  if (!_announcing) _drainQueue();
}

function _drainQueue() {
  if (!_announceQueue.length) { _announcing = false; return; }
  _announcing = true;
  const { msg, assertive } = _announceQueue.shift();
  const id = assertive ? 'ariaAlert' : 'ariaStatus';
  const el = document.getElementById(id);
  if (!el) { _drainQueue(); return; }
  // Clear → short pause → set → next message after a beat
  el.textContent = '';
  el.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    el.setAttribute('aria-hidden', 'false');
    el.textContent = msg;
    setTimeout(_drainQueue, 600); // give AT 600ms to read before next
  }, 50);
}

// Patch the global announce() to route through the queue
// (announce is defined in core.js — we override it here after load)
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.announce === 'function') {
    const _origAnnounce = window.announce;
    window.announce = function(msg, assertive) {
      a11yAnnounce(msg, assertive);
    };
  }
});

// ── Tab bar keyboard navigation ──────────────────────────────────
// ARIA tab pattern: Left/Right arrows move between tabs.
// Home/End jump to first/last. Tab moves focus in/out of tablist.
function initTabKeyboard() {
  const tablist = document.querySelector('[role="tablist"]');
  if (!tablist) return;

  tablist.addEventListener('keydown', e => {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const idx  = tabs.indexOf(document.activeElement);
    if (idx === -1) return;

    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft')  next = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home')       next = 0;
    if (e.key === 'End')        next = tabs.length - 1;

    if (next !== -1) {
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click(); // activate the tab
    }

    // Space/Enter on focused tab
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tabs[idx].click();
    }
  });

  // Make only active tab reachable by Tab key (roving tabindex)
  function updateRovingTabindex() {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    tabs.forEach(t => {
      t.setAttribute('tabindex', t.getAttribute('aria-selected') === 'true' ? '0' : '-1');
    });
  }
  updateRovingTabindex();
  tablist.addEventListener('click', () => setTimeout(updateRovingTabindex, 50));
}

// ── PIN pad keyboard input ───────────────────────────────────────
// Hardware keyboard and TalkBack switch access support.
// When PIN pad is visible, digit keys 0-9 and Backspace work.
function initPINKeyboard() {
  document.addEventListener('keydown', e => {
    // Only when lock screen is visible
    const lockEl = document.getElementById('lockScreen');
    if (!lockEl || lockEl.style.display === 'none') return;
    // Don't intercept if user is in a text input
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      // Which pad is active?
      const setupVisible  = document.getElementById('lockSetup')?.style.display !== 'none';
      const padId = setupVisible ? 'setupPINPad' : 'unlockPINPad';
      if (typeof lockScreen !== 'undefined') lockScreen._key(padId, e.key);
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      const setupVisible = document.getElementById('lockSetup')?.style.display !== 'none';
      const padId = setupVisible ? 'setupPINPad' : 'unlockPINPad';
      if (typeof lockScreen !== 'undefined') lockScreen._key(padId, 'del');
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const setupVisible = document.getElementById('lockSetup')?.style.display !== 'none';
      if (typeof lockScreen !== 'undefined') lockScreen.submit(!setupVisible);
    }
  });
}

// ── Focus moves to page heading on tab switch ────────────────────
// Patch switchTab to move AT focus to the new panel's heading.
document.addEventListener('DOMContentLoaded', () => {
  const _origSwitchTab = window.switchTab;
  if (typeof _origSwitchTab === 'function') {
    window.switchTab = async function(tab) {
      await _origSwitchTab(tab);
      // Move focus to first heading in new panel
      const panel = document.getElementById('page-' + tab);
      if (panel) {
        const heading = panel.querySelector('h1, h2, [data-tab-focus]');
        if (heading) {
          // Make heading focusable temporarily
          const had = heading.hasAttribute('tabindex');
          if (!had) heading.setAttribute('tabindex', '-1');
          heading.focus();
          if (!had) setTimeout(() => heading.removeAttribute('tabindex'), 100);
        }
      }
    };
  }
});

// ── Init on load ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabKeyboard();
  initPINKeyboard();
});
