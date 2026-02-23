/**
 * seek-controller.ts — Content script for Smart Seek for YouTube TV.
 *
 * Imports seek logic from seek-logic.ts; esbuild bundles this as an IIFE
 * for use as a content script — no more manual code duplication.
 */

import { DEFAULT_SETTINGS, matchesKey, applySeek, formatSeekLabel } from './seek-logic.js';

// ── OSD (on-screen display) ───────────────────────────────────────────────

// Arrow-only path from YouTube TV's seek icon (digit subpaths omitted so
// we can overlay the actual configured seek amount as a label).
const ARROW_PATH = 'M4.293.293a1 1 0 011.414 1.414L4.414 3H13l.496.013A10 10 0 0113 23'
  + 'a1 1 0 010-2 8.001 8.001 0 00.396-15.99L13 5H4.414l1.293 1.293a1 1 0 01-1.414'
  + ' 1.414L.586 4 4.293.293Z';

let osdEl: HTMLDivElement | null = null;
let osdLabel: HTMLSpanElement | null = null;

function createOsdEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'smart-seek-osd';

  const content = document.createElement('div');
  content.className = 'smart-seek-osd__content';

  const ring = document.createElement('div');
  ring.className = 'smart-seek-osd__ring';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ARROW_PATH);
  svg.appendChild(path);

  const label = document.createElement('span');
  label.className = 'smart-seek-osd__label';

  ring.appendChild(svg);
  ring.appendChild(label);
  content.appendChild(ring);
  el.appendChild(content);
  document.body.appendChild(el);
  return el;
}

function showOsd(direction: 'forward' | 'back', seconds: number): void {
  if (!osdEl) {
    osdEl    = createOsdEl();
    osdLabel = osdEl.querySelector<HTMLSpanElement>('.smart-seek-osd__label');
  }

  osdLabel!.textContent = formatSeekLabel(seconds);
  osdEl.classList.toggle('smart-seek-osd--forward', direction === 'forward');

  // Restart the keyframe animation on every press via forced reflow.
  osdEl.classList.remove('smart-seek-osd--visible');
  void osdEl.offsetWidth;
  osdEl.classList.add('smart-seek-osd--visible');
}

// ── Hardcoded bindings (always active, regardless of user settings) ───────
const HARDCODED_BACK_KEY    = 'Shift+ArrowLeft';
const HARDCODED_FORWARD_KEY = 'Shift+ArrowRight';

// ── Storage shim ──────────────────────────────────────────────────────────
const chromeOrBrowser = typeof browser !== 'undefined' ? browser : chrome;
const storageSync = chromeOrBrowser.storage.sync;

// ── Live settings (updated without page reload) ───────────────────────────
type Settings = typeof DEFAULT_SETTINGS;
const settings: Settings = { ...DEFAULT_SETTINGS };

void storageSync.get(DEFAULT_SETTINGS).then((stored) => {
  Object.assign(settings, stored);
});

// ── Key handler ───────────────────────────────────────────────────────────
document.addEventListener('keydown', (event) => {
  // Ignore keypresses inside text inputs.
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)) {
    return;
  }

  const isBack    = matchesKey(event, settings.backKey)    || matchesKey(event, HARDCODED_BACK_KEY);
  const isForward = matchesKey(event, settings.forwardKey) || matchesKey(event, HARDCODED_FORWARD_KEY);
  if (!isBack && !isForward) return;

  // Pick the best candidate: playing > ready-with-duration > first
  const videos = Array.from(document.querySelectorAll('video'));
  const video = videos.find(v => !v.paused && v.readyState >= 2)
             || videos.find(v => v.readyState >= 2 && v.duration > 0)
             || videos[0];

  if (!video) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const direction = isForward ? 'forward' : 'back';
  applySeek(video, isForward ? settings.seekAmount : -settings.seekAmount);
  showOsd(direction, settings.seekAmount);
}, /* capture */ true);

// ── Live settings via storage changes ────────────────────────────────────
chromeOrBrowser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  for (const key in changes) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      (settings as Record<string, unknown>)[key] = changes[key].newValue;
    }
  }
});
