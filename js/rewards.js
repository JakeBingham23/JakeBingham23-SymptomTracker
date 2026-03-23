// ═════════════════════════════════════════════════════════════════
// REWARDS MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Dopamine / reward system ─────────────────────────────────────────────

// ── Points system ─────────────────────────────────────────────────────────
const POINTS_KEY   = 'tracker-points';
const BADGES_KEY   = 'tracker-badges';
const WEEKLY_KEY   = 'tracker-weekly-summary';
const MONTHLY_KEY  = 'tracker-monthly-summary';

const TASK_POINTS  = 10;   // per task completion
const STREAK_BONUS = 5;    // extra per day for streak continuation
const ALL_DONE_BONUS = 25; // bonus for all non-negotiables

function getPoints()  { try { return JSON.parse(localStorage.getItem(POINTS_KEY) || '0'); } catch(e) { return 0; } }
function addPoints(n) {
  const total = getPoints() + n;
  localStorage.setItem(POINTS_KEY, JSON.stringify(total));
  return total;
}

function getStreakMultiplier() {
  const streak = state.medStreak || 0;
  if (streak >= 100) return 4;
  if (streak >= 30)  return 3;
  if (streak >= 7)   return 2;
  return 1;
}

// ── Badges ────────────────────────────────────────────────────────────────
const BADGE_DEFS = [
  { id: 'first_task',    icon: '⭐', name: 'first step',     desc: 'Complete your first task' },
  { id: 'streak_3',      icon: '🔥', name: '3-day streak',   desc: '3 days of meds in a row' },
  { id: 'streak_7',      icon: '💪', name: 'one week',       desc: '7-day medication streak' },
  { id: 'streak_30',     icon: '🏆', name: 'one month',      desc: '30-day medication streak' },
  { id: 'streak_100',    icon: '💎', name: '100 days',       desc: '100-day medication streak' },
  { id: 'streak_365',    icon: '👑', name: 'one year',       desc: '365-day medication streak' },
  { id: 'all_done',      icon: '✅', name: 'full day',       desc: 'Complete all tasks in a day' },
  { id: 'full_week',     icon: '📅', name: 'perfect week',   desc: 'All non-neg done every day for 7 days' },
  { id: 'points_100',    icon: '💯', name: '100 points',     desc: 'Earn 100 total points' },
  { id: 'points_1000',   icon: '🚀', name: '1000 points',    desc: 'Earn 1000 total points' },
  { id: 'mood_logged',   icon: '📊', name: 'self-aware',     desc: 'Log mood 7 days in a row' },
  { id: 'appointment',   icon: '🏥', name: 'prepared',       desc: 'Use pre-appointment summary' },
];

function getBadges()    { try { return JSON.parse(localStorage.getItem(BADGES_KEY) || '{}'); } catch(e) { return {}; } }
function saveBadges(b)  { localStorage.setItem(BADGES_KEY, JSON.stringify(b)); }

function earnBadge(id) {
  const badges = getBadges();
  if (badges[id]) return false; // already earned
  badges[id] = new Date().toISOString().split('T')[0];
  saveBadges(badges);
  const def = BADGE_DEFS.find(b => b.id === id);
  if (def) {
    // Play badge sound immediately (doesn't wait for overlay)
    playBadgeSound();
    hap('badge');
    // Short delay then show overlay
    setTimeout(() => showMilestone(def.icon, 'badge unlocked: ' + def.name, def.desc, 50, 'badge'), 300);
  }
  return true;
}

function checkBadges() {
  const streak = state.medStreak || 0;
  const points = getPoints();
  const all    = [...CRITICAL, ...DAILY];
  const done   = all.filter(t => state.tasks[t.id]).length;

  if (done >= 1)               earnBadge('first_task');
  if (streak >= 3)             earnBadge('streak_3');
  if (streak >= 7)             earnBadge('streak_7');
  if (streak >= 30)            earnBadge('streak_30');
  if (streak >= 100)           earnBadge('streak_100');
  if (streak >= 365)           earnBadge('streak_365');
  if (done === all.length)     earnBadge('all_done');
  if (points >= 100)           earnBadge('points_100');
  if (points >= 1000)          earnBadge('points_1000');
}

