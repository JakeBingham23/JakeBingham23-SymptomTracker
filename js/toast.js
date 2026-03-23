// ═══════════════════════════════════════════════════════════════════════════
// TOAST MODULE — Hardware Accelerated Notifications
// Daily Structure Tracker
// ═══════════════════════════════════════════════════════════════════════════
//
// Uses requestAnimationFrame double-frame pattern to ensure browser
// registers the starting state before applying show class.
// will-change: transform, opacity — forces GPU layer.
// Replaces the old showToast() inline implementation.
// ═══════════════════════════════════════════════════════════════════════════

const Toast = (() => {
  const DURATION   = 4000;
  const ANIM_OUT   = 350;

  let _container = null;

  function getContainer() {
    if (_container) return _container;
    _container = document.getElementById('toastContainer');
    if (!_container) {
      _container = document.createElement('div');
      _container.id = 'toastContainer';
      _container.setAttribute('role', 'status');
      _container.setAttribute('aria-live', 'polite');
      _container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(_container);
    }
    return _container;
  }

  function show(message, type = 'default', duration = DURATION) {
    if (!message) return;

    const container = getContainer();
    const toast     = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');

    // Icon per type
    const icons = {
      success: '✓',
      error:   '✕',
      warning: '⚠',
      info:    'ℹ',
      default: '',
    };

    toast.innerHTML = `
      ${icons[type] ? `<span class="toast__icon" aria-hidden="true">${icons[type]}</span>` : ''}
      <span class="toast__message">${escHtml ? escHtml(message) : message}</span>
    `;

    container.appendChild(toast);

    // Double RAF — ensures browser registers starting state
    // before applying .show class for smooth animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('toast--show');
      });
    });

    // Announce to screen readers
    if (typeof announce === 'function') announce(message);

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(toast), duration);

    // Allow manual dismiss on tap
    toast.addEventListener('click', () => {
      clearTimeout(timer);
      dismiss(toast);
    });

    return toast;
  }

  function dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('toast--show');
    toast.classList.add('toast--hide');
    setTimeout(() => toast.remove(), ANIM_OUT);
  }

  function success(msg, duration)  { return show(msg, 'success', duration); }
  function error(msg, duration)    { return show(msg, 'error', duration); }
  function warning(msg, duration)  { return show(msg, 'warning', duration); }
  function info(msg, duration)     { return show(msg, 'info', duration); }

  return { show, success, error, warning, info, dismiss };
})();

// Drop-in replacement for old showToast() calls throughout the app
function showToast(message, type = 'default') {
  return Toast.show(message, type);
}
