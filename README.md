Daily Structure Tracker
A persistent daily task and symptom tracker designed specifically for AuDHD (Autism + ADHD) task management and bipolar symptom monitoring.
Current version: v2.9
What it does
Tracks daily non-negotiables (meds, shower, meals) with a persistent nag banner until completed
Logs mood, energy level, and symptom flags for pattern recognition over time
Maintains a medication streak counter across days
Stores 14 days of history locally — no server, no account, no data leaving your device
Appointment tracking with countdown timers and pre-appointment symptom summaries
Configurable reminders with browser notifications, Telegram bot, haptic vibration, and audio alerts
Screenshot capture with gallery save for sharing symptom records with care providers
Full accessibility — VoiceOver (iOS), TalkBack (Android), keyboard navigation, high contrast mode
Navigation
Four-tab sticky top nav bar:
Today — non-negotiables, daily structure tasks, symptom check-in
History — upcoming appointments with countdown + check-in log
Stats — med streak, days logged, avg task completion, mood timeline
Settings — full configuration, segmented by category
A theme toggle (auto/light/dark) lives in the nav bar at all times.
Settings — segmented layout
Profile
Display name (used in nag banner and notifications)
Appearance: system / light / dark theme
Tasks & Symptoms
Add, edit, remove non-negotiable tasks (with subtitles)
Add, edit, remove daily structure tasks
Add, remove symptom flags
Task Reminders
Browser notification toggle
Telegram reminder toggle
Vibration pattern: gentle / firm / urgent
Sound: off / chime / beep / alarm / custom upload
Volume control per notification type
Reminder interval: 15 min / 30 min / 1 hr / 2 hr
Per-task deadlines with countdown rings
Timers & Check-in Window
Timer completion alert toggle
Window closing alert toggle
Vibration pattern picker
Sound picker with custom upload
Volume control
Daily check-in window closing time
Custom countdown timers (name + duration)
Appointment Notifications
Browser notification toggle
Telegram reminder toggle
Vibration pattern picker
Sound picker with custom upload
Volume control
Telegram Setup
Step-by-step bot connection via @BotFather
Auto-detects chat ID from getUpdates
Test message button
Data & Storage
Set dedicated screenshot save folder (Chrome/Edge — persisted via IndexedDB)
Export check-in history as CSV
Appointments
Add appointments with title, date/time, location, notes
24hr and 1hr browser + Telegram reminders (independently toggleable)
Countdown shown on History tab ("in 2 days", "tomorrow at 10:00 AM")
Next appointment banner on History tab
Pre-appointment summary — auto-generates a formatted report from the last 7 days of mood, energy, task completion, and symptom flags — shareable directly with care providers
Timers
Per-task countdown rings — circular SVG progress ring around each task's checkbox, draining as the deadline approaches. Turns amber under 30 minutes, red when overdue.
Daily check-in window — configurable closing time shown in the header with countdown.
Custom timers — freeform countdowns shown as widgets on the Today tab. Start, reset, delete per timer.
All timers update live every second.
Notifications
Three independent notification channels, each separately configurable:
Channel
Task reminders
Timer/window
Appointments
Browser (SW)
✓
✓
✓
Telegram bot
✓
✓
✓
Vibration
gentle/firm/urgent
gentle/firm/urgent
gentle/firm/urgent
Sound
off/chime/beep/alarm/custom
off/chime/beep/alarm/custom
off/chime/beep/alarm/custom
Aggressive nag pattern — when a task reminder fires it sends three escalating notifications: immediately, at 30 seconds, and at 90 seconds with escalating language. Requires HTTPS for background delivery.
Custom audio — upload any MP3/WAV/OGG file per notification type. Stored in IndexedDB. Preview button available. Volume controllable per type.
Built-in tones (Web Audio API, no files needed):
chime — ascending four-note tone (C E G C)
beep — two short sharp beeps
alarm — three descending sawtooth pulses
APK stage: audio will be upgraded to Android's native RingtoneManager with full system ringtone access.
Screenshot / gallery save
Captures the symptom check-in block as a PNG at 2x resolution
Shows a preview before saving
Chrome/Edge Android — saves to a user-selected folder (persisted via IndexedDB File System Access API). Auto-creates a SymptomTracker subfolder.
iOS Safari — Web Share API → Save to Photos
DuckDuckGo browser — in-page full-screen overlay with long-press to save (no popup APIs available in DDG)
Fallback — downloads to Downloads folder (auto-indexed into Android Gallery)
Haptic feedback synced to save completion, not tap
Accessibility
Fully compatible with VoiceOver (iOS) and TalkBack (Android).
Skip to main content link for keyboard/screen reader users
ARIA live regions — role="status" (polite) and role="alert" (assertive) announce all state changes without moving focus. iOS VoiceOver timing handled correctly.
aria-pressed / aria-checked on all toggles, tasks, mood buttons, symptom flags
aria-describedby links task subtitles and timer countdowns to their parent task
Heading hierarchy — h1 per page, h2 for segments, h3 for subsections. Screen reader users can navigate by heading within Settings.
Focus management — modals move focus to first input on open, return focus to trigger on close
Escape key closes any open modal
Keyboard navigation — Enter/Space toggle tasks; all interactive elements reachable by Tab
44px minimum tap targets on all interactive elements
High contrast mode — full alternative colour palette via prefers-contrast: more
aria-hidden on all decorative icons
Screen reader announcements for: task checked/unchecked, streak updates, mood/energy set, symptoms flagged, check-in saved, tab navigation, toast messages, sound selection, save folder confirmation
Design decisions
Why browser-based
Runs on any device with a browser. No app install, no account, no permissions beyond local storage and optional notifications. Deployable as a PWA via GitHub Pages.
Why localStorage / IndexedDB
Privacy-first. All data stays on device. No telemetry, no backend, no third-party access to health data. IndexedDB used for binary data (folder handles, audio files). Trade-off is no cross-device sync — deliberate given the sensitivity of symptom and medication data.
AuDHD-specific UX
Persistent nag banner — cannot be dismissed; goes away only when the task is done
Triple-nag notification pattern — three escalating alerts 0/30/90 seconds apart
Minimal colour — two accents maximum; colour encodes meaning not decoration
Low-friction symptom logging — single tap to flag, no forms or dropdowns
Streak counter — medication adherence streak is the single most motivating metric for many ADHD brains
No ads, no subscription — health data should not be monetised through attention
Tech stack
Vanilla HTML/CSS/JS — zero build step, zero framework
html2canvas (CDN) for symptom record capture
Web Audio API for built-in alert tones
IndexedDB for persistent binary storage (folder handles, audio files)
localStorage for daily state and config
Web Share API (iOS gallery save)
File System Access API (Android/desktop folder save)
Web Notifications API + Service Worker (background notifications)
Vibration API (haptic feedback)
PWA manifest (blob URL injection) + offline service worker cache
Hosting & installation
Requires HTTPS for service worker, Web Share API, and background notifications.
GitHub Pages
Create a free account at github.com
New repo → public → upload index.html
Settings → Pages → Deploy from branch → main / root → Save
Live at https://yourusername.github.io/reponame
Android install
Open the GitHub Pages URL in Chrome
Tap browser menu → Add to Home Screen
Launches fullscreen, works offline after first load
iOS install
Open in Safari → Share → Add to Home Screen
Roadmap
[ ] PWABuilder TWA → Google Play Store APK
[ ] Android native ringtone access via RingtoneManager (APK stage)
[ ] Proper Web Push (independent of browser tab)
[ ] Cross-device sync via optional self-hosted backend
[ ] Privacy policy (required for Play Store)
[ ] Configurable onboarding for new users
Context
Built as a practical personal tool, developed into a portfolio and commercial piece. The design problem is real: standard task managers assume neurotypical executive function. This one doesn't.
Play Store target: one-time purchase, no ads, no subscription. Health and symptom data should not be monetised through attention.
Built with HTML/CSS/JS. No frameworks. No dependencies. Just a file that works.
---

