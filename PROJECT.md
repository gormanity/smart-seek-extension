# Smart Seek for YouTube TV

A Chrome, Edge, Firefox, and Safari browser extension that adds configurable seek controls to YouTube TV.

## Problem

YouTube TV only provides 15-second seek jumps via its native controls. There is no built-in way to seek by smaller increments (e.g., 5 seconds), which makes precision navigation frustrating.

## Solution

This extension injects a keyboard handler into YouTube TV that:

- Adds **5-second seek** (backward and forward) by default via `Shift+J` / `Shift+L`
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

- **TypeScript + esbuild.** Source is TypeScript; esbuild compiles and bundles to `dist/`. `seek-controller.ts` imports from `seek-logic.ts` — esbuild inlines it as an IIFE for use as a content script. `tsc --noEmit` is used for type-checking only.
- **`dist/` is the self-contained extension.** `make build` copies manifest.json, icons, HTML, and CSS alongside the compiled JS. Load `dist/` as the unpacked extension in Chrome/Firefox.
- **Vitest** for unit tests (runs in Node with jsdom). Pure logic and DOM interactions are unit-tested. 125 tests across 4 files.
- **Single `manifest.json`** targeting all browsers. At pack time, `pack.js` patches it per browser: Chrome/Edge get `service_worker` only; Firefox gets `scripts` only. `build-safari.sh` applies additional patches (removes `background.type`, `options_ui.open_in_tab`, `browser_specific_settings`) before passing to `xcrun safari-web-extension-converter`.
- **`chrome.storage.sync`** for settings. Firefox supports this API natively via `browser.storage.sync`; the extension uses a `typeof browser !== 'undefined' ? browser : chrome` shim.

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
```

**Chrome:**
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `dist/` folder

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
Then see README.md for Safari-specific installation steps (unsigned extension setup).

### Pack for Distribution

```bash
make pack     # dist/smart-seek-{version}-{chrome,edge,firefox}.zip
make safari   # dist/smart-seek-{version}-safari-macos.zip (macOS only)
```

## Settings

| Setting      | Default   | Description                    |
|--------------|-----------|--------------------------------|
| `seekAmount` | `5`       | Seconds to seek per keypress   |
| `backKey`    | `Shift+J` | Hotkey to seek backward        |
| `forwardKey` | `Shift+L` | Hotkey to seek forward         |

## Versioning

Follows [Semantic Versioning](https://semver.org/). Extension version is set in `manifest.json`.
