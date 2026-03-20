# Daily Structure Tracker

A persistent daily task and symptom tracker designed specifically for AuDHD (Autism + ADHD) task management and bipolar symptom monitoring.

> Current version: **v2.9**

---

## What it does

- Tracks daily non-negotiables (meds, shower, meals) with a persistent nag banner until completed
- Logs mood, energy level, and symptom flags for pattern recognition over time
- Maintains a medication streak counter across days
- Stores 14 days of history locally — no server, no account, no data leaving your device
- Appointment tracking with countdown timers and pre-appointment symptom summaries
- Configurable reminders with browser notifications, Telegram bot, haptic vibration, and audio alerts
- Screenshot capture with gallery save for sharing symptom records with care providers
- Full accessibility — VoiceOver (iOS), TalkBack (Android), keyboard navigation, high contrast mode

---

## Navigation

Four-tab sticky top nav bar:

- **Today** — non-negotiables, daily structure tasks, symptom check-in
- **History** — upcoming appointments with countdown + check-in log
- **Stats** — med streak, days logged, avg task completion, mood timeline
- **Settings** — full configuration, segmented by category

A **theme toggle** (auto/light/dark) lives in the nav bar at all times.

---

## Settings — segmented layout

### Profile
- Display name (used in nag banner and notifications)
- Appearance: system / light / dark theme

### Tasks & Symptoms
- Add, edit, remove non-negotiable tasks (with subtitles)
- Add, edit, remove daily structure tasks
- Add, remove symptom flags

### Task Reminders
- Browser notification toggle
- Telegram reminder toggle
- Vibration pattern: gentle / firm / urgent
- Sound: off / chime / beep / alarm / custom upload
- Volume control per notification type
- Reminder interval: 15 min / 30 min / 1 hr / 2 hr
- Per-task deadlines with countdown rings

### Timers & Check-in Window
- Timer completion alert toggle
- Window closing alert toggle
- Vibration pattern picker
- Sound picker with custom upload
- Volume control
- Daily check-in window closing time
- Custom countdown timers (name + duration)

### Appointment Notifications
- Browser notification toggle
- Telegram reminder toggle
- Vibration pattern picker
- Sound picker with custom upload
- Volume control

### Telegram Setup
- Step-by-step bot connection via @BotFather
- Auto-detects chat ID from getUpdates
- Test message button

### Data & Storage
- Set dedicated screenshot save folder (Chrome/Edge — persisted via IndexedDB)
- Export check-in history as CSV

---

## Appointments

- Add appointments with title, date/time, location, notes
- 24hr and 1hr browser + Telegram reminders (independently toggleable)
- Countdown shown on History tab
- Next appointment banner on History tab
- Pre-appointment summary — auto-generates a formatted report from the last 7 days of mood, energy, task completion, and symptom flags — shareable directly with care providers

---

## Timers

- **Per-task countdown rings** — circular SVG progress ring around each task's checkbox, draining as the deadline approaches. Turns amber under 30 minutes, red when overdue.
- **Daily check-in window** — configurable closing time shown in the header with countdown.
- **Custom timers** — freeform countdowns shown as widgets on the Today tab.
- All timers update live every second.

---

## Notifications

Three independent notification channels, each separately configurable:

| Channel | Task reminders | Timer/window | Appointments |
|---|---|---|---|
| Browser (SW) | on/off | on/off | on/off |
| Telegram bot | on/off | on/off | on/off |
| Vibration | gentle/firm/urgent | gentle/firm/urgent | gentle/firm/urgent |
| Sound | off/chime/beep/alarm/custom | off/chime/beep/alarm/custom | off/chime/beep/alarm/custom |

**Aggressive nag pattern** — task reminders fire three escalating notifications at 0, 30, and 90 seconds. Requires HTTPS for background delivery.

**Custom audio** — upload any MP3/WAV/OGG per notification type. Stored in IndexedDB. Preview button available. Volume controllable per type.

**Built-in tones** (Web Audio API, no files needed):
- **chime** — ascending four-note tone (C E G C)
- **beep** — two short sharp beeps
- **alarm** — three descending sawtooth pulses

> APK stage: audio will be upgraded to Android native RingtoneManager with full system ringtone access.

---

## Screenshot / gallery save

- Captures the symptom check-in block as a PNG at 2x resolution
- Shows a preview before saving
- **Chrome/Edge Android** — saves to a user-selected folder persisted via IndexedDB
- **iOS Safari** — Web Share API → Save to Photos
- **DuckDuckGo browser** — in-page overlay with long-press to save
- **Fallback** — downloads to Downloads folder
- Haptic feedback synced to save completion

---

## Accessibility

Fully compatible with VoiceOver (iOS) and TalkBack (Android).

- Skip to main content link
- ARIA live regions for all state changes (polite + assertive)
- aria-pressed / aria-checked on all toggles and interactive elements
- aria-describedby links subtitles and timers to parent tasks
- Heading hierarchy: h1 per page, h2 per segment, h3 per subsection
- Focus management — modals move focus on open/close
- Escape key closes any modal
- Keyboard navigation — Enter/Space toggle tasks
- 44px minimum tap targets
- High contrast mode (prefers-contrast: more)
- Screen reader announcements for all state changes

---

## Tech stack

- Vanilla HTML/CSS/JS — zero build step, zero framework
- html2canvas (CDN) for symptom record capture
- Web Audio API for built-in alert tones
- IndexedDB for persistent binary storage
- localStorage for daily state and config
- Web Share API, File System Access API
- Web Notifications API + Service Worker
- Vibration API, PWA manifest + offline cache

---

## Hosting

Requires HTTPS. Recommended: GitHub Pages (free, permanent).

1. New public repo → upload index.html
2. Settings → Pages → Deploy from branch → main / root → Save
3. Live at https://yourusername.github.io/reponame

---

## Roadmap

- [ ] PWABuilder TWA → Google Play Store APK
- [ ] Android native ringtone access via RingtoneManager (APK stage)
- [ ] Proper Web Push independent of browser tab
- [ ] Cross-device sync via optional self-hosted backend
- [ ] Privacy policy for Play Store submission

---

Built with HTML/CSS/JS. No frameworks. No dependencies. Just a file that works.
