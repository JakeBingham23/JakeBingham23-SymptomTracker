// ═════════════════════════════════════════════════════════════════
// GCAL AUTH — Daily Structure Tracker v5
// GIS token model. No backend. No client_secret. Works on GitHub Pages.
// Load order: after config.js
// ═════════════════════════════════════════════════════════════════

const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
let _gcalTokenClient = null;
let _gcalAccessToken = null;
let _gcalTokenExpiry = 0;

function gcalSetToken(token, expiresIn) {
  _gcalAccessToken = token;
  _gcalTokenExpiry = Date.now() + (expiresIn - 60) * 1000;
  gcalUpdateUI();
}
function gcalGetToken() {
  return (_gcalAccessToken && Date.now() < _gcalTokenExpiry) ? _gcalAccessToken : null;
}
function gcalClearToken() {
  _gcalAccessToken = null; _gcalTokenExpiry = 0; gcalUpdateUI();
}

function gcalLoadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true; script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

async function gcalInit() {
  const clientId = cfg.gcal?.clientId;
  if (!clientId) return;
  try {
    await gcalLoadGIS();
    _gcalTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:     GCAL_SCOPE,
      callback:  response => {
        if (response.error) {
          console.error('GCal auth error:', response.error);
          gcalClearToken();
          if (typeof showToast === 'function') showToast('Google Calendar: authorisation failed');
          return;
        }
        gcalSetToken(response.access_token, response.expires_in);
        cfg.gcal.connected = true; saveConfig(cfg);
        if (typeof showToast === 'function') showToast('Google Calendar connected ✓');
        if (typeof gcalSyncFull === 'function') gcalSyncFull();
      },
    });
    gcalUpdateUI();
  } catch(err) { console.error('GCal init failed:', err); }
}

function gcalConnect() {
  if (!cfg.gcal?.clientId) {
    if (typeof showToast === 'function') showToast('Enter your Google Client ID in settings first');
    return;
  }
  if (!_gcalTokenClient) {
    gcalInit().then(() => { if (_gcalTokenClient) _gcalTokenClient.requestAccessToken({ prompt:'' }); });
    return;
  }
  _gcalTokenClient.requestAccessToken({ prompt: gcalGetToken() ? '' : 'consent' });
}

function gcalDisconnect() {
  if (_gcalAccessToken && window.google?.accounts)
    google.accounts.oauth2.revoke(_gcalAccessToken, () => {});
  gcalClearToken();
  cfg.gcal.connected = false; cfg.gcal.lastSync = null; saveConfig(cfg);
  if (typeof showToast === 'function') showToast('Google Calendar disconnected');
}

function gcalEnsureToken() {
  return new Promise((resolve, reject) => {
    if (gcalGetToken()) { resolve(gcalGetToken()); return; }
    if (!_gcalTokenClient) { reject(new Error('GCal not initialised')); return; }
    const original = _gcalTokenClient.callback;
    _gcalTokenClient.callback = response => {
      if (response.error) { reject(new Error(response.error)); return; }
      gcalSetToken(response.access_token, response.expires_in);
      _gcalTokenClient.callback = original;
      resolve(response.access_token);
    };
    _gcalTokenClient.requestAccessToken({ prompt:'' });
  });
}

function gcalUpdateUI() {
  const connected = !!gcalGetToken();
  const connectBtn    = document.getElementById('gcalConnectBtn');
  const disconnectBtn = document.getElementById('gcalDisconnectBtn');
  const statusEl      = document.getElementById('gcalStatus');
  const lastSyncEl    = document.getElementById('gcalLastSync');
  if (connectBtn)    connectBtn.style.display    = connected ? 'none' : '';
  if (disconnectBtn) disconnectBtn.style.display = connected ? '' : 'none';
  if (statusEl) {
    statusEl.textContent = connected ? '● connected' : '○ not connected';
    statusEl.style.color = connected ? 'var(--success)' : 'var(--text3)';
  }
  if (lastSyncEl && cfg.gcal?.lastSync)
    lastSyncEl.textContent = 'last sync: ' +
      new Date(cfg.gcal.lastSync).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}

document.addEventListener('DOMContentLoaded', () => {
  if (cfg.gcal?.clientId) gcalInit();
});
