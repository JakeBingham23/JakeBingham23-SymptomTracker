// ═════════════════════════════════════════════════════════════════
// APP ENTRY POINT — Daily Structure Tracker v6.0
// Single <script type="module"> that imports all modules in
// dependency order and assigns public APIs to window for HTML
// onclick compatibility.
//
// Load order guaranteed by import graph — no more script tag order.
// ═════════════════════════════════════════════════════════════════

// ── Layer 0: no dependencies ──────────────────────────────────
import { Store }      from './storage.js';
import { SecureStore } from './crypto.js';

// ── Layer 1: config depends on storage ───────────────────────
import {
  cfg, saveConfig, CRITICAL, DAILY, SYMPTOMS, SYMPTOM_CATS,
  setFont, applyFont, applyA11yPreset, applyLineSpacing, applyLetterSpacing,
} from './config.js';

// ── Layer 2: symptoms config depends on config ────────────────
import './symptoms/config.js';

// ── Layer 3: state depends on config ─────────────────────────
import './state-obj.js';
import { loadState, saveState, saveHistoryEntry } from './state.js';

// ── Layer 4: core depends on state + config ───────────────────
import {
  TODAY, render, announce, escHtml, sanitiseInput,
  toggleTask, toggleSymptom, setMood, saveAll,
  setSymptomSeverity, isSymptomFlagged, getSymptomSeverity,
} from './core.js';

// ── Layer 5: symptoms render depends on core ──────────────────
import './symptoms/render.js';

// ── Layer 6: theme + gcal ─────────────────────────────────────
import {
  setTheme, applyTheme, toggleTheme, toggleLightDark,
  setTextSize, setHighContrast, toggleReduceMotion,
  setLargeTouchTargets, updateMenuThemeUI,
} from './theme.js';

import './gcal/auth.js';
import './gcal/sync.js';

// ── Layer 7: feature modules ──────────────────────────────────
import {
  renderSettingsPanel, addTask, saveName, saveSettings,
  addSymptomToCategory, removeSymptomFromCategory,
  addCategory, removeCategory, moveCategoryUp, moveCategoryDown,
  moveSymptomUp, moveSymptomDown, renderSymptomCatSettings,
} from './accessibility.js';

import { showToast, Toast } from './toast.js';
import { hap, playSuccess, playAlertSound, previewTone, setAudioTone, setVibPattern } from './audio.js';
import {
  exportBackup, importBackup, exportCSV, exportEncryptedBackup,
  doEncryptedExport, confirmPassphrase, cancelPassphrase, hideEncrypt,
} from './backup.js';

import {
  renderBudgetTab, openSpendModal, saveMonthlyBudget,
  filterSpendByBucket, getDopamineList,
} from './budget.js';

import {
  getDNDConfig, saveDND, toggleDNDDay, addDNDWindow, removeDNDWindow,
} from './dnd.js';

import './icons.js';

import {
  renderJournalList, newJournalEntry, saveJournalEntry,
  closeJournalComposer, deleteJournalEntry, editJournalEntry,
  filterJournalEntries, toggleVoiceInput,
} from './journal.js';

import { lockScreen } from './lockscreen.js';

import {
  openMenu, closeMenu, openMenuSubPage, closeMenuSubPage,
  syncMenuUI, renderSubpageTasks, saveName2,
  renderDopamineList, openDopamineModal,
} from './menu.js';

import {
  swNotify, swSchedule, scheduleTaskReminders,
  setTaskReminder, requestNotificationPermission,
} from './notifications.js';

import './pwa.js';

import {
  refreshQuote, likeQuote, likeCheckinMsg, showCheckinMessage,
  saveApiKey, connectTelegram, sendTelegramTest, setInterval_,
} from './quotes.js';

import {
  switchTab, loadAppts, saveAppts,
  openApptModal, saveAppt, closeApptModal,
  shareSummary, closeSummaryModal,
  dismissPrompt, completeOnboarding,
} from './render.js';

import {
  checkBadges, renderPointsDisplay, renderBadges,
  closeMilestone, getPoints, addPoints,
} from './rewards.js';

