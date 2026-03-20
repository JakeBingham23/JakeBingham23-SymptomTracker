# Daily Structure Tracker

A persistent daily task and symptom tracker designed specifically for AuDHD (Autism + ADHD) task management and bipolar symptom monitoring.

> Current version: **v2.8**

---

## What it does

- Tracks daily non-negotiables (meds, shower, meals) with a persistent nag banner until completed
- Logs mood, energy level, and symptom flags for pattern recognition over time
- Maintains a medication streak counter across days
- Stores 14 days of history locally — no server, no account, no data leaving your device
- 30-minute browser notifications for incomplete critical tasks (requires HTTPS)
- Captures and saves a symptom record image directly to the device gallery for sharing with care providers
- Fully configurable — name, tasks, symptoms, and appearance all customisable in-app without touching code

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