## Navigation

The app uses a sticky top nav bar with four tabs:

- **Today** — non-negotiables, daily structure tasks, and the symptom check-in
- **History** — last 14 saved check-ins with mood, energy, tasks done, and flags
- **Stats** — med streak, days logged, average task completion %, average flags, and a mood timeline
- **Settings** — name, appearance (light/dark/system), task lists, and symptom flags

A **theme toggle** (auto/light/dark) lives in the nav bar at all times for one-tap accessibility.

---

## Design decisions

### Why browser-based

Runs on any device with a browser. No app install, no account creation, no permissions beyond local storage and optional notifications. Works on Android, desktop, or tablet without modification. Deployable as a PWA via GitHub Pages + "Add to Home Screen".

### Why localStorage

Privacy-first. All data stays on device. No telemetry, no backend, no third party access to health data. Trade-off is no cross-device sync — a deliberate choice given the sensitivity of symptom and medication data.

### AuDHD-specific UX choices

- **Nag banner is persistent and cannot be dismissed** — it goes away only when the task is done. Standard dismissible notifications get ignored within days by ADHD brains.
- **Critical tasks are visually separated** from daily structure tasks — the non-negotiables have a left accent border and appear first.
- **Monospace font throughout** — reduces visual noise and creates consistent rhythm that is easier to parse for some neurodivergent users.
- **Minimal colour** — two accent colours maximum. Colour encodes meaning (danger = missed critical tasks, amber = active selections), not decoration.
- **Symptom logging is low-friction** — single tap to flag, no forms, no dropdowns. The goal is actually using it, not perfect data entry.
- **Gallery save with preview** — the symptom record button renders the check-in block to a PNG, shows a preview to confirm it looks right, then saves directly to the device gallery via the Web Share API (mobile) or File System Access API (desktop).

