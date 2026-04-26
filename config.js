// ═════════════════════════════════════════════════════════════════
// SYMPTOMS CONFIG — Daily Structure Tracker v5
// OWNS: SYMPTOM_CATEGORIES, category CRUD, migration from flat list
// Load order: 3rd (after config.js, before state.js)
// ═════════════════════════════════════════════════════════════════

const DEFAULT_SYMPTOM_CATEGORIES = [
  { id:'neurological', label:'neurological', cssVar:'--cat-neuro',
    symptoms:['dissociation','sensory overload','brain fog','intrusive thoughts'] },
  { id:'psychiatric',  label:'psychiatric',  cssVar:'--cat-psych',
    symptoms:['paranoia','impulsivity','rage','shutdown'] },
  { id:'physical',     label:'physical',     cssVar:'--cat-phys',
    symptoms:['insomnia','hypersomnia','appetite gone','appetite excessive'] },
  { id:'behavioural',  label:'behavioural',  cssVar:'--cat-behav',
    symptoms:["can't initiate"] },
];

function _initSymptomCategories() {
  if (cfg.symptomCategories && Array.isArray(cfg.symptomCategories))
    return JSON.parse(JSON.stringify(cfg.symptomCategories));

  // Migration: place existing flat symptoms into best-fit categories
  const cats  = JSON.parse(JSON.stringify(DEFAULT_SYMPTOM_CATEGORIES));
  const known = new Set(cats.flatMap(c => c.symptoms));
  const custom = (cfg.symptoms || []).filter(s => !known.has(s));
  if (custom.length > 0)
    cats.push({ id:'custom', label:'other', cssVar:'--cat-custom', symptoms:custom });
  return cats;
}

let SYMPTOM_CATEGORIES = _initSymptomCategories();

function getFlatSymptoms() {
  return SYMPTOM_CATEGORIES.flatMap(c => c.symptoms);
}

function saveSymptomCategories() {
  cfg.symptomCategories = SYMPTOM_CATEGORIES;
  cfg.symptoms = getFlatSymptoms();
  saveConfig(cfg);
}

// ── Category CRUD ─────────────────────────────────────────────────────────
function addSymptomToCategory(categoryId, symptomName) {
  const name = symptomName.trim().toLowerCase().slice(0, 40);
  if (!name) return false;
  if (getFlatSymptoms().includes(name)) return false;
  const cat = SYMPTOM_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return false;
  cat.symptoms.push(name);
  saveSymptomCategories();
  return true;
}

function removeSymptomFromCategory(categoryId, symptomName) {
  const cat = SYMPTOM_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return false;
  cat.symptoms = cat.symptoms.filter(s => s !== symptomName);
  saveSymptomCategories();
  return true;
}

function addCategory(label) {
  const id = 'cat_' + Date.now();
  SYMPTOM_CATEGORIES.push({ id, label:label.trim().toLowerCase().slice(0,30), cssVar:'--cat-custom', symptoms:[] });
  saveSymptomCategories();
  return id;
}

function removeCategory(categoryId) {
  const cat = SYMPTOM_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return;
  const other = SYMPTOM_CATEGORIES.find(c => c.id !== categoryId);
  if (other && cat.symptoms.length > 0) other.symptoms.push(...cat.symptoms);
  SYMPTOM_CATEGORIES = SYMPTOM_CATEGORIES.filter(c => c.id !== categoryId);
  saveSymptomCategories();
}

function reorderCategories(newOrder) {
  const map = Object.fromEntries(SYMPTOM_CATEGORIES.map(c => [c.id, c]));
  SYMPTOM_CATEGORIES = newOrder.map(id => map[id]).filter(Boolean);
  saveSymptomCategories();
}
