# YTTV Seek Extension

A Chrome and Firefox browser extension that adds configurable seek controls to YouTube TV.

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
- **Browsers:** Chrome (Manifest V3) and Firefox (Manifest V3)

## Architecture

```
src/
  content/
    seek-controller.js    # Injected into tv.youtube.com; handles key events & video seeking
    seek-controller.css   # Optional OSD (on-screen display) styles
  options/
    options.html          # Settings UI
    options.js            # Settings logic
    options.css
  background/
    service-worker.js     # Handles install defaults; minimal logic
  manifest.json           # Shared MV3 manifest (Chrome + Firefox)
tests/
  seek-controller.test.js
  options.test.js
icons/
  icon-16.png
  icon-48.png
  icon-128.png
```

### Key Design Decisions

- **No build step for extension code.** Plain ES modules loaded directly from `src/`. This keeps the extension simple and auditable.
- **Vitest** for unit tests (runs in Node with jsdom). Only pure logic is unit-tested; DOM integration tested manually.
- **Single `manifest.json`** targeting both browsers. Firefox-specific fields (`browser_specific_settings`) are included but ignored by Chrome.
- **`chrome.storage.sync`** for settings. Firefox supports this API natively via `browser.storage.sync`; the content script uses a thin compatibility shim.

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

**Chrome:**
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this repo root

**Firefox:**
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on" → select `manifest.json`

### Pack for Distribution

```bash
npm run pack        # Produces yttv-seek-chrome.zip and yttv-seek-firefox.zip
```

## Settings

| Setting      | Default   | Description                    |
|--------------|-----------|--------------------------------|
| `seekAmount` | `5`       | Seconds to seek per keypress   |
| `backKey`    | `Shift+J` | Hotkey to seek backward        |
| `forwardKey` | `Shift+L` | Hotkey to seek forward         |

## Versioning

Follows [Semantic Versioning](https://semver.org/). Extension version is set in `manifest.json`.
