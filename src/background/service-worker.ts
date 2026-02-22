/**
 * service-worker.ts — Background service worker for YTTV Seek Extension.
 *
 * Responsibilities:
 *   - Write default settings to storage on first install.
 *   - Migrate settings on extension update.
 */

import { DEFAULT_SETTINGS } from '../content/seek-logic.js';

// Previous default key bindings — used to migrate users who still have the
// old values stored and haven't explicitly customised them.
const PREVIOUS_DEFAULTS = {
  backKey:    'j',
  forwardKey: 'l',
};

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    return;
  }

  if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    const existing = await chrome.storage.sync.get(null);
    // Migrate keys that are still at a previous default to the current default.
    for (const key of ['backKey', 'forwardKey'] as const) {
      if (existing[key] === PREVIOUS_DEFAULTS[key]) {
        existing[key] = DEFAULT_SETTINGS[key];
      }
    }
    // Fill in any missing keys with current defaults.
    await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...existing });
  }
});
