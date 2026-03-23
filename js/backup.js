// ═════════════════════════════════════════════════════════════════
// BACKUP MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Data backup / restore / QR transfer ──────────────────────────────────

const BACKUP_VERSION = '1';

function collectAllData() {
  // Gather every localStorage key belonging to this app
  const data = {
    version:   BACKUP_VERSION,
    exported:  new Date().toISOString(),
    config:    localStorage.getItem('tracker-config'),
    history:   localStorage.getItem('tracker-history'),
    appts:     localStorage.getItem('tracker-appts'),
    points:    localStorage.getItem('tracker-points'),
    badges:    localStorage.getItem('tracker-badges'),
    streak:    localStorage.getItem('tracker-med-streak'),
    quoteFavs: localStorage.getItem('tracker-quote-favs'),
    quoteBlocked: localStorage.getItem('tracker-quote-blocked'),
    weeklySummary:  localStorage.getItem('tracker-weekly-summary'),
    monthlySummary: localStorage.getItem('tracker-monthly-summary'),
    journal:        localStorage.getItem('tracker-journal'),
    days: {}
  };

  // Collect all daily check-in states (tracker-YYYY-MM-DD)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (/^tracker-\d{4}-\d{2}-\d{2}$/.test(key)) {
      data.days[key] = localStorage.getItem(key);
    }
  }

  return data;
}

function restoreAllData(data) {
  if (!data || data.version !== BACKUP_VERSION) {
    throw new Error('Invalid or incompatible backup file.');
  }

  // Restore each key
  const keyMap = {
    config:        'tracker-config',
    history:       'tracker-history',
    appts:         'tracker-appts',
    points:        'tracker-points',
    badges:        'tracker-badges',
    streak:        'tracker-med-streak',
    quoteFavs:     'tracker-quote-favs',
    quoteBlocked:  'tracker-quote-blocked',
    weeklySummary: 'tracker-weekly-summary',
    monthlySummary:'tracker-monthly-summary',
    journal:       'tracker-journal',
  };

  Object.entries(keyMap).forEach(([prop, key]) => {
    if (data[prop] !== undefined && data[prop] !== null) {
      localStorage.setItem(key, data[prop]);
    }
  });

  // Restore daily states
  if (data.days) {
    Object.entries(data.days).forEach(([key, val]) => {
      if (val) localStorage.setItem(key, val);
    });
  }
}

function exportBackup() {
  try {
    const data     = collectAllData();
    const json     = JSON.stringify(data, null, 2);
    const blob     = new Blob([json], { type: 'application/json' });
    const filename = 'tracker-backup-' + TODAY + '.json';

    // Mobile: try share sheet first
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile && navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Tracker backup ' + TODAY })
          .then(() => backupStatus('backup shared ✓', 'var(--success)'))
          .catch(e => { if (e.name !== 'AbortError') downloadBlob(blob, filename); });
        return;
      }
    }
    downloadBlob(blob, filename);
    backupStatus('backup saved ✓ — check Downloads', 'var(--success)');
    announce('Backup exported successfully.');
  } catch(e) {
    backupStatus('export failed: ' + e.message, 'var(--danger)');
  }
}

async function importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // reset so same file can be picked again

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Confirm before overwriting
    const confirmed = confirm(
      'This will replace ALL your current data with the backup from ' +
      (data.exported ? new Date(data.exported).toLocaleDateString() : 'unknown date') +
      '\n\nThis cannot be undone. Continue?'
    );
    if (!confirmed) return;

    restoreAllData(data);

    // Reload config and state
    const newCfg = loadConfig();
    if (newCfg) {
      Object.assign(cfg, newCfg);
      CRITICAL  = cfg.critical  || DEFAULT_CRITICAL;
      DAILY     = cfg.daily     || DEFAULT_DAILY;
      SYMPTOMS  = cfg.symptoms  || DEFAULT_SYMPTOMS;
    }
    loadState();
    applyA11yPrefs();
    applyTheme(cfg.theme || 'system');
    applyName(cfg.name);
    render();
    renderSettingsPanel();

    backupStatus('backup restored ✓ — all data loaded', 'var(--success)');
    announce('Backup restored successfully. All data has been loaded.', true);
    hap('allDone');
    playSuccess();
  } catch(e) {
    backupStatus('import failed: ' + e.message, 'var(--danger)');
    announce('Import failed: ' + e.message, true);
  }
}

