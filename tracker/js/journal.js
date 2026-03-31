// ═════════════════════════════════════════════════════════════════
// JOURNAL MODULE — Daily Structure Tracker
// ═════════════════════════════════════════════════════════════════

// ── Journal system ────────────────────────────────────────────────────────

const JOURNAL_KEY  = 'tracker-journal';
const JOURNAL_DRAFT_KEY = 'tracker-journal-draft';

const JOURNAL_PROMPTS = [
  "What's actually on your mind right now?",
  "What made today harder than it needed to be?",
  "What's one thing your body did well today?",
  "If you could tell your care team one thing about this week, what would it be?",
  "What are you avoiding thinking about?",
  "What felt manageable today, even if nothing else did?",
  "What do you wish people understood about how your brain works?",
  "What's draining you right now that you haven't said out loud?",
  "What would a good day look like from here?",
  "What are you grateful for, even if everything else is hard?",
  "What's one small thing you did for yourself today?",
  "What's been looping in your head that you haven't written down yet?",
];

function getJournalEntries() {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveJournalEntries(entries) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

// ── Composer ──────────────────────────────────────────────────────────────
let _editingEntryId = null;
let _draftTimer = null;
let _voiceRecognition = null;

function newJournalEntry() {
  _editingEntryId = null;
  openJournalComposer('');
}

function openJournalComposer(text, entryId) {
  _editingEntryId = entryId || null;
  const composer = document.getElementById('journalComposer');
  const textarea = document.getElementById('journalTextarea');
  const dateEl   = document.getElementById('composerDate');
  const metaEl   = document.getElementById('composerMeta');
  const wordEl   = document.getElementById('journalWordCount');

  if (textarea)  textarea.value = text || '';
  if (wordEl)    wordEl.textContent = countWords(text || '') + ' words';
  if (dateEl)    dateEl.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  // Build meta from today's check-in
  const mood   = state.mood?.mood   || null;
  const energy = state.mood?.energy || null;
  const all    = [...CRITICAL, ...DAILY];
  const done   = all.filter(t => state.tasks[t.id]).length;
  const parts  = [];
  if (mood)   parts.push('mood: ' + mood);
  if (energy) parts.push('energy: ' + energy);
  parts.push(done + '/' + all.length + ' tasks');
  if (metaEl) metaEl.textContent = parts.join(' · ');

  // Show prompt if new entry and textarea empty
  if (!text) showWritingPrompt();
  else        hideWritingPrompt();

  if (composer) composer.style.display = 'block';
  setTimeout(() => { if (textarea) textarea.focus(); }, 100);
  announce('Journal composer opened. ' + (text ? 'Editing existing entry.' : 'New entry.'));
}

function closeJournalComposer() {
  const composer = document.getElementById('journalComposer');
  if (composer) composer.style.display = 'none';
  stopVoiceInput();
  localStorage.removeItem(JOURNAL_DRAFT_KEY);
  _editingEntryId = null;
}

function autoSaveDraft(text) {
  // Update word count
  const wordEl = document.getElementById('journalWordCount');
  if (wordEl) wordEl.textContent = countWords(text) + ' words';
  // Show/hide prompt
  if (text.trim().length > 0) hideWritingPrompt();
  // Autosave draft
  clearTimeout(_draftTimer);
  _draftTimer = setTimeout(() => {
    localStorage.setItem(JOURNAL_DRAFT_KEY, text);
  }, 1000);
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function saveJournalEntry() {
  const textarea = document.getElementById('journalTextarea');
  const text = sanitiseInput(textarea?.value || '', 10000);
  if (!text) { showToast('write something first'); return; }

  const entries = getJournalEntries();
  const entry = {
    id:     _editingEntryId || 'j_' + Date.now(),
    date:   TODAY,
    text,
    mood:   state.mood?.mood   || null,
    energy: state.mood?.energy || null,
    tasks:  { done: [...CRITICAL,...DAILY].filter(t => state.tasks[t.id]).length,
              total: [...CRITICAL,...DAILY].length },
    words:  countWords(text),
    created: _editingEntryId ? undefined : new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  if (_editingEntryId) {
    const idx = entries.findIndex(e => e.id === _editingEntryId);
    if (idx > -1) entries[idx] = { ...entries[idx], ...entry };
    else entries.unshift(entry);
  } else {
    entries.unshift(entry);
  }

  saveJournalEntries(entries);
  closeJournalComposer();
  renderJournalList();
  announce('Journal entry saved. ' + countWords(text) + ' words.');
  hap('task');
  playSuccess();
}

function deleteJournalEntry(id) {
  if (!confirm('Delete this journal entry?')) return;
  saveJournalEntries(getJournalEntries().filter(e => e.id !== id));
  renderJournalList();
  announce('Journal entry deleted.');
}

function editJournalEntry(id) {
  const entry = getJournalEntries().find(e => e.id === id);
  if (!entry) return;
  openJournalComposer(entry.text, id);
  document.getElementById('journalComposer')?.scrollIntoView({ behavior: 'smooth' });
}

// ── Writing prompts ────────────────────────────────────────────────────────
function showWritingPrompt() {
  const el    = document.getElementById('journalPrompt');
  const textEl = document.getElementById('journalPromptText');
  if (!el || !textEl) return;
  const prompt = JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)];
  textEl.textContent = prompt;
  el.classList.add('visible');
}

function hideWritingPrompt() {
  const el = document.getElementById('journalPrompt');
  if (el) el.classList.remove('visible');
}

function dismissPrompt() {
  const textarea = document.getElementById('journalTextarea');
  const promptEl = document.getElementById('journalPromptText');
  if (textarea && promptEl) {
    // Copy prompt text to textarea as a starting point
    if (!textarea.value.trim()) {
      textarea.value = promptEl.textContent + '\n\n';
      autoSaveDraft(textarea.value);
    }
    textarea.focus();
    // Put cursor at end
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }
  hideWritingPrompt();
}

// ── Voice input ────────────────────────────────────────────────────────────
function toggleVoiceInput() {
  if (_voiceRecognition) { stopVoiceInput(); return; }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('voice input not supported on this browser');
    announce('Voice input is not supported on this browser.');
    return;
  }

  const btn = document.getElementById('voiceBtn');
  _voiceRecognition = new SpeechRecognition();
  _voiceRecognition.continuous    = true;
  _voiceRecognition.interimResults = true;
  _voiceRecognition.lang           = 'en-US';

  let finalText = document.getElementById('journalTextarea')?.value || '';
  let interimText = '';

  _voiceRecognition.onstart = () => {
    if (btn) btn.classList.add('recording');
    if (btn) btn.textContent = '⏹';
    announce('Voice input started. Speak now.');
  };

  _voiceRecognition.onresult = (e) => {
    interimText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        finalText += e.results[i][0].transcript + ' ';
      } else {
        interimText += e.results[i][0].transcript;
      }
    }
    const textarea = document.getElementById('journalTextarea');
    if (textarea) {
      textarea.value = finalText + interimText;
      autoSaveDraft(textarea.value);
    }
  };

  _voiceRecognition.onerror = (e) => {
    stopVoiceInput();
    if (e.error !== 'aborted') showToast('voice error: ' + e.error);
  };

  _voiceRecognition.onend = () => stopVoiceInput();

  _voiceRecognition.start();
}

