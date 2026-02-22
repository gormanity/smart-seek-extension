/**
 * popup.ts — Extension popup for YTTV Seek.
 *
 * Lets the user nudge the seek amount without opening the full options page.
 * Changes are written to storage immediately; the content script picks them
 * up via storage.onChanged with no page reload required.
 */

import { DEFAULT_SETTINGS } from '../content/seek-logic.js';

const STEP = 0.5;
const MIN  = 0.5;
const MAX  = 300;

const storage = (typeof browser !== 'undefined' ? browser : chrome).storage.sync;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Load settings ─────────────────────────────────────────────────────────────

type Settings = typeof DEFAULT_SETTINGS;
const settings: Settings = await storage.get(DEFAULT_SETTINGS);

const amountEl   = document.getElementById('amount-value') as HTMLSpanElement;
const decreaseEl = document.getElementById('decrease') as HTMLButtonElement;
const increaseEl = document.getElementById('increase') as HTMLButtonElement;

amountEl.textContent = String(settings.seekAmount);
(document.getElementById('back-key') as HTMLSpanElement).textContent    = settings.backKey;
(document.getElementById('forward-key') as HTMLSpanElement).textContent = settings.forwardKey;

// ── Seek amount controls ──────────────────────────────────────────────────────

function updateButtons(): void {
  decreaseEl.disabled = settings.seekAmount <= MIN;
  increaseEl.disabled = settings.seekAmount >= MAX;
}

updateButtons();

async function setAmount(n: number): Promise<void> {
  settings.seekAmount  = round1(Math.max(MIN, Math.min(MAX, n)));
  amountEl.textContent = String(settings.seekAmount);
  updateButtons();
  await storage.set({ seekAmount: settings.seekAmount });
}

decreaseEl.addEventListener('click', () => setAmount(settings.seekAmount - STEP));
increaseEl.addEventListener('click', () => setAmount(settings.seekAmount + STEP));

// ── Open full settings ────────────────────────────────────────────────────────

document.getElementById('open-settings')!.addEventListener('click', () => {
  void chrome.runtime.openOptionsPage();
});
