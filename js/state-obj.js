// ═══════════════════════════════════════════════════════════════
// STATE OBJECT — Daily Structure Tracker
// Owns: the state object and its key helpers only.
// No logic, no dependencies. Loaded by both state.js and core.js
// to break the circular dependency between them.
// ═══════════════════════════════════════════════════════════════
export const state = {
  tasks:    {},
  mood:     { energy: '', mood: '' },
  symptoms: [],
  notes:    '',
  medStreak: 0,
};

export function getKey(date) {
  return 'tracker-' + date;
}

export function getStreakKey() {
  return 'tracker-med-streak';
}