import {
  takePhoto, savePreviewImage, closePreview, changeSaveFolder,
} from './screenshot.js';

import { initApp } from './security.js';

import {
  startReminderTimer, renderTaskDeadlineSettings,
  setTaskDeadline, saveWindowTime, clearWindowTime,
  addCustomTimer, removeCustomTimer,
} from './timers.js';

import './a11y-sr.js';
import './checkin-render.js';

// ── Assign all public APIs to window ─────────────────────────
// Required for HTML onclick="fn()" to work without converting
// every event handler. This is the only place globals are set.
Object.assign(window, {
  // Core
  TODAY, render, announce, escHtml, sanitiseInput,
  toggleTask, toggleSymptom, setMood, saveAll,
  setSymptomSeverity, isSymptomFlagged, getSymptomSeverity,
  // Config
  cfg, saveConfig, CRITICAL, DAILY, SYMPTOMS, SYMPTOM_CATS,
  setFont, applyFont, applyA11yPreset, applyLineSpacing, applyLetterSpacing,
  // Storage
  Store, SecureStore,
  // State
  loadState, saveState,
  // Theme
  setTheme, applyTheme, toggleTheme, toggleLightDark,
  setTextSize, setHighContrast, toggleReduceMotion,
  setLargeTouchTargets, updateMenuThemeUI,
  // Accessibility / settings
  renderSettingsPanel, addTask, saveName, saveSettings,
  addSymptomToCategory, removeSymptomFromCategory,
  addCategory, removeCategory, moveCategoryUp, moveCategoryDown,
  moveSymptomUp, moveSymptomDown, renderSymptomCatSettings,
  // Toast
  showToast, Toast,
  // Audio
  hap, playSuccess, playAlertSound, previewTone, setAudioTone, setVibPattern,
  // Backup
  exportBackup, importBackup, exportCSV, exportEncryptedBackup,
  doEncryptedExport, confirmPassphrase, cancelPassphrase, hideEncrypt,
  // Budget
  renderBudgetTab, openSpendModal, saveMonthlyBudget,
  filterSpendByBucket, getDopamineList,
  // DND
  getDNDConfig, saveDND, toggleDNDDay, addDNDWindow, removeDNDWindow,
  // Journal
  renderJournalList, newJournalEntry, saveJournalEntry,
  closeJournalComposer, deleteJournalEntry, editJournalEntry,
  filterJournalEntries, toggleVoiceInput,
  // Lockscreen
  lockScreen,
  // Menu
  openMenu, closeMenu, openMenuSubPage, closeMenuSubPage,
  syncMenuUI, renderSubpageTasks, saveName2,
  renderDopamineList, openDopamineModal,
  // Notifications
  swNotify, swSchedule, scheduleTaskReminders,
  setTaskReminder, requestNotificationPermission,
  // Quotes
  refreshQuote, likeQuote, likeCheckinMsg, showCheckinMessage,
  saveApiKey, connectTelegram, sendTelegramTest, setInterval_,
  // Render / tabs
  switchTab, loadAppts, saveAppts,
  openApptModal, saveAppt, closeApptModal,
  shareSummary, closeSummaryModal,
  dismissPrompt, completeOnboarding,
  // Rewards
  checkBadges, renderPointsDisplay, renderBadges,
  closeMilestone, getPoints, addPoints,
  // Screenshot
  takePhoto, savePreviewImage, closePreview, changeSaveFolder,
  // Security
  initApp,
  // Timers
  startReminderTimer, renderTaskDeadlineSettings,
  setTaskDeadline, saveWindowTime, clearWindowTime,
  addCustomTimer, removeCustomTimer,
  // Gcal
  gcalConnect: window.gcalConnect,
  gcalDisconnect: window.gcalDisconnect,
  gcalSyncFull: window.gcalSyncFull,
  // Scat (symptom categories)
  scatAddCategory: addCategory,
  // Legacy aliases
  updateThemePill: updateMenuThemeUI,
});

console.log('[App] v6.0 modules loaded.');
