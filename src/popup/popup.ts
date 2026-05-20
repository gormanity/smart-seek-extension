/**
 * popup.ts — Extension popup for Smart Seek for YouTube TV.
 *
 * Lets the user nudge the seek amount without opening the full options page.
 * Changes are written to storage immediately; the content script picks them
 * up via storage.onChanged with no page reload required.
 */

import { DEFAULT_SETTINGS } from '../content/seek-logic.js';
import {
  DUPLICATE_STATUS_CHANGED_MESSAGE,
  DUPLICATE_STATUS_REQUEST_MESSAGE,
  type DuplicateStatusResponse,
  type DuplicateStatusChangedMessage,
} from '../runtime-messages.js';

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
const devBadgeEl = document.getElementById('dev-badge') as HTMLSpanElement | null;
const duplicateBannerEl = document.getElementById('duplicate-banner') as HTMLDivElement | null;

if (__DEV__ && devBadgeEl) {
  devBadgeEl.hidden = false;
}

function setDuplicateBannerVisible(visible: boolean): void {
  if (duplicateBannerEl) {
    duplicateBannerEl.hidden = !visible;
  }
}

function refreshDuplicateStatus(): void {
  if (__DEV__) {
    setDuplicateBannerVisible(false);
    return;
  }

  try {
    chrome.runtime.sendMessage(
      { type: DUPLICATE_STATUS_REQUEST_MESSAGE },
      (response?: DuplicateStatusResponse) => {
        try {
          if (chrome.runtime.lastError) return;
        } catch {
          return;
        }

        setDuplicateBannerVisible(
          response?.ok === true && response.data.duplicateDetected === true,
        );
      },
    );
  } catch {
    setDuplicateBannerVisible(false);
  }
}

function listenForDuplicateStatus(): void {
  try {
    chrome.runtime.onMessage.addListener((message: DuplicateStatusChangedMessage) => {
      if (message.type === DUPLICATE_STATUS_CHANGED_MESSAGE) {
        refreshDuplicateStatus();
      }
    });
  } catch {
    // The popup is short-lived; missing live updates are non-critical.
  }
}

refreshDuplicateStatus();
listenForDuplicateStatus();

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

// ── Host permission prompt ────────────────────────────────────────────────────
// Firefox MV3 treats host_permissions as user-controlled — even on AMO installs
// the user may need to grant access to tv.youtube.com before content scripts
// inject. Chrome and other Chromium-based browsers auto-grant, so this UI is
// scoped to Firefox-based browsers via the project's existing typeof shim.

if (typeof browser !== 'undefined') {
  const ORIGIN   = '*://tv.youtube.com/*';
  const perms    = browser.permissions;
  const banner   = document.getElementById('permission-banner') as HTMLDivElement;
  const grantBtn = document.getElementById('grant-permission')  as HTMLButtonElement;

  banner.hidden = await perms.contains({ origins: [ORIGIN] });

  grantBtn.addEventListener('click', async () => {
    const granted = await perms.request({ origins: [ORIGIN] });
    if (granted) banner.hidden = true;
  });
}
