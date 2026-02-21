/**
 * options.js
 *
 * Options page for YTTV Seek Extension.
 *
 * Pure exports (validateSeekAmount, formatKeyString) are used by tests.
 * initOptionsPage() wires up the DOM and is called from options.html.
 */

import { DEFAULT_SETTINGS, parseKey } from '../content/seek-logic.js';

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Validate and coerce a seek amount value.
 * Accepts numbers or numeric strings. Must be > 0 and <= 300.
 *
 * @param {number|string} value
 * @returns {number}
 * @throws {Error} if the value is invalid
 */
export function validateSeekAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid seek amount: ${value}. Must be a positive number.`);
  }
  if (n > 300) {
    throw new Error(`Seek amount ${n} exceeds maximum of 300 seconds.`);
  }
  return n;
}

/**
 * Convert a KeyboardEvent (or event-like object) into a canonical key string.
 * Modifier order: Ctrl, Alt, Shift, Meta.
 *
 * @param {{key:string, shiftKey:boolean, ctrlKey:boolean, altKey:boolean, metaKey:boolean}} event
 * @returns {string} e.g. "Shift+J", "Ctrl+Alt+K"
 */
export function formatKeyString(event) {
  const parts = [];
  if (event.ctrlKey)  parts.push('Ctrl');
  if (event.altKey)   parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey)  parts.push('Meta');
  parts.push(event.key);
  return parts.join('+');
}

// ---------------------------------------------------------------------------
// Options page UI
// ---------------------------------------------------------------------------

function getStorage() {
  return (typeof browser !== 'undefined' ? browser : chrome).storage.sync;
}

/**
 * Load settings from storage and populate the form.
 */
async function loadSettings() {
  const settings = await getStorage().get(DEFAULT_SETTINGS);
  document.getElementById('seek-amount').value = settings.seekAmount;
  document.getElementById('back-key').value    = settings.backKey;
  document.getElementById('forward-key').value = settings.forwardKey;
}

/**
 * Wire up key-capture inputs so pressing a key fills the field.
 */
function initKeyInputs() {
  for (const id of ['back-key', 'forward-key']) {
    const input = document.getElementById(id);
    input.addEventListener('keydown', (event) => {
      event.preventDefault();
      // Ignore bare modifier keypresses
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      input.value = formatKeyString(event);
    });
  }
}

/**
 * Wire up the save button.
 */
function initSaveButton() {
  const status  = document.getElementById('status');
  const errEl   = document.getElementById('error');

  document.getElementById('save').addEventListener('click', async () => {
    errEl.textContent   = '';
    status.textContent  = '';

    let seekAmount;
    try {
      seekAmount = validateSeekAmount(document.getElementById('seek-amount').value);
    } catch (e) {
      errEl.textContent = e.message;
      return;
    }

    const backKey    = document.getElementById('back-key').value.trim();
    const forwardKey = document.getElementById('forward-key').value.trim();

    if (!backKey || !forwardKey) {
      errEl.textContent = 'Key bindings cannot be empty.';
      return;
    }

    if (backKey === forwardKey) {
      errEl.textContent = 'Back and forward keys must be different.';
      return;
    }

    await getStorage().set({ seekAmount, backKey, forwardKey });
    status.textContent = 'Settings saved.';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

/**
 * Initialize the options page. Called from options.html.
 */
export async function initOptionsPage() {
  await loadSettings();
  initKeyInputs();
  initSaveButton();
}
