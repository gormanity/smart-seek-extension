# AGENTS.md — Working Guide for AI Agents

This file describes how to work effectively on the YTTV Seek Extension codebase.

## Project Overview

A Chrome + Firefox MV3 browser extension that adds configurable seek controls to YouTube TV (`tv.youtube.com`). See PROJECT.md for full context.

## Repository Layout

```
src/
  content/
    seek-controller.js    # Content script: key listener + video seek logic
    seek-controller.css   # OSD indicator styles
  options/
    options.html          # Extension options page
    options.js            # Options page logic
    options.css
  background/
    service-worker.js     # Sets defaults on install; otherwise minimal
  manifest.json           # MV3 manifest (Chrome + Firefox compatible)
tests/
  seek-controller.test.js
  options.test.js
icons/
package.json
vitest.config.js
PROJECT.md
AGENTS.md                 # This file
CLAUDE.md -> AGENTS.md    # Symlink
LICENSE
```

## VCS: Jujutsu (jj)

This repo uses `jj` with a colocated git backend.

- Check status: `jj status`
- Check if working copy is clean before making a new commit
- Describe a change: `jj describe -m "message"`
- Create a new change after committing: `jj new`
- Push to GitHub: `jj git push`

**Commit discipline:** Each logical unit of work gets its own commit. Do not bundle unrelated changes. Prefer small, focused commits.

## Workflow

1. **Check clean state first:** Run `jj status` before starting a new unit of work.
2. **TDD:** Write or update tests before implementing the feature/fix.
3. **Run tests:** `npm test` — all tests must pass before committing.
4. **Commit:** `jj describe -m "..."` then `jj new` to advance.
5. **Push:** `jj git push` when a logical milestone is complete.

## Testing

- Framework: **Vitest** with `jsdom` environment
- Tests live in `tests/`
- Only pure logic is unit-tested (seek amount calculation, settings parsing, key matching). Do not mock `chrome.storage` extensively — use simple dependency injection instead.
- Run: `npm test`
- Watch: `npm run test:watch`

## Code Conventions

- **Vanilla JS, ES2020+.** No TypeScript, no framework.
- **No build step** for extension source. Files are loaded directly from `src/`.
- Modules use ES module syntax (`import`/`export`) in test context; content scripts use plain IIFE or globals (MV3 content scripts don't support ES module imports by default unless specified in manifest).
- Keep content scripts self-contained and minimal.
- Settings keys: `seekAmount` (number, seconds), `backKey` (string, e.g. `"Shift+J"`), `forwardKey` (string, e.g. `"Shift+L"`).

## Key Implementation Notes

- **Finding the video element:** `document.querySelector('video')` on `tv.youtube.com`.
- **Seeking:** Modify `video.currentTime` directly.
- **Key matching:** Parse hotkey strings like `"Shift+J"` into modifier + key components; compare against `KeyboardEvent`.
- **YouTube TV conflict avoidance:** YouTube TV uses arrow keys for 15s seek. Our default bindings (`Shift+J`/`Shift+L`) do not conflict. Call `event.preventDefault()` and `event.stopPropagation()` when we handle a keypress so YouTube TV doesn't also react.
- **Storage API:** Use `chrome.storage.sync` (Chrome) / `browser.storage.sync` (Firefox). Abstract behind a thin `getStorage()`/`setStorage()` shim that prefers `browser` when available, falls back to `chrome`.

## What NOT to Do

- Do not introduce a bundler or transpiler for extension source files.
- Do not add dependencies to `package.json` that end up in the extension itself (only devDependencies are acceptable).
- Do not commit broken tests.
- Do not use `git` commands directly — use `jj`.
