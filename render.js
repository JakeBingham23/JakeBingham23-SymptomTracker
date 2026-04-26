// ═════════════════════════════════════════════════════════════════
// SYMPTOMS RENDER — Daily Structure Tracker v5
// OWNS: renderSymptomGrid(), renderSymptomSettings(), drag-reorder UI
// Load order: after core.js and symptoms/config.js
// ═════════════════════════════════════════════════════════════════

function renderSymptomGrid() {
  const container = document.getElementById('symptomCategories');
  if (!container) return;

  const activeSymptoms = (typeof state !== 'undefined' && state.symptoms) ? state.symptoms : [];
  const totalFlagged   = activeSymptoms.length;

  const summaryEl = document.getElementById('symptomFlagCount');
  if (summaryEl) {
    summaryEl.textContent = totalFlagged === 0 ? 'nothing flagged today'
      : totalFlagged === 1 ? '1 symptom flagged'
      : totalFlagged + ' symptoms flagged';
    summaryEl.className = 'symptom-flag-count' + (totalFlagged > 0 ? ' has-flags' : '');
  }

  container.innerHTML = SYMPTOM_CATEGORIES
    .filter(cat => cat.symptoms.length > 0)
    .map(cat => {
      const catFlagged = cat.symptoms.filter(s => activeSymptoms.includes(s)).length;
      const catId      = 'sym-cat-' + cat.id;
      return `
        <div class="sym-category" data-category="${escHtml(cat.id)}"
             role="group" aria-labelledby="${catId}">
          <div class="sym-category-header">
            <span class="sym-category-label" id="${catId}"
                  style="--cat-color:var(${cat.cssVar||'--cat-custom'})"
            >${escHtml(cat.label)}</span>
            ${catFlagged > 0
              ? `<span class="sym-category-count" aria-label="${catFlagged} flagged">${catFlagged}</span>`
              : ''}
          </div>
          <div class="sym-category-grid">
            ${cat.symptoms.map(s => {
              const active = activeSymptoms.includes(s);
              const safeS  = escHtml(s);
              const jsonS  = JSON.stringify(s);
              return `<button
                class="sym-btn${active ? ' active' : ''}"
                style="--cat-color:var(${cat.cssVar||'--cat-custom'})"
                role="checkbox" aria-checked="${active}"
                aria-label="flag symptom: ${safeS}"
                onclick="toggleSymptom(${jsonS})"
                onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSymptom(${jsonS})}"
              >${safeS}</button>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');
}

// ── Settings panel ────────────────────────────────────────────────────────
function renderSymptomSettings() {
  const container = document.getElementById('symptomSettingsCategories');
  if (!container) return;

  const CORE_IDS = new Set(['neurological','psychiatric','physical','behavioural']);

  container.innerHTML = SYMPTOM_CATEGORIES.map(cat => `
    <div class="scat-block" data-category="${escHtml(cat.id)}"
         draggable="true"
         ondragstart="scatDragStart(event,'${escHtml(cat.id)}')"
         ondragover="scatDragOver(event)"
         ondrop="scatDrop(event,'${escHtml(cat.id)}')">
      <div class="scat-header">
        <span class="scat-drag-handle" aria-hidden="true">⠿</span>
        <span class="scat-label">${escHtml(cat.label)}</span>
        ${!CORE_IDS.has(cat.id)
          ? `<button class="scat-del-btn"
               onclick="removeCategory('${escHtml(cat.id)}');renderSymptomSettings();renderSymptomGrid()"
               aria-label="remove ${escHtml(cat.label)} category">×</button>` : ''}
      </div>
      <div class="scat-chips">
        ${cat.symptoms.map(s => `
          <div class="sym-edit-chip">
            <span>${escHtml(s)}</span>
            <button onclick="removeSymptomFromCategory('${escHtml(cat.id)}',${JSON.stringify(s)});renderSymptomSettings();renderSymptomGrid()"
                    aria-label="remove ${escHtml(s)}">×</button>
          </div>`).join('')}
      </div>
      <div class="scat-add-row">
        <input type="text" id="scatInput-${escHtml(cat.id)}"
               placeholder="add symptom…" maxlength="40"
               aria-label="new symptom for ${escHtml(cat.label)}"
               onkeydown="if(event.key==='Enter'){event.preventDefault();scatAddSymptom('${escHtml(cat.id)}')}">
        <button class="add-btn" onclick="scatAddSymptom('${escHtml(cat.id)}')"
                aria-label="add to ${escHtml(cat.label)}">+</button>
      </div>
    </div>`).join('');

  const newCatEl = document.getElementById('newCategoryInput');
  if (newCatEl) newCatEl.value = '';
}

// ── Helpers ────────────────────────────────────────────────────────────────
function scatAddSymptom(categoryId) {
  const input = document.getElementById('scatInput-' + categoryId);
  if (!input) return;
  const success = addSymptomToCategory(categoryId, input.value);
  if (success) {
    input.value = '';
    renderSymptomSettings();
    renderSymptomGrid();
    if (typeof announce === 'function') announce('Symptom added.');
  } else {
    if (typeof showToast === 'function') showToast('symptom already exists or name is empty');
  }
}

function scatAddCategory() {
  const input = document.getElementById('newCategoryInput');
  if (!input || !input.value.trim()) return;
  addCategory(input.value);
  input.value = '';
  renderSymptomSettings();
  if (typeof announce === 'function') announce('Category added.');
}

// ── Drag-to-reorder ───────────────────────────────────────────────────────
let _scatDragId = null;

function scatDragStart(event, categoryId) {
  _scatDragId = categoryId;
  event.dataTransfer.effectAllowed = 'move';
}
function scatDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}
function scatDrop(event, targetCategoryId) {
  event.preventDefault();
  if (!_scatDragId || _scatDragId === targetCategoryId) return;
  const ids = SYMPTOM_CATEGORIES.map(c => c.id);
  const from = ids.indexOf(_scatDragId), to = ids.indexOf(targetCategoryId);
  if (from === -1 || to === -1) return;
  const newOrder = [...ids];
  newOrder.splice(from, 1);
  newOrder.splice(to, 0, _scatDragId);
  reorderCategories(newOrder);
  renderSymptomSettings();
  renderSymptomGrid();
  _scatDragId = null;
}
