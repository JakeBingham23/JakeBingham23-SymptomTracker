// ═════════════════════════════════════════════════════════════════
// QUOTES MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Quote / encouragement system ─────────────────────────────────────────

const QUOTE_KEY       = 'tracker-quote-today';
const QUOTE_FAVS_KEY  = 'tracker-quote-favs';
const QUOTE_BLOCKED_KEY = 'tracker-quote-blocked';
const ANTHROPIC_KEY_K = 'tracker-anthropic-key';
// Migrate API key from localStorage to sessionStorage (one-time)
(function migrateApiKey() {
  const old = localStorage.getItem(ANTHROPIC_KEY_K);
  if (old) {
    sessionStorage.setItem(ANTHROPIC_KEY_K, old);
    localStorage.removeItem(ANTHROPIC_KEY_K);
  }
})();

// ── Offline quote bank ────────────────────────────────────────────────────
const OFFLINE_QUOTES = {
  struggling: [
    "You showed up. That's the whole job today.",
    "A bad day with meds is still better than the alternative. You did that.",
    "Struggling and still trying are not opposites. You're doing both.",
    "Your brain is working against you right now. That's not a character flaw.",
    "You don't have to feel okay to do okay. Evidence: you're here.",
    "Hard days are part of the deal. You're not failing, you're just in one.",
    "Consistency isn't about feeling motivated. It's about showing up anyway. You did.",
    "The fact that you opened this app is a form of not giving up.",
    "Low energy is not the same as low effort. You're expending more than you think.",
    "Some days the win is just 'didn't make it worse.' That counts.",
    "You are allowed to have a hard day and still be someone who is trying.",
    "There is no version of this that requires you to feel good first.",
  ],
  okay: [
    "Flat is fine. Flat is sustainable. Flat keeps you in the game.",
    "Ordinary days are the ones that build the streak. This is one of those.",
    "You don't need to love the routine. You just need to do it. And you did.",
    "Not every day has a lesson. Sometimes it's just another day done.",
    "Showing up in the middle is underrated. The middle is most of it.",
    "You're maintaining something. That's harder than it sounds.",
    "Good enough is a legitimate goal and you hit it today.",
    "The boring repetition is the point. You're doing the actual work.",
    "Another day on the streak. That's real.",
    "Consistency is built in the unremarkable days. Today counts.",
  ],
  good: [
    "This is what a good day looks like. Remember it for the other kind.",
    "You built this. The streak, the habit, the capacity for a day like today.",
    "Notice this. Your brain on structure, working. This is the goal.",
    "Good days aren't luck. They're downstream of the work you've been doing.",
    "You get to feel good about this. Actually let yourself.",
    "This is the payoff for all the low-energy days you still showed up through.",
    "Today you made it look easy. That's because you've been doing the hard work.",
    "This is evidence. When things are working, they work like this.",
  ],
  milestone: [
    "Streaks are just small decisions that compound. You've been making them.",
    "The person who started this and the person reading this have different evidence.",
    "You built something real here. Not a feeling — an actual record.",
    "This is what keeping promises to yourself looks like from the outside.",
    "You didn't just survive the hard days. You kept going through them.",
  ],
  generic: [
    "The goal was never perfection. The goal was continuation.",
    "Your nervous system is different. Your tools need to be too. These are yours.",
    "Structure isn't a cage. For some brains it's the thing that sets you free.",
    "You are not behind. You are exactly where your effort has put you.",
    "It doesn't have to feel meaningful to be meaningful.",
    "The app doesn't care how you feel about using it. It just works when you do.",
    "Small consistent actions outperform large inconsistent ones. Always.",
    "You get credit for doing the thing even when doing the thing is hard.",
    "Tomorrow's version of you benefits from what you do right now.",
    "There is no version of getting better that skips the boring middle part.",
  ]
};

function getOfflineQuote(state) {
  const blocked = JSON.parse(localStorage.getItem(QUOTE_BLOCKED_KEY) || '[]');
  let pool = OFFLINE_QUOTES[state] || OFFLINE_QUOTES.generic;
  const available = pool.filter(q => !blocked.includes(q));
  if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  return available[Math.floor(Math.random() * available.length)];
}

function getDayState() {
  const all    = [...CRITICAL, ...DAILY];
  const done   = all.filter(t => state.tasks[t.id]).length;
  const pct    = all.length > 0 ? done / all.length : 0;
  const streak = state.medStreak || 0;
  const flags  = state.symptoms.length;
  if (STREAK_MILESTONES.some(m => m.days === streak)) return 'milestone';
  if (flags >= 3 || pct < 0.3) return 'struggling';
  if (pct >= 0.8 && flags === 0) return 'good';
  return 'okay';
}

