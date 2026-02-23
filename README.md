# Smart Seek for YouTube TV

A Chrome and Firefox extension that adds configurable seek controls to [YouTube TV](https://tv.youtube.com).

YouTube TV's built-in keyboard shortcuts only jump 15 seconds at a time. Smart Seek lets you jump by any amount you choose — 5 seconds by default.

---

## Key bindings

| Action        | Configurable default | Always active       |
|---------------|----------------------|---------------------|
| Seek backward | `Shift+J`            | `Shift+←`           |
| Seek forward  | `Shift+L`            | `Shift+→`           |

The configurable bindings can be changed in the options page. The `Shift+Arrow` bindings are always active regardless of your settings.

---

## Configuration

**Popup** — Click the extension icon for a quick seek-amount adjustment (+/− 0.5 s per click).

**Options page** — Right-click the extension icon → *Options* (or open it from the popup) for full control:

| Setting       | Default   | Description                       |
|---------------|-----------|-----------------------------------|
| Seek amount   | `5`       | Seconds to seek per key press (0.1 – 300) |
| Seek backward | `Shift+J` | Configurable hotkey               |
| Seek forward  | `Shift+L` | Configurable hotkey               |

Settings sync across devices via `chrome.storage.sync`.

---

## Installation

The extension is not yet listed on the Chrome Web Store or Firefox AMO. Load it as an unpacked extension:

### Build

```bash
npm install
make build   # outputs the extension to dist/
```

### Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `dist/manifest.json`

> **Note:** Temporary add-ons in Firefox are removed when the browser closes. For a persistent install, build a signed `.xpi` via `make pack`.

---

## Development

### Prerequisites

- Node.js 20+, npm 10+

### Setup

```bash
npm install
```

### Commands

```bash
make build      # compile TypeScript and copy assets → dist/
make typecheck  # tsc --noEmit (type errors only)
make lint       # ESLint
make test       # Vitest (125 tests)
make check      # typecheck + lint + test
make pack       # dist/smart-seek-chrome.zip + smart-seek-firefox.zip
make watch      # Vitest in watch mode
```

### Project layout

```
src/
  content/      seek-controller.ts   content script (key handler + OSD)
                seek-logic.ts        pure functions (key parsing, seeking)
  options/      options.ts           settings page logic
  popup/        popup.ts             toolbar popup
  background/   service-worker.ts   install defaults
tests/          *.test.ts            Vitest unit tests
scripts/        build.js  pack.js   build tooling
dist/                               built extension (git-ignored)
```

See [PROJECT.md](PROJECT.md) for full architecture notes.

---

## License

MIT — see [LICENSE](LICENSE).
