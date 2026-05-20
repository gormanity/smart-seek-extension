# Smart Seek for YouTube TV

A Chrome, Edge, Firefox, and Safari browser extension that adds configurable
seek controls to YouTube TV.

## Problem

YouTube TV only provides 15-second seek jumps via its native controls. There is
no built-in way to seek by smaller increments (e.g., 5 seconds), which makes
precision navigation frustrating.

## Solution

This extension injects a keyboard handler into YouTube TV that:

- Adds **5-second seek** (backward and forward) by default via `Shift+J` /
  `Shift+L`
- Allows full customization of seek amount and hotkeys via an options page
- Works without conflicting with YouTube TV's native keyboard shortcuts

## Features

- **Default seek amount:** 5 seconds (configurable)
- **Default hotkeys:** `Shift+J` (seek back) / `Shift+L` (seek forward)
- **Options page:** Change seek amount and key bindings
- **Sync:** Settings sync across browsers via `chrome.storage.sync`
- **Browsers:** Chrome, Edge, Firefox, and Safari (macOS) — all Manifest V3

## Architecture

```
src/
  content/
    seek-logic.ts         # Pure functions: parseKey, matchesKey, applySeek, DEFAULT_SETTINGS
    seek-controller.ts    # Content script: key handler + OSD; esbuild bundles as IIFE
    seek-controller.css   # OSD indicator styles
  options/
    options.html          # Settings UI
    options.ts            # Settings page logic (pure exports + DOM init)
    options.css
    init.ts               # Module entry point (calls initOptionsPage)
  popup/
    popup.html            # Toolbar popup
    popup.ts              # Popup logic
    popup.css
  background/
    service-worker.ts     # Sets defaults on install; minimal logic
  globals.d.ts            # Firefox compat: declare const browser
manifest.json             # MV3 manifest (all browsers); copied to dist/ at build time
dist/                     # Build output (git-ignored); load this as the unpacked extension
dist-dev/                 # Dev build output (git-ignored); load alongside dist/ for coexistence testing
scripts/
  build.js                # esbuild orchestrator (4 entry points + static asset copy)
  pack.js                 # Produces smart-seek-{version}-{chrome,edge,firefox}.zip
  build-safari.sh         # Produces smart-seek-{version}-safari-macos.zip (macOS + Xcode required)
tests/
  seek-logic.test.ts
  seek-controller.test.ts
  options.test.ts
  popup.test.ts
icons/
  icon-16.png  icon-48.png  icon-128.png  icon-inline.svg
```

### Key Design Decisions

- **TypeScript + esbuild.** Source is TypeScript; esbuild compiles and bundles
  to `dist/`. `seek-controller.ts` imports from `seek-logic.ts` — esbuild
  inlines it as an IIFE for use as a content script. `tsc --noEmit` is used for
  type-checking only.
- **`dist/` is the self-contained extension.** `make build` copies
  manifest.json, icons, HTML, and CSS alongside the compiled JS. Load `dist/` as
  the unpacked extension in Chrome/Firefox.
- **Vitest** for unit tests (runs in Node with jsdom). Pure logic and DOM
  interactions are unit-tested. 125 tests across 4 files.
- **Single `manifest.json`** targeting all browsers. At pack time, `pack.js`
  patches it per browser: Chrome/Edge get `service_worker` only; Firefox gets
  `scripts` only. `build-safari.sh` applies additional patches (removes
  `background.type`, `options_ui.open_in_tab`, `browser_specific_settings`)
  before passing to `xcrun safari-web-extension-converter`.
- **`chrome.storage.sync`** for settings. Firefox supports this API natively via
  `browser.storage.sync`; the extension uses a
  `typeof browser !== 'undefined' ? browser : chrome` shim.
- **Dev/prod coexistence uses runtime arbitration.** Chrome dev and prod builds
  have distinct fixed extension IDs. The dev build announces itself to known
  prod IDs via `chrome.runtime.sendMessage`; prod accepts only the known dev ID,
  marks itself duplicate-disabled, updates the popup/icon, and keeps its content
  runtime suspended. Prod also probes dev when status is requested so the popup
  and badge do not depend on a YouTube TV tab being open. The page-local
  heartbeat remains the content-runtime guard on YouTube TV pages, where prod
  starts after a short grace window if no dev heartbeat is present, suspends if
  dev appears later, and resumes after the heartbeat becomes stale.

### Dev/Prod Coexistence Details

The coexistence mechanism is deliberately local and permission-light:

- No `management` permission is used.
- No extension IDs are inferred from browser APIs.
- The only cross-extension surface is `externally_connectable`, restricted to
  the expected counterpart IDs.
- The dev build can be loaded next to either a local prod build or the Chrome
  Web Store prod build.

Chrome IDs:

| Build      | ID                                 | Purpose                       |
| ---------- | ---------------------------------- | ----------------------------- |
| Local prod | `gakejpcpkepgdgllnppopcglacnongao` | `dist/chrome` local testing   |
| Store prod | `agfmeelnmijibhmffkbhebpgmjbhddkc` | Chrome Web Store production   |
| Local dev  | `nmbehanjefalgbpkichpmdfofmjllgfi` | `dist-dev/chrome` development |

Timing:

| Setting                    | Value    | Purpose                                     |
| -------------------------- | -------- | ------------------------------------------- |
| Prod content startup grace | `500ms`  | Let dev announce before prod starts on-page |
| Dev heartbeat interval     | `1000ms` | Keep page-local and external presence fresh |
| Dev stale timeout          | `3500ms` | Let prod resume after dev disappears        |

When prod is duplicate-disabled, the active content runtime is explicitly
stopped. Teardown removes the key handler, storage change listener, OSD timers,
and OSD DOM owned by the extension. The background state also switches the
extension action to the grayed OFF icon and exposes the disabled state to the
popup.

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
npm install
```

### Run Tests

```bash
npm test
```

### Load Extension Locally

```bash
make build   # required first — populates dist/
npm run build:dev   # populates dist-dev/ for dev/prod coexistence testing
```

**Chrome:**

1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `dist/` folder

For local dev/prod coexistence testing, load both folders:

- Prod: `dist/chrome`
- Dev: `dist-dev/chrome`

If Chrome shows both installs with the same ID, remove both extension cards and
load those exact folders again. Loading `dist/chrome` twice creates an ID
collision and Chrome will disable one of them.

**Edge:**

1. Navigate to `edge://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `dist/` folder

**Firefox:**

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on" → select `dist/manifest.json`

**Safari (macOS):**

```bash
make safari   # requires Xcode; builds and packages the .app
```

Then see README.md for Safari-specific installation steps (unsigned extension
setup).

### Pack for Distribution

```bash
make pack     # dist/smart-seek-{version}-{chrome,edge,firefox}.zip
make safari   # dist/smart-seek-{version}-safari-macos.zip (macOS only)
```

## Settings

| Setting      | Default   | Description                  |
| ------------ | --------- | ---------------------------- |
| `seekAmount` | `5`       | Seconds to seek per keypress |
| `backKey`    | `Shift+J` | Hotkey to seek backward      |
| `forwardKey` | `Shift+L` | Hotkey to seek forward       |

## Versioning

Follows [Semantic Versioning](https://semver.org/). Extension version is set in
`manifest.json`.