// ── AI quote generation ───────────────────────────────────────────────────
async function generateAIQuote(context) {
  const key = sessionStorage.getItem(ANTHROPIC_KEY_K);
  if (!key) return null;
  const prefs = cfg.notifPrefs || {};
  if (prefs.aiQuotesEnabled === false) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: `You write short, honest, non-generic encouragement for people with AuDHD and bipolar disorder using a daily structure tracker. 
You know their data for today. Write ONE sentence or two short sentences max. 
No exclamation marks. No toxic positivity. No "You've got this!" type phrases.
Be real, specific to their situation, and warm without being saccharine.
Respond with ONLY the message text, nothing else.`,
        messages: [{
          role: 'user',
          content: `Today's data: ${context}. Write a short personalised message for them.`
        }]
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch(e) {
    return null;
  }
}

function buildContext() {
  const all    = [...CRITICAL, ...DAILY];
  const done   = all.filter(t => state.tasks[t.id]).length;
  const streak = state.medStreak || 0;
  const flags  = state.symptoms;
  const mood   = state.mood.mood || 'not set';
  const energy = state.mood.energy || 'not set';
  const name   = cfg.name || '';
  return [
    name ? 'Name: ' + name : '',
    'Tasks done: ' + done + '/' + all.length,
    'Mood: ' + mood,
    'Energy: ' + energy,
    flags.length > 0 ? 'Flagged symptoms: ' + flags.join(', ') : 'No symptoms flagged',
    'Medication streak: ' + streak + ' days',
    'Day state: ' + getDayState()
  ].filter(Boolean).join('. ');
}

// ── Quote of the day ──────────────────────────────────────────────────────
async function loadQuoteOfDay(forceRefresh) {
  const card    = document.getElementById('quoteCard');
  const loading = document.getElementById('quoteLoading');
  const textEl  = document.getElementById('quoteText');
  const metaEl  = document.getElementById('quoteMeta');
  if (!card) return;

  // Check cache (regenerate once per day or on force)
  if (!forceRefresh) {
    try {
      const cached = JSON.parse(localStorage.getItem(QUOTE_KEY) || 'null');
      if (cached && cached.date === TODAY) {
        showQuote(cached.text, cached.source, cached.liked);
        return;
      }
    } catch(e) {}
  }

  // Show loading state
  if (loading) loading.style.display = 'block';
  if (textEl)  textEl.style.display  = 'none';
  if (metaEl)  metaEl.style.display  = 'none';

  const blocked = JSON.parse(localStorage.getItem(QUOTE_BLOCKED_KEY) || '[]');
  let text = null, source = 'daily reminder', method = 'rag';

  // Build context for RAG
  const ragContext = buildRAGContext();

  // Try AI (Claude) first if key is set
  const aiText = await generateAIQuote(buildContext());
  if (aiText) {
    text   = aiText;
    source = 'generated for you today';
    method = 'ai';
  } else if (window.RAGEngine) {
    // Use RAG engine — semantic if USE model loaded, tag-based otherwise
    const result = await RAGEngine.getQuote(ragContext, blocked, true);
    text   = result.text;
    source = result.source;
    method = result.method;
  } else {
    // Ultimate fallback
    text   = getOfflineQuote(getDayState());
    source = 'daily reminder';
  }

  // Cache it
  localStorage.setItem(QUOTE_KEY, JSON.stringify({ date: TODAY, text, source, liked: false }));
  showQuote(text, source, false);
  announce('Daily message: ' + text);
}

function buildRAGContext() {
  const all    = [...CRITICAL, ...DAILY];
  const done   = all.filter(t => state.tasks[t.id]).length;
  return {
    mood:    state.mood.mood    || 'any',
    energy:  state.mood.energy  || 'any',
    flags:   state.symptoms.length,
    streak:  state.medStreak || 0,
    taskPct: all.length > 0 ? done / all.length : 0,
    notes:   state.notes || ''
  };
}

function showQuote(text, source, liked) {
  const loading = document.getElementById('quoteLoading');
  const textEl  = document.getElementById('quoteText');
  const metaEl  = document.getElementById('quoteMeta');
  const srcEl   = document.getElementById('quoteSource');
  const likeBtn = document.getElementById('quoteLikeBtn');
  if (loading) loading.style.display = 'none';
  if (textEl)  { textEl.textContent = text; textEl.style.display = 'block'; }
  if (srcEl)   srcEl.textContent = source;
  if (metaEl)  metaEl.style.display = 'flex';
  if (likeBtn) {
    likeBtn.classList.toggle('liked', !!liked);
    likeBtn.textContent = liked ? '♥' : '♡';
    likeBtn.setAttribute('aria-label', liked ? 'Quote saved to favourites' : 'Save quote to favourites');
  }
}

function refreshQuote() {
  loadQuoteOfDay(true);
  announce('Refreshing your daily message.');
}

function likeQuote() {
  try {
    const cached = JSON.parse(localStorage.getItem(QUOTE_KEY) || 'null');
    if (!cached) return;
    const wasLiked = cached.liked;
    cached.liked = !wasLiked;
    localStorage.setItem(QUOTE_KEY, JSON.stringify(cached));
    if (!wasLiked) saveFavQuote(cached.text);
    showQuote(cached.text, cached.source, cached.liked);
    announce(cached.liked ? 'Quote saved to favourites.' : 'Quote removed from favourites.');
  } catch(e) {}
}