// ── Per-task celebration ──────────────────────────────────────────────────
function celebrateTask(taskId, taskName, isNonNeg) {
  const mult   = getStreakMultiplier();
  const earned = TASK_POINTS * mult;
  const total  = addPoints(earned);

  // Audio — always
  playSuccess();
  // Haptic — always
  hap('task');
  // Visual — skipped if reduce motion
  if (!(cfg.a11y || {}).reduceMotion) fireConfetti(800);

  // Screen reader: announce points earned
  announce(taskName + ' done. +' + earned + ' points' + (mult > 1 ? ' (×' + mult + ' streak bonus)' : '') + '. Total: ' + total.toLocaleString() + '.', false);

  // Flash task element (visual only — skip if reduce motion)
  const rm = (cfg.a11y || {}).reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!rm) {
    setTimeout(() => {
      document.querySelectorAll('.task').forEach(el => {
        if ((el.getAttribute('onclick') || '').includes(taskId)) {
          el.classList.add('just-done');
          setTimeout(() => el.classList.remove('just-done'), 500);
        }
      });
    }, 50);
  }

  // All non-negotiables done?
  const allCritDone = CRITICAL.every(t => state.tasks[t.id]);
  if (allCritDone && isNonNeg) {
    setTimeout(() => {
      playAllDoneSound();
      hap('allDone');
      showMilestone('🎯', 'non-negotiables done!',
        'All critical tasks complete for today. ' + (cfg.name ? 'Nice work, ' + cfg.name + '.' : 'Nice work.'),
        ALL_DONE_BONUS, 'allDone');
    }, 600);
  }

  checkBadges();
}

// ── Confetti ──────────────────────────────────────────────────────────────
function fireConfetti(duration) {
  // Respect both OS setting and in-app toggle
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ((cfg.a11y || {}).reduceMotion) return;
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const colors = ['#c8a96e','#4a9e6b','#8fb8d4','#e07070','#f0c040','#a080e0'];
  const pieces = Array.from({length: 80}, () => ({
    x:    Math.random() * canvas.width,
    y:    Math.random() * canvas.height - canvas.height,
    w:    6 + Math.random() * 8,
    h:    10 + Math.random() * 8,
    rot:  Math.random() * 360,
    rotV: (Math.random() - 0.5) * 8,
    vx:   (Math.random() - 0.5) * 4,
    vy:   3 + Math.random() * 4,
    col:  colors[Math.floor(Math.random() * colors.length)],
    alpha: 1
  }));

  const end = Date.now() + (duration || 2000);
  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    const fade = Math.max(0, (end - now) / 800);
    pieces.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.rotV;
      p.vy  += 0.1; // gravity
      ctx.save();
      ctx.globalAlpha = Math.min(1, fade) * p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (now < end) requestAnimationFrame(frame);
    else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display = 'none'; }
  }
  requestAnimationFrame(frame);
}

// ── Milestone overlay ─────────────────────────────────────────────────────
function showMilestone(emoji, title, msg, bonusPoints, hapticType, days) {
  document.getElementById('milestoneEmoji').textContent   = emoji;
  document.getElementById('milestoneTitleEl').textContent = title;
  document.getElementById('milestoneMsgEl').textContent   = msg;
  const total = bonusPoints ? addPoints(bonusPoints) : getPoints();
  const pointsMsg = bonusPoints ? '+' + bonusPoints + ' points! Total: ' + total.toLocaleString() : '';
  document.getElementById('milestonePointsEl').textContent = pointsMsg;
  document.getElementById('milestoneOverlay').classList.remove('hidden');

  // Visual — respects reduce motion
  fireConfetti(3000);

  // Audio — always plays regardless of motion setting
  playMilestoneSound(days || 0);

  // Haptic — distinctive per milestone type
  hap(hapticType || 'allDone');

  // Screen reader announcement — fires immediately, full context
  const fullMsg = title + '. ' + msg + (pointsMsg ? ' ' + pointsMsg : '');
  announce(fullMsg, true);

  // Focus for keyboard/screen reader users
  setTimeout(() => {
    const btn = document.getElementById('milestoneOverlay').querySelector('button');
    if (btn) btn.focus();
  }, 100);
}

