/**
 * service-worker.js — Background service worker for YTTV Seek Extension.
 *
 * Responsibilities:
 *   - Write default settings to storage on first install.
 *   - Relay settings-updated messages to content scripts.
 */

import { DEFAULT_SETTINGS } from '../content/seek-logic.js';

// Previous default key bindings — used to migrate users who still have the
// old values stored and haven't explicitly customised them.
const PREVIOUS_DEFAULTS = {
  backKey:    'j',
  forwardKey: 'l',
};

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    return;
  }

  if (reason === 'update') {
    const existing = await chrome.storage.sync.get(null);
    // Migrate keys that are still at a previous default to the current default.
    for (const key of ['backKey', 'forwardKey']) {
      if (existing[key] === PREVIOUS_DEFAULTS[key]) {
        existing[key] = DEFAULT_SETTINGS[key];
      }
    }
    // Fill in any missing keys with current defaults.
    await chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...existing });
  }
});

