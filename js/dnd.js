// ═════════════════════════════════════════════════════════════════
// DND MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Do Not Disturb ─────────────────────────────────────────────────────────
const DND_KEY = 'tracker-dnd';

function getDNDConfig() {
  try { return JSON.parse(localStorage.getItem(DND_KEY) || 'null') || {
    enabled: false,
    days: [true,true,true,true,true,true,true],
    windows: []
  }; } catch(e) { return { enabled:false, days:[true,true,true,true,true,true,true], windows:[] }; }
}

function saveDNDConfig(dnd) {
  localStorage.setItem(DND_KEY, JSON.stringify(dnd));
}

function isDNDActive() {
  const dnd = getDNDConfig();
  if (!dnd.enabled && dnd.windows.length === 0) return false;

  const now     = new Date();
  const day     = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  // Manual DND toggle
  if (dnd.enabled) return true;

  // Check if current day/time is in a quiet window
  if (!dnd.days[day]) return false;
  return dnd.windows.some(w => {
    if (!w.start || !w.end) return false;
    const [sh, sm] = w.start.split(':').map(Number);
    const [eh, em] = w.end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins   = eh * 60 + em;
    if (startMins <= endMins) return nowMins >= startMins && nowMins < endMins;
    // Overnight window (e.g. 22:00 - 08:00)
    return nowMins >= startMins || nowMins < endMins;
  });
}

function saveDND() {
  const dnd = getDNDConfig();
  dnd.enabled = document.getElementById('dndEnabled')?.checked || false;
  saveDNDConfig(dnd);
  announce('Do not disturb ' + (dnd.enabled ? 'enabled.' : 'disabled.'));
}

function toggleDNDDay(day) {
  const dnd = getDNDConfig();
  dnd.days[day] = !dnd.days[day];
  saveDNDConfig(dnd);
  const btn = document.getElementById('dndDay' + day);
  if (btn) { btn.classList.toggle('active', dnd.days[day]); btn.setAttribute('aria-pressed', dnd.days[day] ? 'true' : 'false'); }
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  announce(days[day] + ' quiet hours ' + (dnd.days[day] ? 'enabled' : 'disabled') + '.');
}

function addDNDWindow() {
  const dnd = getDNDConfig();
  dnd.windows.push({ id: 'dndw_' + Date.now(), start: '22:00', end: '08:00' });
  saveDNDConfig(dnd);
  renderDNDWindows();
}

function removeDNDWindow(id) {
  const dnd = getDNDConfig();
  dnd.windows = dnd.windows.filter(w => w.id !== id);
  saveDNDConfig(dnd);
  renderDNDWindows();
}

function updateDNDWindow(id, field, val) {
  const dnd = getDNDConfig();
  const w = dnd.windows.find(w => w.id === id);
  if (w) { w[field] = val; saveDNDConfig(dnd); }
}

function renderDNDWindows() {
  const el = document.getElementById('dndWindowsList');
  if (!el) return;
  const dnd = getDNDConfig();
  el.innerHTML = dnd.windows.length === 0
    ? `<p style="font-family:var(--font-mono);font-size:0.625rem;color:var(--text3);margin-bottom:8px">no quiet hours set</p>`
    : dnd.windows.map(w => `
      <div class="settings-task-row" style="margin-bottom:8px;align-items:center">
        <span style="font-family:var(--font-mono);font-size:0.625rem;color:var(--text3);flex-shrink:0">from</span>
        <input type="time" value="${w.start || '22:00'}"
               onchange="updateDNDWindow('${w.id}','start',this.value)"
               style="flex:1;background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-mono);font-size:0.75rem;padding:6px 8px;outline:none"
               aria-label="Quiet hours start time">
        <span style="font-family:var(--font-mono);font-size:0.625rem;color:var(--text3);flex-shrink:0">to</span>
        <input type="time" value="${w.end || '08:00'}"
               onchange="updateDNDWindow('${w.id}','end',this.value)"
               style="flex:1;background:var(--bg3);border:0.5px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-mono);font-size:0.75rem;padding:6px 8px;outline:none"
               aria-label="Quiet hours end time">
        <button class="del-btn" onclick="removeDNDWindow('${w.id}')" aria-label="Remove this quiet hours window">×</button>
      </div>
    `).join('');
}

function syncDNDUI() {
  const dnd = getDNDConfig();
  const el = document.getElementById('dndEnabled');
  if (el) el.checked = dnd.enabled;
  [0,1,2,3,4,5,6].forEach(d => {
    const btn = document.getElementById('dndDay' + d);
    if (btn) { btn.classList.toggle('active', dnd.days[d]); btn.setAttribute('aria-pressed', dnd.days[d] ? 'true' : 'false'); }
  });
  renderDNDWindows();
}
