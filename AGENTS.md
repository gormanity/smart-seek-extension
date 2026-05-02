# AGENTS.md — Working Guide for AI Agents

This file describes how to work effectively on the Smart Seek for YouTube TV
codebase.

## Project Overview

A Chrome, Edge, Firefox, and Safari MV3 browser extension that adds configurable
seek controls to YouTube TV (`tv.youtube.com`). See PROJECT.md for full context.

## Repository Layout

```
src/
  content/
    seek-logic.ts         # Pure functions: parseKey, matchesKey, applySeek, DEFAULT_SETTINGS
    seek-controller.ts    # Content script: key handler + OSD (esbuild bundles as IIFE)
    seek-controller.css   # OSD indicator styles
  options/
    options.html          # Extension options page
    options.ts            # Pure exports (validateSeekAmount, formatKeyString) + DOM init
    options.css
    init.ts               # Module entry point: calls initOptionsPage()
  popup/
    popup.html            # Toolbar popup
    popup.ts              # Popup logic (top-level await)
    popup.css
  background/
    service-worker.ts     # Sets defaults on install; otherwise minimal
  globals.d.ts            # Firefox compat ambient declaration
manifest.json             # MV3 manifest (Chrome + Firefox); copied to dist/ at build
dist/                     # Build output (git-ignored) — load this as unpacked extension
scripts/
  build.js                # esbuild build script
  pack.js                 # Produces zip archives for store submission
tests/
  seek-logic.test.ts
  seek-controller.test.ts
  options.test.ts
  popup.test.ts
tsconfig.json
eslint.config.js
vitest.config.js
Makefile
package.json
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
- Push to GitHub: `jj git push --remote origin --bookmark main`

**Commit discipline:** Each logical unit of work gets its own commit. Do not
bundle unrelated changes. Prefer small, focused commits.

## Releases

- **Suggest a new release** after any user-facing change to the extension: new
  features, bug fixes, or behavior changes. Changes that are purely internal —
  CI, build tooling, README, repo metadata — do not warrant a release on their
  own.
- **Release notes must cover only extension changes** — what a user cares about.
  Do not include repo or tooling changes.

### Cutting a release

Pushing a tag matching `v*` triggers `.github/workflows/release.yml`, which
builds the per-store zips and uploads them to a GitHub release of the same name.
Run the steps below in order. Steps marked **(approval gate)** block — do not
proceed until the user explicitly approves.

1. **Draft release notes (approval gate).** Walk commits since the last tag
   (`jj log` / `git log <last-tag>..HEAD`), group user-facing changes (Features
   / Fixes / Behavior), and present the draft to the user. Do not move on until
   the user approves.
2. **Review the listing data (approval gate).** Open `store/listing.data.js` and
   check every field against what's actually shipping in this release —
   especially `copy.versionNotes` (almost always needs updating),
   `copy.detailedDescription`, the feature bullets, and the default key
   bindings. Propose concrete edits and show a diff. Wait for user approval
   before saving.
3. **Bump versions.** Update `version` in both `package.json` and
   `manifest.json` — they must match.
4. **Rebuild per-store listings.** Run `make listings` to regenerate
   `dist/store/{chrome,edge,firefox}.md` from the updated data file. These files
   are git-ignored; they are the copy-paste source for each store's submission
   form.
5. **Verify.** Run `make check` and `make pack`. Both must pass before tagging.
6. **Commit and push main.** One commit covering the version bump + listing data
   updates (rebuilt outputs are not committed). Then
   `jj git push --remote origin --bookmark main`.
7. **Tag and push the tag.** Via the colocated git backend:

   ```
   git tag -a vX.Y.Z -m "vX.Y.Z" <commit>
   git push origin vX.Y.Z
   ```

   The release workflow will run, create the GitHub release if it does not
   already exist, and upload the per-store zip assets.

8. **Set the approved release notes on the GitHub release.** The workflow's
   `--generate-notes` output is a placeholder; replace it with the notes the
   user approved in step 1:

   ```
   gh release edit vX.Y.Z --notes "$(cat notes.md)"
   ```

9. **Submit to stores.** Use the freshly regenerated `dist/store/*.md` files to
   fill out each store's submission form, and upload the matching zip from the
   GitHub release assets.

## Workflow

1. **Check clean state first:** Run `jj status` before starting a new unit of
   work.
2. **TDD:** Write or update tests before implementing the feature/fix.
3. **Run tests:** `npm test` — all tests must pass before committing.
4. **Commit:** `jj describe -m "..."` then `jj new` to advance.
5. **Push:** `jj git push --remote origin --bookmark main` when a logical
   milestone is complete.

## Build

```bash
make build        # compile TypeScript → dist/ via esbuild
make typecheck    # tsc --noEmit (type errors only, no emit)
make lint         # ESLint with typescript-eslint
make format       # Prettier — auto-fix markdown formatting
make format-check # Prettier — check only (used by `make check`)
make test         # Vitest
make check        # typecheck + lint + format-check + test (run before committing)
make pack         # build + zip archives for store submission
```

## Testing

- Framework: **Vitest** with `jsdom` environment
- Tests live in `tests/`, all `.test.ts`
- Pure logic is unit-tested; DOM interactions use jsdom
- `seek-controller.test.ts` — imports the module once via `beforeAll` to avoid
  stacking listeners
- `popup.test.ts` — uses `vi.resetModules()` + dynamic `await import()` per test
  (top-level await)
- Run: `npm test` or `make test`
- Watch: `make watch`

## Code Conventions

- **American English** for all prose (docs, comments, UI strings).
- **Markdown style:** Use underscores for emphasis (`_italic_`, not `*italic*`).
  Prettier enforces 80-char line wrapping; run `make format` to auto-fix.
- **TypeScript, strict mode.** All source files are `.ts`; esbuild compiles to
  `dist/`.
- **No runtime dependencies.** Only `devDependencies` in `package.json`.
- **Firefox/Chrome compat shim:**
  `typeof browser !== 'undefined' ? browser : chrome` — never reference
  `browser` directly without the typeof guard (it's declared as
  `const browser: typeof chrome | undefined` in `globals.d.ts`).
- Settings keys: `seekAmount` (number, seconds), `backKey` (string, e.g.
  `"Shift+J"`), `forwardKey` (string, e.g. `"Shift+L"`).

## Pitfalls

- **Never use inline `<script>` blocks in extension HTML pages (MV3).** Chrome's
  default `script-src 'self'` CSP silently blocks them — the script runs in no
  environment, produces no error, and nothing initializes. Always use
  `<script src="file.js">` or `<script type="module" src="file.js">`.
- **YouTube TV has multiple `<video>` elements.**
  `document.querySelector('video')` returns the wrong one. Always select by
  priority: playing+ready > ready-with-duration > first. See
  `seek-controller.ts` for the canonical selector.
- **Do not use dynamic `import()` in content scripts.** If the import fails
  (e.g. CORS, CSP, or extension URL edge cases), the async IIFE rejects silently
  and no event listener is ever attached — seeking appears completely broken
  with no visible error. `seek-controller.ts` is bundled as a self-contained
  IIFE by esbuild; it imports `seek-logic.ts` at build time, not at runtime.
- **Do not use ES module `export` in files loaded as content scripts.** Classic
  content scripts don't support top-level `export`; it causes a SyntaxError.
  esbuild's `iife` format handles this correctly.

## Key Implementation Notes

- **Finding the video element:** Priority selector on `tv.youtube.com` — see
  `seek-controller.ts`.
- **Seeking:** Modify `video.currentTime` directly via `applySeek()` in
  `seek-logic.ts`.
- **Key matching:** `parseKey()` parses hotkey strings like `"Shift+J"` into
  modifier + key components; `matchesKey()` compares against a `KeyboardEvent`.
- **YouTube TV conflict avoidance:** Our default bindings (`Shift+J`/`Shift+L`)
  do not conflict with YouTube TV's native arrow-key seek. The content script
  uses capture phase + `stopImmediatePropagation()` so custom bindings can
  override native YT TV keys.
- **Hardcoded bindings:** `Shift+ArrowLeft` and `Shift+ArrowRight` are always
  active regardless of user settings.
- **Live settings:** `storage.onChanged` updates the in-memory settings object
  without requiring a page reload.
- **Storage API:** `chrome.storage.sync` (Chrome) / `browser.storage.sync`
  (Firefox) via the compat shim.

## What NOT to Do

- Do not add dependencies to `package.json` that end up in the extension itself
  (only devDependencies are acceptable).
- Do not commit broken tests.
- Do not use `git` commands directly — use `jj`.
- Do not load extension from the repo root — always run `make build` first and
  load from `dist/`.