// ── API key + quote prefs ─────────────────────────────────────────────────
function saveApiKey() {
  const key = document.getElementById('anthropicKey')?.value?.trim();
  if (!key) { apiKeyStatus('enter a key first', 'var(--danger)'); return; }
  if (!key.startsWith('sk-ant-')) { apiKeyStatus('key should start with sk-ant-', 'var(--warning)'); return; }
  sessionStorage.setItem(ANTHROPIC_KEY_K, key);
  apiKeyStatus('key saved ✓', 'var(--success)');
  announce('API key saved.');
}

function apiKeyStatus(msg, color) {
  const el = document.getElementById('apiKeyStatus');
  if (el) { el.textContent = msg; el.style.color = color; }
}

function saveQuotePrefs() {
  if (!cfg.notifPrefs) cfg.notifPrefs = {};
  cfg.notifPrefs.aiQuotesEnabled = document.getElementById('aiQuotesEnabled')?.checked !== false;
  saveConfig(cfg);
}

function syncQuoteSettingsUI() {
  const keyEl = document.getElementById('anthropicKey');
  if (keyEl) {
    const stored = sessionStorage.getItem(ANTHROPIC_KEY_K);
    if (stored) { keyEl.value = stored; apiKeyStatus('key saved ✓', 'var(--success)'); }
  }
  const toggleEl = document.getElementById('aiQuotesEnabled');
  if (toggleEl) toggleEl.checked = (cfg.notifPrefs || {}).aiQuotesEnabled !== false;
}

// ── Favourites ────────────────────────────────────────────────────────────
function getFavQuotes() {
  try { return JSON.parse(localStorage.getItem(QUOTE_FAVS_KEY) || '[]'); } catch(e) { return []; }
}

function saveFavQuote(text) {
  const favs = getFavQuotes();
  if (!favs.includes(text)) {
    favs.unshift(text);
    localStorage.setItem(QUOTE_FAVS_KEY, JSON.stringify(favs.slice(0, 50)));
  }
}

function removeFavQuote(idx) {
  const favs = getFavQuotes();
  favs.splice(idx, 1);
  localStorage.setItem(QUOTE_FAVS_KEY, JSON.stringify(favs));
  renderFavQuotes();
}

function blockQuote(text) {
  const blocked = JSON.parse(localStorage.getItem(QUOTE_BLOCKED_KEY) || '[]');
  if (!blocked.includes(text)) {
    blocked.push(text);
    localStorage.setItem(QUOTE_BLOCKED_KEY, JSON.stringify(blocked));
  }
}

function renderFavQuotes() {
  const section = document.getElementById('favQuotesSection');
  const el      = document.getElementById('favQuotesList');
  if (!el) return;
  const favs = getFavQuotes();
  if (section) section.style.display = favs.length > 0 ? 'block' : 'none';
  el.innerHTML = favs.length === 0 ? '' : favs.map((q, i) => `
    <div class="fav-quote" role="article" aria-label="Saved quote: ${q.replace(/"/g, '&quot;')}">
      ${q}
      <button class="fav-quote-remove" onclick="removeFavQuote(${i})"
              aria-label="Remove this quote from favourites">×</button>
    </div>
  `).join('');
}

// ── Post check-in message ─────────────────────────────────────────────────
async function showCheckinMessage() {
  const el     = document.getElementById('checkinMsg');
  const textEl = document.getElementById('checkinMsgText');
  const srcEl  = document.getElementById('checkinMsgSource');
  if (!el || !textEl) return;

  el.classList.add('visible');
  textEl.textContent = '...';

  const context = buildContext();
  let text = null, source = 'daily reminder';

  const aiText = await generateAIQuote(context + '. This message follows their check-in save, so acknowledge the act of checking in.');
  if (aiText) {
    text   = aiText;
    source = 'generated for you';
  } else {
    // Post-checkin specific offline messages
    const checkinQuotes = [
      "Check-in logged. That's the whole thing.",
      "Saved. That record exists now because you made it.",
      "Logged. Tomorrow's you has this data.",
      "Done. You showed up for yourself today.",
      "Check-in complete. One more data point in your favour.",
    ];
    text = checkinQuotes[Math.floor(Math.random() * checkinQuotes.length)];
  }

  textEl.textContent = text;
  if (srcEl) srcEl.textContent = source;
  announce('Check-in message: ' + text);

  // Store for like button
  el.dataset.msgText = text;
  setTimeout(() => el.classList.remove('visible'), 8000);
}

function likeCheckinMsg() {
  const el = document.getElementById('checkinMsg');
  const text = el?.dataset?.msgText;
  if (text) {
    saveFavQuote(text);
    announce('Message saved to favourites.');
    const btn = document.getElementById('checkinLikeBtn');
    if (btn) { btn.textContent = '♥ saved'; btn.classList.add('liked'); }
  }
}