function closeMilestone() {
  document.getElementById('milestoneOverlay').classList.add('hidden');
  announce('Celebration closed.');
}

// ── Streak milestones ─────────────────────────────────────────────────────
const STREAK_MILESTONES = [
  { days: 3,   emoji: '🔥', msg: "Three days in a row. You're building momentum.",      haptic: 'streak7' },
  { days: 7,   emoji: '💪', msg: "One full week. That's a real streak.",                haptic: 'streak7' },
  { days: 14,  emoji: '⚡', msg: 'Two weeks straight. Your brain is noticing.',           haptic: 'streak7' },
  { days: 30,  emoji: '🏆', msg: 'Thirty days. One month of consistency. Huge.',          haptic: 'streak30' },
  { days: 60,  emoji: '🌟', msg: 'Sixty days. This is a genuine habit now.',              haptic: 'streak30' },
  { days: 100, emoji: '💎', msg: 'One hundred days. You should be genuinely proud.',      haptic: 'streak100' },
  { days: 365, emoji: '👑', msg: 'A full year. That is extraordinary.',                   haptic: 'streak365' },
];

function checkStreakMilestone(streak) {
  const milestone = STREAK_MILESTONES.find(m => m.days === streak);
  if (milestone) {
    setTimeout(() => showMilestone(
      milestone.emoji,
      streak + '-day streak!',
      milestone.msg,
      streak * 5,
      milestone.haptic,
      streak
    ), 800);
  }
}

// ── Encouraging nag messages ──────────────────────────────────────────────
const NAG_ENCOURAGEMENTS = [
  'you\'ve done this before. you can do it again.',
  'small steps count. start with one.',
  'future you will be grateful.',
  'this is the one thing that helps. do it.',
  'you\'re not behind. just start now.',
  'consistency beats perfection every time.',
  'your body is worth the effort.',
  'one task at a time. that\'s all.',
];

function getEncouragement() {
  return NAG_ENCOURAGEMENTS[Math.floor(Math.random() * NAG_ENCOURAGEMENTS.length)];
}

// ── Weekly summary ────────────────────────────────────────────────────────
function generateWeeklySummary() {
  const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
  const last7   = history.slice(0, 7);
  if (last7.length === 0) return null;
  const avgDone  = (last7.reduce((s,e) => s + (e.done/(e.total||1)), 0) / last7.length * 100).toFixed(0);
  const moods    = last7.map(e => e.mood).filter(Boolean);
  const topMood  = moods.sort((a,b) => moods.filter(v=>v===b).length - moods.filter(v=>v===a).length)[0] || '—';
  const flags    = last7.reduce((s,e) => s + (e.flags||0), 0);
  return { avgDone, topMood, flags, days: last7.length, week: new Date().toISOString().split('T')[0] };
}

function renderWeeklySummaryCard() {
  const el = document.getElementById('weeklySummaryCard');
  if (!el) return;
  const summary = generateWeeklySummary();
  if (!summary) { el.innerHTML = ''; return; }
  const srText = 'Weekly summary: ' + summary.avgDone + '% task completion, top mood: ' +
    summary.topMood + ', ' + summary.flags + ' symptom flags, ' + summary.days + ' days logged.';
  el.innerHTML = `
    <div class="summary-card" role="region" aria-label="${srText}">
      <div class="summary-card-title">📅 this week</div>
      <div class="summary-card-stat"><span>avg task completion</span><span>${summary.avgDone}%</span></div>
      <div class="summary-card-stat"><span>most common mood</span><span>${summary.topMood}</span></div>
      <div class="summary-card-stat"><span>total symptom flags</span><span>${summary.flags}</span></div>
      <div class="summary-card-stat"><span>days logged</span><span>${summary.days}/7</span></div>
    </div>`;
  // Announce summary to screen readers when Stats tab is opened
  setTimeout(() => announce(srText), 500);
}

