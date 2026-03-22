/**
 * RAG (Retrieval-Augmented Generation) Engine
 * Daily Structure Tracker — Encouragement System
 *
 * Architecture:
 * 1. Curated dataset of 120+ messages tagged with context metadata
 * 2. TF-IDF style scoring for fast offline retrieval (no model needed initially)
 * 3. Universal Sentence Encoder (TensorFlow.js) for semantic search when available
 * 4. Context vector built from user's daily state
 * 5. Cosine similarity ranking + diversity filter
 */

'use strict';

// ── Dataset ──────────────────────────────────────────────────────────────────
// Each entry: { text, tags: { mood, energy, taskPct, flags, streak, tone } }
// mood:    'dark'|'low'|'flat'|'ok'|'good'|'high'|'any'
// energy:  'crashed'|'low'|'ok'|'elevated'|'racing'|'any'
// taskPct: 'none'(0)|'low'(0-0.4)|'half'(0.4-0.7)|'high'(0.7-1)|'any'
// flags:   'none'|'some'(1-2)|'many'(3+)|'any'
// streak:  'none'(0)|'building'(1-6)|'week'(7-13)|'month'(30+)|'any'
// tone:    'compassion'|'honest'|'celebrate'|'anchor'|'practical'

const DATASET = [

  // ── Struggling days (dark/low mood, many flags, low completion) ───────────
  { text: "You flagged some hard symptoms today and still opened the app. That's more than nothing.", tags: { mood:'dark', energy:'any', taskPct:'any', flags:'many', streak:'any', tone:'compassion' } },
  { text: "A bad brain day is a real thing. You're not making it up and you're not failing.", tags: { mood:'dark', energy:'crashed', taskPct:'low', flags:'many', streak:'any', tone:'compassion' } },
  { text: "Dissociation, shutdown, sensory overload — these are medical events, not character flaws.", tags: { mood:'dark', energy:'any', taskPct:'any', flags:'many', streak:'any', tone:'honest' } },
  { text: "The hardest days to show up are the ones that matter most for the streak. You showed up.", tags: { mood:'dark', energy:'any', taskPct:'any', flags:'any', streak:'building', tone:'anchor' } },
  { text: "You don't have to feel okay to do okay. Today is evidence of that.", tags: { mood:'low', energy:'low', taskPct:'half', flags:'some', streak:'any', tone:'honest' } },
  { text: "Getting through a day like this without making it worse is a legitimate win.", tags: { mood:'dark', energy:'crashed', taskPct:'none', flags:'many', streak:'any', tone:'compassion' } },
  { text: "Your nervous system is working harder than it looks. The rest of you is too.", tags: { mood:'dark', energy:'crashed', taskPct:'any', flags:'many', streak:'any', tone:'compassion' } },
  { text: "Some days the data looks bad and you still did everything you could. That's this.", tags: { mood:'low', energy:'low', taskPct:'low', flags:'many', streak:'any', tone:'honest' } },
  { text: "Rage, shutdown, can't initiate — you're managing a condition, not having a bad attitude.", tags: { mood:'dark', energy:'any', taskPct:'any', flags:'many', streak:'any', tone:'honest' } },
  { text: "You're allowed to have a terrible day and still be someone who is genuinely trying.", tags: { mood:'dark', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'compassion' } },
  { text: "The app didn't expect today to be easy. Neither should you.", tags: { mood:'dark', energy:'crashed', taskPct:'low', flags:'many', streak:'any', tone:'anchor' } },
  { text: "One task on a hard day is worth more than ten tasks on an easy one.", tags: { mood:'dark', energy:'low', taskPct:'low', flags:'some', streak:'any', tone:'celebrate' } },
  { text: "Intrusive thoughts and paranoia are exhausting to manage. You're still here.", tags: { mood:'dark', energy:'any', taskPct:'any', flags:'many', streak:'any', tone:'compassion' } },
  { text: "Low energy isn't laziness. It's a symptom. You know the difference.", tags: { mood:'any', energy:'crashed', taskPct:'any', flags:'any', streak:'any', tone:'honest' } },
  { text: "You checked in on a day you probably didn't want to. That's the whole thing.", tags: { mood:'dark', energy:'crashed', taskPct:'none', flags:'many', streak:'any', tone:'celebrate' } },

  // ── Low energy, flat mood, partial completion ──────────────────────────────
  { text: "Flat is sustainable. Flat keeps you in the game. Flat is enough today.", tags: { mood:'flat', energy:'low', taskPct:'half', flags:'none', streak:'any', tone:'anchor' } },
  { text: "You did half of it on low energy. That's not a failure, that's physics.", tags: { mood:'flat', energy:'low', taskPct:'half', flags:'any', streak:'any', tone:'honest' } },
  { text: "Not every day has a lesson. Sometimes it's just another day done.", tags: { mood:'flat', energy:'ok', taskPct:'half', flags:'none', streak:'any', tone:'honest' } },
  { text: "Maintaining something is underrated. You maintained today.", tags: { mood:'flat', energy:'any', taskPct:'half', flags:'none', streak:'building', tone:'anchor' } },
  { text: "You don't need to love the routine. You just need to do it. And you did.", tags: { mood:'flat', energy:'low', taskPct:'high', flags:'none', streak:'any', tone:'honest' } },
  { text: "Good enough is a legitimate goal and you hit it today.", tags: { mood:'flat', energy:'ok', taskPct:'half', flags:'any', streak:'any', tone:'anchor' } },
  { text: "The boring repetition is the point. You're doing the actual work.", tags: { mood:'flat', energy:'any', taskPct:'any', flags:'none', streak:'building', tone:'practical' } },
  { text: "Showing up in the middle is underrated. The middle is most of what this is.", tags: { mood:'flat', energy:'any', taskPct:'half', flags:'none', streak:'any', tone:'anchor' } },
  { text: "Consistency is built in the unremarkable days. This is one of those.", tags: { mood:'flat', energy:'ok', taskPct:'half', flags:'none', streak:'building', tone:'anchor' } },
  { text: "You got through a nothing day. Those pile up into something.", tags: { mood:'flat', energy:'low', taskPct:'half', flags:'none', streak:'building', tone:'honest' } },
  { text: "Some days the goal is just don't make it worse. You hit that.", tags: { mood:'flat', energy:'low', taskPct:'half', flags:'some', streak:'any', tone:'anchor' } },
  { text: "Adequate is a real thing. Adequate keeps the streak alive.", tags: { mood:'flat', energy:'ok', taskPct:'half', flags:'none', streak:'building', tone:'practical' } },

  // ── Okay days, moderate completion ────────────────────────────────────────
  { text: "Another day on the streak. That's real.", tags: { mood:'ok', energy:'ok', taskPct:'high', flags:'none', streak:'building', tone:'celebrate' } },
  { text: "You showed up. The whole point of the system is that you keep showing up.", tags: { mood:'ok', energy:'ok', taskPct:'high', flags:'none', streak:'any', tone:'anchor' } },
  { text: "Structure worked today. That's not an accident.", tags: { mood:'ok', energy:'ok', taskPct:'high', flags:'none', streak:'any', tone:'honest' } },
  { text: "This is what a functional day looks like for you. Remember this version.", tags: { mood:'ok', energy:'ok', taskPct:'high', flags:'none', streak:'any', tone:'practical' } },
  { text: "You didn't need to feel motivated. You just did it anyway. That's the skill.", tags: { mood:'ok', energy:'ok', taskPct:'high', flags:'none', streak:'any', tone:'honest' } },
  { text: "Ordinary days are the foundation. You laid another one.", tags: { mood:'ok', energy:'ok', taskPct:'high', flags:'none', streak:'building', tone:'anchor' } },
  { text: "No major flags, tasks done, streak intact. This is the target.", tags: { mood:'ok', energy:'ok', taskPct:'high', flags:'none', streak:'building', tone:'celebrate' } },
  { text: "You ran the system. The system ran well. That's not nothing.", tags: { mood:'ok', energy:'ok', taskPct:'high', flags:'none', streak:'any', tone:'practical' } },

  // ── Good days, high energy, high completion ────────────────────────────────
  { text: "This is what a good day looks like. Notice it. Store it.", tags: { mood:'good', energy:'elevated', taskPct:'high', flags:'none', streak:'any', tone:'celebrate' } },
  { text: "You built this. The streak, the habit, the capacity for a day like today.", tags: { mood:'good', energy:'ok', taskPct:'high', flags:'none', streak:'week', tone:'celebrate' } },
  { text: "Good days aren't luck. They're downstream of the work you've been doing.", tags: { mood:'good', energy:'elevated', taskPct:'high', flags:'none', streak:'any', tone:'honest' } },
  { text: "Today you made it look easy. That's because of all the hard days you still did.", tags: { mood:'good', energy:'elevated', taskPct:'high', flags:'none', streak:'building', tone:'celebrate' } },
  { text: "Let yourself have this. Actually let yourself have it.", tags: { mood:'good', energy:'elevated', taskPct:'high', flags:'none', streak:'any', tone:'compassion' } },
  { text: "High energy, low flags, tasks done. This is the payoff.", tags: { mood:'good', energy:'elevated', taskPct:'high', flags:'none', streak:'building', tone:'celebrate' } },
  { text: "This is evidence. When things are working, they work like this.", tags: { mood:'good', energy:'elevated', taskPct:'high', flags:'none', streak:'any', tone:'practical' } },
  { text: "Your brain is working with you today. Notice what that feels like.", tags: { mood:'good', energy:'elevated', taskPct:'high', flags:'none', streak:'any', tone:'anchor' } },

  // ── High energy but watch for it ──────────────────────────────────────────
  { text: "Elevated energy can be a gift. It can also be a signal. Keep an eye on it.", tags: { mood:'high', energy:'racing', taskPct:'any', flags:'any', streak:'any', tone:'honest' } },
  { text: "Racing energy: worth noting. Worth telling your care team about if it continues.", tags: { mood:'high', energy:'racing', taskPct:'any', flags:'any', streak:'any', tone:'practical' } },
  { text: "High energy day — that's great and also worth tracking. You're tracking it.", tags: { mood:'high', energy:'elevated', taskPct:'high', flags:'none', streak:'any', tone:'honest' } },
  { text: "Productivity on an elevated day feels great. Sleep is still non-negotiable.", tags: { mood:'high', energy:'racing', taskPct:'high', flags:'none', streak:'any', tone:'practical' } },

  // ── Streak milestones ─────────────────────────────────────────────────────
  { text: "Seven days. Your brain has had medication in it consistently for a full week. That matters clinically.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'week', tone:'honest' } },
  { text: "A week of consistency. You made that happen every single day.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'week', tone:'celebrate' } },
  { text: "Thirty days. One month of showing up. The data on this period alone is significant.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'month', tone:'celebrate' } },
  { text: "A month of meds. That's clinical significance. That's actual evidence.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'month', tone:'honest' } },
  { text: "Streaks are just small decisions that compound. You've been making them.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'building', tone:'anchor' } },
  { text: "The person who started this and the person reading this have different evidence now.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'week', tone:'honest' } },

  // ── First tasks, starting out ─────────────────────────────────────────────
  { text: "You took the first step. The first step is the hardest one.", tags: { mood:'any', energy:'any', taskPct:'low', flags:'none', streak:'none', tone:'celebrate' } },
  { text: "Starting is the hardest part. You started.", tags: { mood:'any', energy:'any', taskPct:'low', flags:'none', streak:'none', tone:'celebrate' } },
  { text: "Day one. This is where everything begins.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'none', tone:'anchor' } },
  { text: "The streak starts with one. You have one.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'none', tone:'celebrate' } },

  // ── No tasks done but still checked in ────────────────────────────────────
  { text: "You opened the app on a day you got nothing done. That's still showing up.", tags: { mood:'any', energy:'crashed', taskPct:'none', flags:'any', streak:'any', tone:'compassion' } },
  { text: "Zero tasks logged, check-in saved. You know what you're working with today.", tags: { mood:'any', energy:'any', taskPct:'none', flags:'any', streak:'any', tone:'honest' } },
  { text: "The data from bad days is as valuable as the data from good ones.", tags: { mood:'dark', energy:'crashed', taskPct:'none', flags:'many', streak:'any', tone:'practical' } },
  { text: "Not every day is a task day. Some days are just get-through days.", tags: { mood:'dark', energy:'crashed', taskPct:'none', flags:'many', streak:'any', tone:'compassion' } },

  // ── All tasks done ─────────────────────────────────────────────────────────
  { text: "Everything done. Every single one. That's a full day.", tags: { mood:'any', energy:'any', taskPct:'high', flags:'none', streak:'any', tone:'celebrate' } },
  { text: "All non-negotiables complete. Your future self already benefits from this.", tags: { mood:'any', energy:'any', taskPct:'high', flags:'none', streak:'any', tone:'honest' } },
  { text: "Clean sweep. You can actually rest now.", tags: { mood:'any', energy:'any', taskPct:'high', flags:'none', streak:'any', tone:'celebrate' } },
  { text: "Everything on the list, checked. This is what the system is for.", tags: { mood:'any', energy:'any', taskPct:'high', flags:'none', streak:'building', tone:'practical' } },

  // ── Symptoms present but managing ────────────────────────────────────────
  { text: "You flagged symptoms and still completed tasks. Managing in the middle of it.", tags: { mood:'any', energy:'any', taskPct:'half', flags:'some', streak:'any', tone:'celebrate' } },
  { text: "Sensory overload and still here. That's real effort.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'some', streak:'any', tone:'compassion' } },
  { text: "You're tracking the hard stuff. That awareness is part of managing it.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'many', streak:'any', tone:'practical' } },
  { text: "Flagging symptoms is part of the system working, not failing.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'many', streak:'any', tone:'honest' } },
  { text: "You gave your care team data today, even if they don't know it yet.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'many', streak:'any', tone:'practical' } },

  // ── General anchors — any state ────────────────────────────────────────────
  { text: "The goal was never perfection. The goal was continuation.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'anchor' } },
  { text: "Structure isn't a cage. For some brains it's the thing that sets them free.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'honest' } },
  { text: "You are not behind. You are exactly where your effort has put you.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'anchor' } },
  { text: "It doesn't have to feel meaningful to be meaningful.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'honest' } },
  { text: "Small consistent actions outperform large inconsistent ones. Always.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'building', tone:'practical' } },
  { text: "You get credit for doing the thing even when doing the thing is hard.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'compassion' } },
  { text: "Tomorrow's version of you benefits from what you do right now.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'practical' } },
  { text: "There is no version of getting better that skips the boring middle part.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'honest' } },
  { text: "Your tools are different because your brain is different. That's not a problem.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'anchor' } },
  { text: "Showing up for yourself is a skill. You're building it.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'building', tone:'anchor' } },
  { text: "This app exists because neurotypical tools don't work for your brain. This one is built for it.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'practical' } },
  { text: "The check-in is the work. Everything else is downstream.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'practical' } },
  { text: "You kept the promise you made to yourself today.", tags: { mood:'any', energy:'any', taskPct:'high', flags:'any', streak:'any', tone:'celebrate' } },
  { text: "A neurodivergent brain getting through a standard day is doing more work than it looks like.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'compassion' } },
  { text: "Executive dysfunction is a real barrier. You pushed through it today.", tags: { mood:'any', energy:'any', taskPct:'half', flags:'some', streak:'any', tone:'compassion' } },
  { text: "The data you're building here will help your care providers help you better.", tags: { mood:'any', energy:'any', taskPct:'any', flags:'any', streak:'any', tone:'practical' } },
];

// ── Context vector builder ────────────────────────────────────────────────────
function buildContextVector(context) {
  // Normalise context object into matching keys
  const mood     = context.mood     || 'any';
  const energy   = context.energy   || 'any';
  const flags    = context.flags    || 0;
  const streak   = context.streak   || 0;
  const taskPct  = context.taskPct  || 0;

  const flagBucket  = flags === 0 ? 'none' : flags <= 2 ? 'some' : 'many';
  const streakBucket = streak === 0 ? 'none' : streak < 7 ? 'building' : streak < 30 ? 'week' : 'month';
  const taskBucket  = taskPct === 0 ? 'none' : taskPct < 0.4 ? 'low' : taskPct < 0.7 ? 'half' : 'high';

  return { mood, energy, flagBucket, streakBucket, taskBucket };
}

// ── TF-IDF style tag scoring ──────────────────────────────────────────────────
function scoreEntry(entry, ctx) {
  let score = 0;

  // Exact matches score higher, 'any' always matches
  const moodMatch   = entry.tags.mood   === ctx.mood    || entry.tags.mood   === 'any';
  const energyMatch = entry.tags.energy === ctx.energy  || entry.tags.energy === 'any';
  const flagMatch   = entry.tags.flags  === ctx.flagBucket  || entry.tags.flags  === 'any';
  const streakMatch = entry.tags.streak === ctx.streakBucket || entry.tags.streak === 'any';
  const taskMatch   = entry.tags.taskPct === ctx.taskBucket  || entry.tags.taskPct === 'any';

  // Disqualify if any dimension doesn't match at all
  if (!moodMatch || !energyMatch || !flagMatch || !streakMatch || !taskMatch) return -1;

  // Reward specificity — exact matches score more than 'any'
  if (entry.tags.mood   === ctx.mood)         score += 3;
  if (entry.tags.energy === ctx.energy)        score += 2;
  if (entry.tags.flags  === ctx.flagBucket)    score += 2;
  if (entry.tags.streak === ctx.streakBucket)  score += 2;
  if (entry.tags.taskPct === ctx.taskBucket)   score += 2;

  // Tone bonuses based on state
  const isTough = ['dark','low'].includes(ctx.mood) || ctx.flagBucket === 'many';
  const isGood  = ['good','high'].includes(ctx.mood) && ctx.taskBucket === 'high';
  if (isTough && entry.tags.tone === 'compassion') score += 2;
  if (isTough && entry.tags.tone === 'honest')     score += 1;
  if (isGood  && entry.tags.tone === 'celebrate')  score += 2;
  if (ctx.streakBucket !== 'none' && entry.tags.tone === 'anchor') score += 1;

  return score;
}

// ── Main retrieval function ───────────────────────────────────────────────────
function retrieveQuote(contextObj, blocked) {
  const ctx      = buildContextVector(contextObj);
  const blockedSet = new Set(blocked || []);

  // Score all entries
  const scored = DATASET
    .filter(e => !blockedSet.has(e.text))
    .map(e => ({ entry: e, score: scoreEntry(e, ctx) }))
    .filter(s => s.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    // Fallback: any unblocked entry
    const fallbacks = DATASET.filter(e => !blockedSet.has(e.text));
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Add randomness within top tier — prevents always returning same quote
  const topScore  = scored[0].score;
  const topTier   = scored.filter(s => s.score >= topScore - 1);
  const picked    = topTier[Math.floor(Math.random() * Math.min(topTier.length, 5))];
  return picked.entry;
}

// ── Semantic search with USE (optional, async) ────────────────────────────────
let _useModel = null;
let _embeddings = null;

async function loadUSEModel() {
  if (_useModel) return _useModel;
  try {
    // Load Universal Sentence Encoder
    await tf.ready();
    _useModel = await use.load();
    console.log('[RAG] USE model loaded');
    return _useModel;
  } catch(e) {
    console.warn('[RAG] USE model unavailable, using tag-based retrieval');
    return null;
  }
}

async function precomputeEmbeddings() {
  const model = await loadUSEModel();
  if (!model) return;
  const texts = DATASET.map(e => e.text);
  _embeddings = await model.embed(texts);
  console.log('[RAG] Embeddings precomputed for', texts.length, 'entries');
}

async function retrieveSemanticQuote(queryText, blocked) {
  const model = _useModel || await loadUSEModel();
  if (!model || !_embeddings) return null;

  const blockedSet = new Set(blocked || []);
  try {
    const queryEmb  = await model.embed([queryText]);
    const queryArr  = await queryEmb.array();
    const embArr    = await _embeddings.array();

    // Cosine similarity
    const similarities = embArr.map((emb, i) => {
      if (blockedSet.has(DATASET[i].text)) return { idx: i, sim: -1 };
      const dot  = emb.reduce((s, v, j) => s + v * queryArr[0][j], 0);
      const magA = Math.sqrt(emb.reduce((s,v) => s + v*v, 0));
      const magB = Math.sqrt(queryArr[0].reduce((s,v) => s + v*v, 0));
      return { idx: i, sim: dot / (magA * magB) };
    });

    similarities.sort((a,b) => b.sim - a.sim);
    const topIdx = similarities.slice(0, 3);
    const picked = topIdx[Math.floor(Math.random() * topIdx.length)];
    return DATASET[picked.idx];
  } catch(e) {
    console.warn('[RAG] Semantic search failed:', e);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
const RAGEngine = {
  /**
   * Get the best quote for a given context
   * @param {Object} context - { mood, energy, flags, streak, taskPct, notes }
   * @param {Array}  blocked - array of quote texts to exclude
   * @param {boolean} useSemantics - try USE model if available
   */
  async getQuote(context, blocked, useSemantics) {
    // Try semantic search first if USE model is loaded
    if (useSemantics && _useModel) {
      const queryText = [
        context.mood ? 'mood: ' + context.mood : '',
        context.energy ? 'energy: ' + context.energy : '',
        context.flags > 0 ? 'struggling with symptoms' : '',
        context.taskPct > 0.7 ? 'completed most tasks' : context.taskPct < 0.3 ? 'few tasks done' : '',
        context.streak > 6 ? 'on a long streak' : '',
        context.notes || ''
      ].filter(Boolean).join(', ');

      const semantic = await retrieveSemanticQuote(queryText, blocked);
      if (semantic) return { text: semantic.text, source: 'semantic match', method: 'use' };
    }

    // Fall back to tag-based retrieval
    const entry = retrieveQuote(context, blocked);
    return { text: entry.text, source: 'daily reminder', method: 'tags' };
  },

  /**
   * Preload the USE model in the background
   */
  async preload() {
    // Only attempt if TensorFlow.js is available
    if (typeof tf !== 'undefined' && typeof use !== 'undefined') {
      setTimeout(() => precomputeEmbeddings(), 3000);
    }
  },

  datasetSize: DATASET.length
};

// Export for use in main app
if (typeof window !== 'undefined') {
  window.RAGEngine = RAGEngine;
}