function backupStatus(msg, color) {
  const el = document.getElementById('backupStatus');
  if (el) { el.textContent = msg; el.style.color = color || 'var(--text2)'; }
  setTimeout(() => { if (el) el.textContent = ''; }, 5000);
}

// QR export replaced by showQRConfig and exportEncryptedBackup

function hideQR() {
  const section = document.getElementById('qrSection');
  if (section) section.style.display = 'none';
  backupStatus('', '');
}

// ── Encrypted backup system ──────────────────────────────────────────────

// AES-256-GCM encryption using Web Crypto API
async function deriveKey(passphrase, salt) {
  const enc     = new TextEncoder();
  const keyMat  = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  );
}

async function encryptData(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(passphrase, salt);
  const enc  = new TextEncoder();
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
  // Pack: salt(16) + iv(12) + ciphertext
  const packed = new Uint8Array(16 + 12 + ct.byteLength);
  packed.set(salt, 0);
  packed.set(iv, 16);
  packed.set(new Uint8Array(ct), 28);
  // Base64 encode
  return btoa(String.fromCharCode(...packed));
}

async function decryptData(b64, passphrase) {
  const packed = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const salt   = packed.slice(0, 16);
  const iv     = packed.slice(16, 28);
  const ct     = packed.slice(28);
  const key    = await deriveKey(passphrase, salt);
  const dec    = new TextDecoder();
  const plain  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return dec.decode(plain);
}

function showEncryptSection() {
  const el = document.getElementById('encryptSection');
  if (el) { el.style.display = 'block'; el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  setTimeout(() => document.getElementById('encryptPassphrase')?.focus(), 100);
}

function hideEncrypt() {
  const el = document.getElementById('encryptSection');
  if (el) el.style.display = 'none';
  const pw = document.getElementById('encryptPassphrase');
  if (pw) pw.value = '';
}

async function exportEncryptedBackup() {
  showEncryptSection();
}

async function doEncryptedExport() {
  const passphrase = document.getElementById('encryptPassphrase')?.value?.trim();
  if (!passphrase || passphrase.length < 4) {
    backupStatus('passphrase must be at least 4 characters', 'var(--danger)');
    return;
  }
  try {
    backupStatus('encrypting...', 'var(--text3)');
    const data      = collectAllData();
    const json      = JSON.stringify(data);
    const encrypted = await encryptData(json, passphrase);
    const payload   = JSON.stringify({ v: 1, enc: true, data: encrypted });
    const blob      = new Blob([payload], { type: 'application/json' });
    const filename  = 'tracker-encrypted-' + TODAY + '.json';

    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile && navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Encrypted tracker backup' });
        backupStatus('encrypted backup shared ✓', 'var(--success)');
        hideEncrypt();
        announce('Encrypted backup exported successfully.');
        return;
      }
    }
    downloadBlob(blob, filename);
    backupStatus('encrypted backup saved ✓ — check Downloads', 'var(--success)');
    hideEncrypt();
    announce('Encrypted backup saved. Keep your passphrase safe.');
    hap('allDone');
  } catch(e) {
    backupStatus('encryption failed: ' + e.message, 'var(--danger)');
  }
}

// ── Import handles both encrypted and plain backups ───────────────────────
async function importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';

  try {
    const text    = await file.text();
    const payload = JSON.parse(text);

    // Check if encrypted
    if (payload.enc && payload.data) {
      // Use passphrase modal instead of insecure prompt()
    showPassphraseModal(async (passphrase) => {
      if (!passphrase) return;
      try {
        const decrypted = await decryptData(payload.data, passphrase);
        const data = JSON.parse(decrypted);
        await doRestore(data);
      } catch(e) {
        backupStatus('wrong passphrase or corrupted backup', 'var(--danger)');
        announce('Import failed: wrong passphrase or corrupted file.', true);
        showPassphraseError();
      }
    });
    return;
    }

    // Plain backup
    await doRestore(payload);
  } catch(e) {
    backupStatus('import failed: ' + e.message, 'var(--danger)');
    announce('Import failed: ' + e.message, true);
  }
}

