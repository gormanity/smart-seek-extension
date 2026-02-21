/**
 * seek-logic.js
 *
 * Pure functions for key parsing and video seeking.
 * Imported directly by tests; loaded as a web-accessible resource and
 * dynamically imported by seek-controller.js in the extension context.
 */

export const DEFAULT_SETTINGS = {
  seekAmount: 5,
  backKey: 'j',
  forwardKey: 'l',
};

/**
 * Parse a human-readable key string into its components.
 *
 * Format: [Modifier+]...Key
 * Modifier names: Shift, Ctrl (or Control), Alt, Meta (or Cmd / Command)
 * Key: any KeyboardEvent.key value (single char or named key)
 *
 * For alphabetic single-char keys, when Shift is present the key is
 * normalized to uppercase, matching what the browser reports in event.key.
 *
 * @param {string} keyString e.g. "Shift+J", "Ctrl+Shift+K", "ArrowLeft"
 * @returns {{ key: string, shift: boolean, ctrl: boolean, alt: boolean, meta: boolean }}
 */
export function parseKey(keyString) {
  const parts = keyString.split('+');
  const mods = { shift: false, ctrl: false, alt: false, meta: false };

  // All but the last part are modifier names.
  for (let i = 0; i < parts.length - 1; i++) {
    switch (parts[i].toLowerCase()) {
      case 'shift':                       mods.shift = true; break;
      case 'ctrl':
      case 'control':                     mods.ctrl  = true; break;
      case 'alt':                         mods.alt   = true; break;
      case 'meta':
      case 'cmd':
      case 'command':                     mods.meta  = true; break;
    }
  }

  let key = parts[parts.length - 1];

  // Normalize single alphabetic key to uppercase when Shift is set,
  // matching the browser's event.key value for shifted letters.
  if (mods.shift && key.length === 1 && /[a-z]/i.test(key)) {
    key = key.toUpperCase();
  }

  return { key, ...mods };
}

/**
 * Returns true if a KeyboardEvent matches the given key string.
 *
 * @param {KeyboardEvent|{key:string,shiftKey:boolean,ctrlKey:boolean,altKey:boolean,metaKey:boolean}} event
 * @param {string} keyString
 * @returns {boolean}
 */
export function matchesKey(event, keyString) {
  const parsed = parseKey(keyString);
  return (
    event.key      === parsed.key   &&
    !!event.shiftKey === parsed.shift &&
    !!event.ctrlKey  === parsed.ctrl  &&
    !!event.altKey   === parsed.alt   &&
    !!event.metaKey  === parsed.meta
  );
}

const MODIFIER_KEYS = new Set(['shift', 'ctrl', 'control', 'alt', 'meta', 'cmd', 'command']);

/**
 * Returns true if `str` is a valid key binding string — i.e. it ends with a
 * non-modifier key (optionally preceded by one or more modifiers joined by +).
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isValidKeyString(str) {
  if (!str || typeof str !== 'string') return false;
  const parts = str.split('+');
  const key   = parts[parts.length - 1];
  return key.length > 0 && !MODIFIER_KEYS.has(key.toLowerCase());
}

/**
 * Format a seek amount as a display label, e.g. 5 → "5s", 2.5 → "2.5s".
 * Always returns a positive label; direction is conveyed by the OSD layout.
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatSeekLabel(seconds) {
  var n = Math.abs(seconds);
  return (Number.isInteger(n) ? n : n) + 's';
}

/**
 * Seek a video element by `seconds` (positive = forward, negative = backward).
 * Clamps to 0; does not clamp at the upper end (browser handles that).
 *
 * @param {HTMLVideoElement} video
 * @param {number} seconds
 */
export function applySeek(video, seconds) {
  video.currentTime = Math.max(0, video.currentTime + seconds);
}