### Streak counter

Medication adherence streak is the single most motivating metric for many ADHD brains. Visible on the Today stats row and the Stats tab. Resets correctly if meds are unchecked.

### Accessibility

- Full ARIA roles and labels on nav (`role="navigation"`, `role="tab"`, `aria-selected`, `aria-controls`, `aria-hidden`)
- Decorative icons marked `aria-hidden="true"` so screen readers skip them
- Theme toggle `aria-label` updates dynamically to announce current state
- Visible focus rings on all interactive elements for keyboard navigation
- Light/dark/system theme options with one-tap toggle always visible in the nav bar

---

## Tech stack

- Vanilla HTML/CSS/JS — zero build step, zero framework dependencies
- [html2canvas](https://html2canvas.hertzen.com/) (CDN) for symptom record image capture
- localStorage for persistence
- Web Share API for gallery save on mobile (requires HTTPS)
- File System Access API for gallery/Pictures save on desktop
- Web Notifications API for background reminders (optional)
- PWA manifest (injected as blob URL) + service worker (offline cache via blob URL)
- Runs entirely client-side

---

## Hosting & installation

The app must be served over **HTTPS** for the Web Share API (gallery save) and service worker to function. The recommended free host is GitHub Pages.

### GitHub Pages setup

1. Create a free account at [github.com](https://github.com)
2. New repository → name it `daily-tracker` → Public → Add a README → Create
3. Upload `index.html` (rename from `daily-tracker.html`)
4. Settings → Pages → Deploy from branch → main / root → Save
5. Your permanent URL: `https://yourusername.github.io/daily-tracker`

### Installing on Android

1. Open the GitHub Pages URL in Chrome
2. Tap the browser menu → **Add to Home Screen**
3. The app launches fullscreen and works offline after first load

### Installing on iOS

1. Open the GitHub Pages URL in Safari
2. Tap the Share button → **Add to Home Screen**

---

## In-app customisation

Everything is configurable from the **Settings** tab — no code editing required:

- Your name (used in the nag banner and notifications)
- Appearance: system / light / dark theme
- Non-negotiable tasks (name, subtitle, add, remove)
- Daily structure tasks (name, subtitle, add, remove)
- Symptom flags (add, remove)

For developers, the default config is defined at the top of the script block and can be modified directly:

```js
const DEFAULT_CRITICAL = [
  { id:'meds', name:'take meds', sub:'non-negotiable. no excuses.' },
  // add or modify tasks here
];
```

---

## Future work

- [ ] Telegram bot integration for push notifications independent of the browser
- [ ] CSV export of history for sharing with care providers
- [ ] Configurable reminder intervals
- [ ] Cross-device sync via optional self-hosted backend
- [ ] Play Store release via PWABuilder TWA

---

## Context

Built as a practical tool for personal use, then developed as a portfolio and commercial piece. The design problem is real: standard task managers assume neurotypical executive function. This one doesn't.

The goal for the Play Store release is a one-time purchase with no ads and no subscription — health and symptom data should not be monetised through attention.

---

Built with HTML/CSS/JS. No frameworks. No dependencies. Just a file that works.

