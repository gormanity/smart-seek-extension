/**
 * seek-controller.js — Content script for YTTV Seek Extension.
 *
 * Runs on tv.youtube.com. Dynamically imports seek-logic.js (declared as a
 * web-accessible resource) so the logic can be shared with tests without a
 * build step.
 */
(async function () {
  const { DEFAULT_SETTINGS, matchesKey, applySeek } = await import(
    chrome.runtime.getURL('src/content/seek-logic.js')
  );

  // Prefer browser (Firefox) API, fall back to chrome (Chrome).
  const storageSync = (typeof browser !== 'undefined' ? browser : chrome).storage.sync;

  // Load user settings, merging over defaults.
  let settings;
  try {
    settings = await storageSync.get(DEFAULT_SETTINGS);
  } catch (_) {
    settings = { ...DEFAULT_SETTINGS };
  }

  document.addEventListener('keydown', function handleKeyDown(event) {
    // Ignore events that originate from text inputs.
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable) {
      return;
    }

    const isBack    = matchesKey(event, settings.backKey);
    const isForward = matchesKey(event, settings.forwardKey);

    if (!isBack && !isForward) return;

    const video = document.querySelector('video');
    if (!video) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    applySeek(video, isForward ? settings.seekAmount : -settings.seekAmount);
  }, /* capture */ true);

  // Re-apply settings when the user saves from the options page.
  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === 'settings-updated') {
      Object.assign(settings, msg.settings);
    }
  });
}());