function stopVoiceInput() {
  if (_voiceRecognition) {
    _voiceRecognition.stop();
    _voiceRecognition = null;
  }
  const btn = document.getElementById('voiceBtn');
  if (btn) { btn.classList.remove('recording'); btn.textContent = '🎤'; }
  announce('Voice input stopped.');
}

// ── Render ────────────────────────────────────────────────────────────────
let _journalFilter = '';

function filterJournalEntries(query) {
  _journalFilter = query.toLowerCase().trim();
  renderJournalList();
}

function renderJournalList() {
  const el = document.getElementById('journalList');
  if (!el) return;

  let entries = getJournalEntries();

  if (_journalFilter) {
    entries = entries.filter(e =>
      e.text.toLowerCase().includes(_journalFilter) ||
      (e.mood    || '').toLowerCase().includes(_journalFilter) ||
      (e.energy  || '').toLowerCase().includes(_journalFilter) ||
      e.date.includes(_journalFilter)
    );
  }

  if (entries.length === 0) {
    el.innerHTML = `
      <div style="text-align:center;padding:3rem var(--sp-4)">
        <p style="font-family:var(--font-mono);font-size:var(--text-base);color:var(--text3);margin-bottom:var(--sp-3)">
          ${_journalFilter ? 'no entries match "' + escHtml(_journalFilter) + '"' : 'nothing written yet'}
        </p>
        ${!_journalFilter ? `<button class="add-btn" onclick="newJournalEntry()">write your first entry</button>` : ''}
      </div>`;
    return;
  }

  el.innerHTML = entries.map(entry => {
    const tags = [];
    if (entry.mood)   tags.push(entry.mood);
    if (entry.energy) tags.push(entry.energy);
    if (entry.tasks)  tags.push(entry.tasks.done + '/' + entry.tasks.total + ' tasks');

    const dateStr = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });

    // Highlight search term
    let preview = escHtml(entry.text);
    if (_journalFilter) {
      const regex = new RegExp('(' + _journalFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      preview = preview.replace(regex, '<mark style="background:var(--accent-dim);color:var(--accent)">$1</mark>');
    }

    return `
    <div class="journal-entry-card" role="listitem"
         aria-label="Journal entry from ${dateStr}, ${entry.words || 0} words">
      <div class="journal-entry-header">
        <span class="journal-entry-date">${dateStr}</span>
        <div class="journal-entry-tags" aria-hidden="true">
          ${tags.map(t => `<span class="journal-tag">${escHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="journal-entry-preview" id="preview_${entry.id}">${preview}</div>
      <div class="journal-entry-footer">
        <span class="journal-word-count">${entry.words || countWords(entry.text)} words</span>
        <div class="journal-entry-actions">
          <button class="journal-entry-btn" onclick="toggleEntryExpand('${entry.id}')"
                  aria-label="Expand or collapse entry">expand</button>
          <button class="journal-entry-btn" onclick="editJournalEntry('${entry.id}')"
                  aria-label="Edit this entry">edit</button>
          <button class="journal-entry-btn danger" onclick="deleteJournalEntry('${entry.id}')"
                  aria-label="Delete this entry">delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleEntryExpand(id) {
  const el = document.getElementById('preview_' + id);
  if (!el) return;
  const expanded = el.classList.toggle('expanded');
  const btn = el.closest('.journal-entry-card')?.querySelector('.journal-entry-btn');
  if (btn) btn.textContent = expanded ? 'collapse' : 'expand';
  announce(expanded ? 'Entry expanded.' : 'Entry collapsed.');
}

// ── Journal in pre-appointment summary ────────────────────────────────────
function getRecentJournalForSummary() {
  const entries = getJournalEntries();
  const last3   = entries.slice(0, 3);
  if (last3.length === 0) return '';
  return '\n\nrecent journal entries:\n' + last3.map(e => {
    const d = new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' });
    const preview = e.text.length > 200 ? e.text.slice(0, 200) + '...' : e.text;
    return `[${d}] ${preview}`;
  }).join('\n\n');
}
