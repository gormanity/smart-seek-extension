# Store Listing Copy — Smart Seek for YouTube TV

---

## Name

**Smart Seek for YouTube TV**

(75-char limit on Chrome/Edge; 50-char limit on Firefox — our name is 29 chars,
fine everywhere)

---

## Short description

> Used by Chrome Web Store and Edge Add-ons (≤132 chars). Used as the Firefox
> "Summary" field (≤250 chars; same text works fine).

```
Configurable seek controls for YouTube TV. Jump by any amount with custom key bindings.
```

_(123 chars)_

---

## Detailed description

> Used by all three stores. Plain text; stores render line breaks. Chrome/Edge:
> ≤16,000 chars. Firefox: no hard limit in practice.

```
Smart Seek adds configurable keyboard seek controls to YouTube TV (tv.youtube.com).

YouTube TV's built-in keyboard shortcuts only jump 15 seconds at a time — too coarse for precise navigation. Smart Seek lets you choose exactly how far to jump, and which keys trigger it.

FEATURES

• Configurable seek amount — any value from 0.1 to 300 seconds
• Configurable key bindings — any key combination you like
• Quick popup — click the toolbar icon to nudge the seek amount up or down without opening settings
• On-screen indicator — a brief seek direction + amount overlay appears on each keypress
• Always-active shortcuts — Shift+← and Shift+→ work regardless of your custom bindings
• Syncs across devices — settings are stored in your browser's built-in sync storage

DEFAULT KEY BINDINGS

  Seek backward 5 s  →  Shift+J  (configurable)
  Seek forward  5 s  →  Shift+L  (configurable)
  Seek backward      →  Shift+←  (always active)
  Seek forward       →  Shift+→  (always active)

PRIVACY

No personal data is collected or transmitted. The extension stores only your preferences (seek amount and key bindings) locally via your browser's sync storage. No external servers are contacted. Full privacy policy: https://github.com/gormanity/smart-seek-extension/blob/main/store/privacy-policy.md

OPEN SOURCE

Source code: https://github.com/gormanity/smart-seek-extension
```

---

## Category

| Store   | Category     |
| ------- | ------------ |
| Chrome  | Productivity |
| Firefox | Other        |
| Edge    | Productivity |

---

## Homepage / support URL

- **Homepage:** https://github.com/gormanity/smart-seek-extension
- **Support:** https://github.com/gormanity/smart-seek-extension/issues

---

## Language

English (en-US)

---

## Version notes (for initial submission)

```
Initial release. Adds configurable seek controls to YouTube TV with a
5-second default, custom key bindings, and a toolbar popup for quick
seek-amount adjustment.
```

---

## Chrome-specific: permission justifications

Chrome Web Store requires a written justification for each permission.

| Permission                              | Justification                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                               | Stores the user's seek amount and key binding preferences using `chrome.storage.sync` so settings persist across sessions and sync across devices.              |
| Host permission: `*://tv.youtube.com/*` | The extension must inject a content script into YouTube TV pages to intercept keyboard events and control the video player. It has no access to any other site. |

---

## Edge-specific: search terms

<!-- Max 7 terms · 30 chars per term · 21 words total across all terms -->

| # | Term                  | Words | Chars |
|---|-----------------------|-------|-------|
| 1 | YouTube TV seek       | 3     | 15    |
| 2 | YouTube TV rewind     | 3     | 17    |
| 3 | YouTube TV skip       | 3     | 15    |
| 4 | YouTube TV keyboard   | 3     | 19    |
| 5 | custom seek controls  | 3     | 20    |
| 6 | seek forward backward | 3     | 21    |
| 7 | YouTube TV playback   | 3     | 19    |

_Total: 21 words_

---

## Firefox-specific: source code submission

Firefox AMO requires source code when the submitted zip contains compiled or
minified code. Submit the repository source (or a zip of it) and include this
build note:

```
Build instructions:
  1. npm install
  2. make build

This produces the dist/ directory that was zipped for submission.
Toolchain: Node.js 20+, esbuild (TypeScript → IIFE/ESM bundles).
```