async function doRestore(data) {
  if (!data || data.version !== BACKUP_VERSION) {
    throw new Error('Invalid or incompatible backup file.');
  }

  const confirmed = confirm(
    'This will replace ALL your current data with the backup from ' +
    (data.exported ? new Date(data.exported).toLocaleDateString() : 'unknown date') +
    '.\n\nThis cannot be undone. Continue?'
  );
  if (!confirmed) return;

  restoreAllData(data);

  const newCfg = loadConfig();
  if (newCfg) {
    Object.assign(cfg, newCfg);
    CRITICAL = cfg.critical || DEFAULT_CRITICAL;
    DAILY    = cfg.daily    || DEFAULT_DAILY;
    SYMPTOMS = cfg.symptoms || DEFAULT_SYMPTOMS;
  }
  loadState();
  applyA11yPrefs();
  applyTheme(cfg.theme || 'system');
  applyName(cfg.name);
  render();
  renderSettingsPanel();

  backupStatus('backup restored ✓ — all data loaded', 'var(--success)');
  announce('Backup restored successfully.', true);
  hap('allDone');
  playSuccess();
}

// ── Config-only QR (small enough to always fit) ───────────────────────────
function showQRConfig() {
  const section = document.getElementById('qrSection');
  const canvas  = document.getElementById('qrCanvas');
  if (!section || !canvas) return;

  try {
    // Config only — tasks, symptoms, settings (no history/journal/budget data)
    const configOnly = {
      version:  BACKUP_VERSION,
      exported: new Date().toISOString(),
      config:   localStorage.getItem('tracker-config'),
      _note:    'config transfer only — import restores tasks, symptoms, and settings'
    };
    const payload = JSON.stringify(configOnly);

    if (payload.length > 2953) {
      backupStatus('config too large for QR — simplify your task list', 'var(--warning)');
      announce('Config is too large for QR. Try shortening task names.');
      return;
    }

    // Generate QR
    canvas.width  = 220;
    canvas.height = 220;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 220, 220);

    if (typeof QRCode !== 'undefined') {
      const div = document.createElement('div');
      new QRCode(div, {
        text: payload, width: 220, height: 220,
        colorDark: '#0c0c0c', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      setTimeout(() => {
        const img = div.querySelector('img') || div.querySelector('canvas');
        if (img) {
          if (img.tagName === 'CANVAS') ctx.drawImage(img, 0, 0, 220, 220);
          else { const i = new Image(); i.onload = () => ctx.drawImage(i, 0, 0, 220, 220); i.src = img.src; }
        }
      }, 100);
    } else {
      backupStatus('QR library not loaded — use encrypted export', 'var(--warning)');
      return;
    }

    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    backupStatus('config QR ready — scan on another device to import tasks and settings', 'var(--text2)');
    announce('Config QR code generated. Scan it on another device to transfer your settings.');
  } catch(e) {
    backupStatus('QR generation failed: ' + e.message, 'var(--danger)');
  }
}

// ── CSV Export ───────────────────────────────────────────────────────────
function exportCSV() {
  try {
    const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
    if (history.length === 0) {
      alert('No history to export yet — save a check-in first.');
      return;
    }
    const headers = ['date','tasks_done','tasks_total','pct_done','mood','energy','flags','notes'];
    const rows = history.map(e => {
      // Pull notes from the day's full state if available
      let notes = '';
      try {
        const dayRaw = localStorage.getItem('tracker-' + e.date);
        if (dayRaw) notes = JSON.parse(dayRaw).notes || '';
      } catch(_) {}
      const pct = e.total > 0 ? ((e.done / e.total) * 100).toFixed(0) + '%' : '—';
      return [
        e.date,
        e.done,
        e.total,
        pct,
        e.mood  || '',
        e.energy || '',
        e.flags,
        '"' + notes.replace(/"/g, '""') + '"'
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const filename = 'tracker-history-' + TODAY + '.csv';

    // Share on mobile, download on desktop
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile && navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: 'text/csv' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({ title: 'Tracker history', files: [file] }).catch(() => downloadBlob(blob, filename));
        return;
      }
    }
    downloadBlob(blob, filename);
  } catch(e) {
    alert('Export failed: ' + e.message);
  }
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}
