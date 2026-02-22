/**
 * popup.js — Extension popup for YTTV Seek.
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

function round1(n) {
  return Math.round(n * 10) / 10;
}

// ── Load settings ─────────────────────────────────────────────────────────────

const settings = await storage.get(DEFAULT_SETTINGS);

const amountEl  = document.getElementById('amount-value');
const decreaseEl = document.getElementById('decrease');
const increaseEl = document.getElementById('increase');

amountEl.textContent = settings.seekAmount;
document.getElementById('back-key').textContent    = settings.backKey;
document.getElementById('forward-key').textContent = settings.forwardKey;

// ── Seek amount controls ──────────────────────────────────────────────────────

function updateButtons() {
  decreaseEl.disabled = settings.seekAmount <= MIN;
  increaseEl.disabled = settings.seekAmount >= MAX;
}

updateButtons();

async function setAmount(n) {
  settings.seekAmount  = round1(Math.max(MIN, Math.min(MAX, n)));
  amountEl.textContent = settings.seekAmount;
  updateButtons();
  await storage.set({ seekAmount: settings.seekAmount });
}

decreaseEl.addEventListener('click', () => setAmount(settings.seekAmount - STEP));
increaseEl.addEventListener('click', () => setAmount(settings.seekAmount + STEP));

// ── Open full settings ────────────────────────────────────────────────────────

document.getElementById('open-settings').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
