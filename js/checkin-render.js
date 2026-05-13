// ═════════════════════════════════════════════════════════════════
// CHECK-IN IMAGE RENDERER — Daily Structure Tracker
//
// Renders a clean, doctor-friendly summary of today's check-in
// directly to a canvas. No html2canvas, no DOM parsing, no CDN.
// Pulls data from state + cfg, paints with the current theme colors.
//
// Exposes: renderCheckinImage() → HTMLCanvasElement
// ═════════════════════════════════════════════════════════════════

function renderCheckinImage() {
  const W   = 1080;
  const PAD = 64;
  const COL = W - PAD * 2;

  // ── Theme tokens ──────────────────────────────────────────────────
  const cs = getComputedStyle(document.documentElement);
  const tok = (v, fb) => (cs.getPropertyValue(v).trim() || fb);

  const C = {
    bg:        tok('--bg',         '#0f0f0f'),
    bg2:       tok('--bg2',        '#1a1a1a'),
    text:      tok('--text',       '#e8e6e1'),
    text2:     tok('--text2',      '#a0a0a0'),
    text3:     tok('--text3',      '#6a6a6a'),
    accent:    tok('--accent',     '#c8a96e'),
    border:    tok('--border',     'rgba(255,255,255,0.1)'),
    catNeuro:  tok('--cat-neuro',  '#8fb8d4'),
    catPsych:  tok('--cat-psych',  '#c97a7a'),
    catPhys:   tok('--cat-phys',   '#6ea96e'),
    catBehav:  tok('--cat-behav',  '#c8a96e'),
    catCustom: tok('--cat-custom', '#b89bc8'),
  };

  const FONT_MONO = 'ui-monospace, "SF Mono", "Roboto Mono", monospace';
  const FONT_BODY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // ── Read state ────────────────────────────────────────────────────
  const energy  = (typeof state !== 'undefined' && state.mood && state.mood.energy) || '—';
  const mood    = (typeof state !== 'undefined' && state.mood && state.mood.mood)   || '—';
  const notes   = (typeof state !== 'undefined' && state.notes)                     || '';
  const flagged = (typeof state !== 'undefined' && Array.isArray(state.symptoms))
                  ? state.symptoms : [];
  const streak  = (typeof state !== 'undefined' && state.medStreak) || 0;
  const name    = (typeof cfg   !== 'undefined' && cfg.name)        || '';

  // Group flagged symptoms by their category
  const cssVarToKey = {
    '--cat-neuro':  'catNeuro',
    '--cat-psych':  'catPsych',
    '--cat-phys':   'catPhys',
    '--cat-behav':  'catBehav',
    '--cat-custom': 'catCustom',
  };
  const groups = [];
  const matched = new Set();
  if (typeof SYMPTOM_CATEGORIES !== 'undefined') {
    for (const cat of SYMPTOM_CATEGORIES) {
      const hits = cat.symptoms.filter(s => flagged.includes(s));
      if (hits.length > 0) {
        const colorKey = cssVarToKey[cat.cssVar] || 'catCustom';
        groups.push({ label: cat.label, color: C[colorKey], symptoms: hits });
        hits.forEach(s => matched.add(s));
      }
    }
  }
  const orphans = flagged.filter(s => !matched.has(s));
  if (orphans.length > 0) {
    groups.push({ label: 'other', color: C.catCustom, symptoms: orphans });
  }

  // Tasks today
  let tasksDone = 0, tasksTotal = 0;
  if (typeof CRITICAL !== 'undefined' && typeof DAILY !== 'undefined') {
    const all  = [...CRITICAL, ...DAILY];
    tasksTotal = all.length;
    tasksDone  = all.filter(t => state.tasks && state.tasks[t.id]).length;
  }

  // Days logged in the last 7 days
  let daysLogged = 0;
  try {
    const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
    const cutoff  = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    daysLogged = history.filter(e => new Date(e.date) >= cutoff).length;
  } catch (e) {}

  // ── Text wrapping helper ──────────────────────────────────────────
  function wrap(ctx, text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? line + ' ' + word : word;
      if (ctx.measureText(trial).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // ── Measurement pass ──────────────────────────────────────────────
  // Compute total height before allocating the real canvas.
  const tmp = document.createElement('canvas').getContext('2d');

  const headerH  = name ? 130 : 100;
  const moodH    = 110;
  const symptomsHeaderH = 50;

  let symptomsBodyH = 0;
  if (groups.length === 0) {
    symptomsBodyH = 40;
  } else {
    tmp.font = '22px ' + FONT_BODY;
    for (const g of groups) {
      symptomsBodyH += 36; // category header row
      const lines = wrap(tmp, g.symptoms.join(', '), COL - 32);
      symptomsBodyH += lines.length * 32 + 14;
    }
  }
  const symptomsH = symptomsHeaderH + symptomsBodyH;

  const notesHeaderH = 44;
  let notesBodyH = 0;
  if (notes.trim()) {
    tmp.font = '20px ' + FONT_BODY;
    const lines = wrap(tmp, notes.trim(), COL);
    notesBodyH = lines.length * 30 + 8;
  } else {
    notesBodyH = 36;
  }
  const notesH = notesHeaderH + notesBodyH;

  const footerH = 110;

  const H = PAD + headerH + moodH + symptomsH + 24 + notesH + 24 + footerH + PAD;

  // ── Paint ─────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx     = canvas.getContext('2d');

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'top';
  let y = PAD;

  // Header — title + date
  ctx.font = '600 38px ' + FONT_MONO;
  ctx.fillStyle = C.text;
  ctx.fillText('daily check-in', PAD, y);

  ctx.font = '22px ' + FONT_MONO;
  ctx.fillStyle = C.text2;
  ctx.textAlign = 'right';
  ctx.fillText(
    new Date().toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    }),
    W - PAD, y + 10
  );
  ctx.textAlign = 'left';

  y += 60;

  if (name) {
    ctx.font = '20px ' + FONT_MONO;
    ctx.fillStyle = C.text3;
    ctx.fillText(name, PAD, y);
    y += 32;
  }

  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y + 10);
  ctx.lineTo(W - PAD, y + 10);
  ctx.stroke();
  y += 38;

  // Mood + Energy
  const colW = COL / 2;
  ctx.font = '600 12px ' + FONT_MONO;
  ctx.fillStyle = C.text3;
  ctx.fillText('ENERGY', PAD, y);
  ctx.fillText('MOOD',   PAD + colW, y);

  ctx.font = '500 32px ' + FONT_MONO;
  ctx.fillStyle = C.accent;
  ctx.fillText(String(energy).toLowerCase(), PAD,        y + 26);
  ctx.fillText(String(mood).toLowerCase(),   PAD + colW, y + 26);

  y += 90;

  // Symptoms
  ctx.font = '600 12px ' + FONT_MONO;
  ctx.fillStyle = C.text3;
  ctx.fillText('FLAGGED SYMPTOMS', PAD, y);
  y += 32;

  if (groups.length === 0) {
    ctx.font = 'italic 20px ' + FONT_BODY;
    ctx.fillStyle = C.text2;
    ctx.fillText('— nothing flagged today —', PAD, y);
    y += 32;
  } else {
    for (const g of groups) {
      // colored dot
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(PAD + 6, y + 10, 6, 0, Math.PI * 2);
      ctx.fill();

      // category label
      ctx.font = '500 18px ' + FONT_MONO;
      ctx.fillStyle = g.color;
      ctx.fillText(g.label.toLowerCase(), PAD + 24, y);
      y += 32;

      // symptoms in that category
      ctx.font = '22px ' + FONT_BODY;
      ctx.fillStyle = C.text;
      const lines = wrap(ctx, g.symptoms.join(', '), COL - 32);
      for (const line of lines) {
        ctx.fillText(line, PAD + 24, y);
        y += 32;
      }
      y += 14;
    }
  }

  y += 16;

  // Notes
  ctx.font = '600 12px ' + FONT_MONO;
  ctx.fillStyle = C.text3;
  ctx.fillText('NOTES', PAD, y);
  y += 30;

  if (notes.trim()) {
    ctx.font = '20px ' + FONT_BODY;
    ctx.fillStyle = C.text;
    const lines = wrap(ctx, notes.trim(), COL);
    for (const line of lines) {
      ctx.fillText(line, PAD, y);
      y += 30;
    }
  } else {
    ctx.font = 'italic 18px ' + FONT_BODY;
    ctx.fillStyle = C.text3;
    ctx.fillText('— no notes —', PAD, y);
    y += 30;
  }

  y += 24;

  // Footer
  ctx.strokeStyle = C.border;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 22;

  ctx.font = '18px ' + FONT_MONO;
  ctx.fillStyle = C.text2;
  const stats = [
    'tasks: '  + tasksDone  + '/' + tasksTotal,
    'streak: ' + streak     + ' days',
    'logged: ' + daysLogged + '/7 days'
  ];
  const statColW = COL / stats.length;
  for (let i = 0; i < stats.length; i++) {
    ctx.fillText(stats[i], PAD + i * statColW, y);
  }
  y += 44;

  // Timestamp
  const ts = new Date().toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  ctx.font = '14px ' + FONT_MONO;
  ctx.fillStyle = C.text3;
  ctx.textAlign = 'right';
  ctx.fillText('captured ' + ts + '  //  tracker', W - PAD, y);
  ctx.textAlign = 'left';

  return canvas;
}
