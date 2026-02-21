/**
 * service-worker.js — Background service worker for YTTV Seek Extension.
 *
 * Responsibilities:
 *   - Write default settings to storage on first install.
 *   - Relay settings-updated messages to content scripts.
 */

import { DEFAULT_SETTINGS } from '../content/seek-logic.js';

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return;

  // Only write defaults if no settings exist yet.
  const existing = await chrome.storage.sync.get(null);
  const merged = { ...DEFAULT_SETTINGS, ...existing };
  await chrome.storage.sync.set(merged);
});

/**
 * When the options page saves new settings, broadcast them to all YTTV tabs
 * so the content script picks them up without requiring a page reload.
 */
chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (!msg || msg.type !== 'save-settings') return;

  chrome.storage.sync.set(msg.settings).then(() => {
    chrome.tabs.query({ url: '*://tv.youtube.com/*' }, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'settings-updated',
          settings: msg.settings,
        }).catch(() => { /* tab may not have content script */ });
      }
    });
    sendResponse({ ok: true });
  });

  return true; // keep message channel open for async sendResponse
});
