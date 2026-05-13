// ═══════════════════════════════════════════════════════════════════════════
// RAG ENGINE — Semantic + tag-based quote retrieval
// Daily Structure Tracker
//
// Exposes: window.RAGEngine.getQuote(context, blocked, allowSemantic)
//   context: { mood, energy, flags, streak, taskPct, notes }
//   blocked: string[] — quote texts to exclude
//   allowSemantic: boolean — allow USE model if loaded
//   returns: Promise<{ text, source, method }>
// ═══════════════════════════════════════════════════════════════════════════

window.RAGEngine = (() => {
  'use strict';

  let _model        = null;
  let _modelLoading = false;

  // ── Extended quote bank ─────────────────────────────────────────────────
  // tags drive fallback scoring when USE isn't loaded
  const QUOTES = [
    // struggling
    { text: "You showed up. That's the whole job today.",                              tags: ['struggling'], source: 'daily reminder' },
    { text: "A bad day with meds is still better than the alternative. You did that.", tags: ['struggling', 'meds'],    source: 'daily reminder' },
    { text: "Struggling and still trying are not opposites. You're doing both.",        tags: ['struggling'],            source: 'daily reminder' },
    { text: "Your brain is working against you right now. That's not a character flaw.", tags: ['struggling', 'high-flags'], source: 'daily reminder' },
    { text: "You don't have to feel okay to do okay. Evidence: you're here.",          tags: ['struggling'],            source: 'daily reminder' },
    { text: "Hard days are part of the deal. You're not failing, you're just in one.", tags: ['struggling'],            source: 'daily reminder' },
    { text: "Consistency isn't about feeling motivated. It's about showing up anyway. You did.", tags: ['struggling', 'low-tasks'], source: 'daily reminder' },
    { text: "The fact that you opened this app is a form of not giving up.",           tags: ['struggling', 'low-tasks'], source: 'daily reminder' },
    { text: "Low energy is not the same as low effort. You're expending more than you think.", tags: ['struggling', 'low-energy'], source: 'daily reminder' },
    { text: "Some days the win is just 'didn't make it worse.' That counts.",          tags: ['struggling'],            source: 'daily reminder' },
    { text: "You are allowed to have a hard day and still be someone who is trying.",  tags: ['struggling'],            source: 'daily reminder' },
    { text: "There is no version of this that requires you to feel good first.",        tags: ['struggling', 'dark-mood'], source: 'daily reminder' },
    { text: "Dark mood is a symptom, not a verdict.",                                  tags: ['struggling', 'dark-mood'], source: 'daily reminder' },
    { text: "Racing thoughts aren't instructions. They're noise. Keep going.",          tags: ['struggling', 'racing-energy'], source: 'daily reminder' },
    { text: "The crash isn't the end of the streak. The meds were still in your system.", tags: ['struggling', 'crashed-energy'], source: 'daily reminder' },

    // okay / maintenance
    { text: "Flat is fine. Flat is sustainable. Flat keeps you in the game.",          tags: ['okay'],                  source: 'daily reminder' },
    { text: "Ordinary days are the ones that build the streak. This is one of those.", tags: ['okay'],                  source: 'daily reminder' },
    { text: "You don't need to love the routine. You just need to do it. And you did.", tags: ['okay'],                 source: 'daily reminder' },
    { text: "Not every day has a lesson. Sometimes it's just another day done.",        tags: ['okay'],                  source: 'daily reminder' },
    { text: "Showing up in the middle is underrated. The middle is most of it.",        tags: ['okay'],                  source: 'daily reminder' },
    { text: "You're maintaining something. That's harder than it sounds.",              tags: ['okay'],                  source: 'daily reminder' },
    { text: "Good enough is a legitimate goal and you hit it today.",                   tags: ['okay'],                  source: 'daily reminder' },
    { text: "The boring repetition is the point. You're doing the actual work.",        tags: ['okay'],                  source: 'daily reminder' },
    { text: "Another day on the streak. That's real.",                                  tags: ['okay', 'meds'],          source: 'daily reminder' },
    { text: "Consistency is built in the unremarkable days. Today counts.",             tags: ['okay'],                  source: 'daily reminder' },

    // good
    { text: "This is what a good day looks like. Remember it for the other kind.",     tags: ['good'],                  source: 'daily reminder' },
    { text: "You built this. The streak, the habit, the capacity for a day like today.", tags: ['good', 'long-streak'],  source: 'daily reminder' },
    { text: "Notice this. Your brain on structure, working. This is the goal.",         tags: ['good'],                  source: 'daily reminder' },
    { text: "Good days aren't luck. They're downstream of the work you've been doing.", tags: ['good'],                  source: 'daily reminder' },
    { text: "You get to feel good about this. Actually let yourself.",                  tags: ['good'],                  source: 'daily reminder' },
    { text: "This is the payoff for all the low-energy days you still showed up through.", tags: ['good', 'long-streak'], source: 'daily reminder' },
    { text: "Today you made it look easy. That's because you've been doing the hard work.", tags: ['good'],              source: 'daily reminder' },
    { text: "This is evidence. When things are working, they work like this.",           tags: ['good'],                  source: 'daily reminder' },

    // milestone
    { text: "Streaks are just small decisions that compound. You've been making them.", tags: ['milestone'],             source: 'daily reminder' },
    { text: "The person who started this and the person reading this have different evidence.", tags: ['milestone'],     source: 'daily reminder' },
    { text: "You built something real here. Not a feeling — an actual record.",         tags: ['milestone'],             source: 'daily reminder' },
    { text: "This is what keeping promises to yourself looks like from the outside.",   tags: ['milestone'],             source: 'daily reminder' },
    { text: "You didn't just survive the hard days. You kept going through them.",      tags: ['milestone'],             source: 'daily reminder' },

    // generic
    { text: "The goal was never perfection. The goal was continuation.",                tags: ['generic'],               source: 'daily reminder' },
    { text: "Your nervous system is different. Your tools need to be too. These are yours.", tags: ['generic'],          source: 'daily reminder' },
    { text: "Structure isn't a cage. For some brains it's the thing that sets you free.", tags: ['generic'],             source: 'daily reminder' },
    { text: "You are not behind. You are exactly where your effort has put you.",       tags: ['generic'],               source: 'daily reminder' },
    { text: "It doesn't have to feel meaningful to be meaningful.",                     tags: ['generic'],               source: 'daily reminder' },
    { text: "The app doesn't care how you feel about using it. It just works when you do.", tags: ['generic'],           source: 'daily reminder' },
    { text: "Small consistent actions outperform large inconsistent ones. Always.",     tags: ['generic'],               source: 'daily reminder' },
    { text: "You get credit for doing the thing even when doing the thing is hard.",    tags: ['generic'],               source: 'daily reminder' },
    { text: "Tomorrow's version of you benefits from what you do right now.",           tags: ['generic'],               source: 'daily reminder' },
    { text: "There is no version of getting better that skips the boring middle part.", tags: ['generic'],               source: 'daily reminder' },

    // meds-specific
    { text: "Meds taken. That's the single highest-leverage thing on this list.",       tags: ['meds'],                  source: 'daily reminder' },
    { text: "The streak exists because you kept the daily promise. Keep it.",           tags: ['meds', 'long-streak'],   source: 'daily reminder' },
  ];

  // ── Context → state mapping ─────────────────────────────────────────────
  function contextToState(ctx) {
    const { flags, taskPct, streak } = ctx;
    if (typeof streak === 'number' && streak > 0 && streak % 7 === 0) return 'milestone';
    if (flags >= 3 || taskPct < 0.3) return 'struggling';
    if (taskPct >= 0.8 && flags === 0) return 'good';
    return 'okay';
  }

  // ── Context → secondary tags ────────────────────────────────────────────
  function contextTags(ctx) {
    const tags = [contextToState(ctx)];
    if (ctx.streak >= 14) tags.push('long-streak');
    if (ctx.flags >= 3)   tags.push('high-flags');
    if (ctx.energy === 'crashed')  tags.push('crashed-energy');
    if (ctx.energy === 'racing')   tags.push('racing-energy');
    if (ctx.energy === 'low')      tags.push('low-energy');
    if (ctx.taskPct < 0.4)         tags.push('low-tasks');
    if (ctx.mood === 'dark')        tags.push('dark-mood');
    return tags;
  }

  // ── Tag-based scoring ───────────────────────────────────────────────────
  function tagScore(quote, ctxTags) {
    let score = 0;
    for (const t of ctxTags) {
      if (quote.tags.includes(t)) score += (t === ctxTags[0]) ? 3 : 1;
    }
    return score;
  }

  function tagGetQuote(context, blocked) {
    const ctxTags  = contextTags(context);
    const available = QUOTES.filter(q => !blocked.includes(q.text));
    if (!available.length) {
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const pick = QUOTES[seed % QUOTES.length];
      return { text: pick.text, source: pick.source, method: 'tag' };
    }
    // Sort by score, date-seeded tiebreaker for stability within the day
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const scored = available
      .map((q, i) => ({ q, score: tagScore(q, ctxTags), idx: i }))
      .sort((a, b) => b.score - a.score || ((a.idx + seed) % available.length) - ((b.idx + seed) % available.length));

    const best = scored[0].q;
    return { text: best.text, source: best.source, method: 'tag' };
  }

  // ── Cosine similarity ────────────────────────────────────────────────────
  function cosineSim(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na  += a[i] * a[i];
      nb  += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }

  // ── Semantic search via Universal Sentence Encoder ─────────────────────
  async function semanticGetQuote(context, blocked) {
    const available = QUOTES.filter(q => !blocked.includes(q.text));
    if (!available.length) return tagGetQuote(context, blocked);

    const query = [
      `mood: ${context.mood}`,
      `energy: ${context.energy}`,
      `tasks: ${Math.round(context.taskPct * 100)}% done`,
      `symptoms flagged: ${context.flags}`,
      `medication streak: ${context.streak} days`,
    ].join(', ');

    const allTexts  = [query, ...available.map(q => q.text)];
    const tensor    = await _model.embed(allTexts);
    const data      = await tensor.array();
    tensor.dispose();

    const queryVec = data[0];
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < available.length; i++) {
      const score = cosineSim(queryVec, data[i + 1]);
      if (score > bestScore) { bestScore = score; best = available[i]; }
    }

    return { text: best.text, source: best.source, method: 'semantic' };
  }

  // ── USE model loader ─────────────────────────────────────────────────────
  async function loadModel() {
    if (_model || _modelLoading) return;
    _modelLoading = true;
    try {
      // window.use is the USE library loaded via CDN script tag
      if (window.use && typeof window.use.load === 'function') {
        _model = await window.use.load();
        console.log('[RAGEngine] Universal Sentence Encoder loaded ✓');
      }
    } catch (e) {
      console.warn('[RAGEngine] USE model failed to load — using tag-based fallback:', e.message);
    } finally {
      _modelLoading = false;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────
  async function getQuote(context, blocked = [], allowSemantic = true) {
    if (allowSemantic && _model) {
      try {
        return await semanticGetQuote(context, blocked);
      } catch (e) {
        console.warn('[RAGEngine] Semantic search failed, falling back to tag-based:', e.message);
      }
    }
    return tagGetQuote(context, blocked);
  }

  // Kick off model load after page is idle — non-blocking, best-effort
  if (document.readyState === 'complete') {
    setTimeout(loadModel, 2500);
  } else {
    window.addEventListener('load', () => setTimeout(loadModel, 2500));
  }

  return { getQuote, getQuoteSync: tagGetQuote };
})();
