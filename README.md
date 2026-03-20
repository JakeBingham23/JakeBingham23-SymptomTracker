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
EDesign decisions
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