// ── Monthly summary ────────────────────────────────────────────────────────
function generateMonthlySummary() {
  const history = JSON.parse(localStorage.getItem('tracker-history') || '[]');
  if (history.length === 0) return null;
  const now     = new Date();
  const month   = now.getMonth();
  const year    = now.getFullYear();
  const thisMonth = history.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  if (thisMonth.length === 0) return null;
  const avgDone = (thisMonth.reduce((s,e) => s + (e.done/(e.total||1)), 0) / thisMonth.length * 100).toFixed(0);
  const flags   = thisMonth.reduce((s,e) => s + (e.flags||0), 0);
  const moods   = thisMonth.map(e => e.mood).filter(Boolean);
  const topMood = moods.sort((a,b) => moods.filter(v=>v===b).length - moods.filter(v=>v===a).length)[0] || '—';
  const monthName = now.toLocaleString('default', { month: 'long' });
  return { avgDone, topMood, flags, days: thisMonth.length, monthName };
}

function renderMonthlySummaryCard() {
  const el = document.getElementById('monthlySummaryCard');
  if (!el) return;
  const summary = generateMonthlySummary();
  if (!summary) { el.innerHTML = ''; return; }
  const srText = summary.monthName + ' summary: ' + summary.avgDone + '% task completion, top mood: ' +
    summary.topMood + ', ' + summary.flags + ' symptom flags, ' + summary.days + ' days logged.';
  el.innerHTML = `
    <div class="summary-card" role="region" aria-label="${srText}">
      <div class="summary-card-title">📆 ${summary.monthName}</div>
      <div class="summary-card-stat"><span>avg task completion</span><span>${summary.avgDone}%</span></div>
      <div class="summary-card-stat"><span>most common mood</span><span>${summary.topMood}</span></div>
      <div class="summary-card-stat"><span>total symptom flags</span><span>${summary.flags}</span></div>
      <div class="summary-card-stat"><span>days logged this month</span><span>${summary.days}</span></div>
    </div>`;
  setTimeout(() => announce(srText), 1200);
}

// ── Badges render ─────────────────────────────────────────────────────────
function renderBadges() {
  const el     = document.getElementById('badgesGrid');
  if (!el) return;
  const earned = getBadges();
  el.innerHTML = BADGE_DEFS.map(b => {
    const date   = earned[b.id];
    const status = date ? 'earned on ' + date : 'not yet earned. To unlock: ' + b.desc;
    return `<div class="badge-card ${date ? 'earned' : 'locked'}"
                 role="article" aria-label="${b.name} badge. ${status}">
      <span class="badge-icon" aria-hidden="true">${b.icon}</span>
      <span class="badge-name">${b.name}</span>
      <span class="badge-date">${date || 'locked'}</span>
      ${!date ? `<span class="sr-only">To unlock: ${b.desc}</span>` : ''}
    </div>`;
  }).join('');
}

// ── Points display ────────────────────────────────────────────────────────
function renderPointsDisplay(announce_) {
  const el    = document.getElementById('totalPointsDisplay');
  const mult  = document.getElementById('pointsMultiplier');
  const total = getPoints();
  const m     = getStreakMultiplier();
  if (el)   el.textContent = total.toLocaleString();
  if (mult) mult.textContent = '×' + m + ' multiplier';
  if (announce_) announce('Total points: ' + total.toLocaleString() + '. Streak multiplier: ×' + m + '.');
}
