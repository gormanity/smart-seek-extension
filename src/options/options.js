/**
 * options.js
 *
 * Options page for YTTV Seek Extension.
 *
 * Pure exports (validateSeekAmount, formatKeyString) are used by tests.
 * initOptionsPage() wires up the DOM and is called from options.html.
 */

import { DEFAULT_SETTINGS, parseKey, isValidKeyString } from '../content/seek-logic.js';

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
  let settings;
  try {
    settings = await getStorage().get(DEFAULT_SETTINGS);
  } catch (_) {
    settings = { ...DEFAULT_SETTINGS };
  }
  document.getElementById('seek-amount').value = settings.seekAmount;
  document.getElementById('back-key').value    = settings.backKey;
  document.getElementById('forward-key').value = settings.forwardKey;
}

/**
 * Wire up key-capture inputs so pressing a key fills the field.
 * - Adds a `.is-listening` class while the input has focus.
 * - Escape restores the value that was present when focus was gained.
 */
function initKeyInputs() {
  for (const id of ['back-key', 'forward-key']) {
    const input = document.getElementById(id);
    let savedValue = '';

    input.addEventListener('focus', () => {
      savedValue = input.value;
      input.classList.add('is-listening');
    });

    input.addEventListener('blur', () => {
      input.classList.remove('is-listening');
    });

    input.addEventListener('keydown', (event) => {
      event.preventDefault();
      // Bare modifier keypress — keep waiting
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      // Escape — cancel and restore
      if (event.key === 'Escape') {
        input.value = savedValue;
        input.blur();
        return;
      }
      input.value = formatKeyString(event);
      input.blur();
    });

    // Prevent pasting raw text into key capture fields
    input.addEventListener('paste', (event) => event.preventDefault());
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

    if (!isValidKeyString(backKey) || !isValidKeyString(forwardKey)) {
      errEl.textContent = 'Key bindings cannot be empty or modifier-only.';
      return;
    }

    if (backKey === forwardKey) {
      errEl.textContent = 'Back and forward keys must be different.';
      return;
    }

    const newSettings = { seekAmount, backKey, forwardKey };
    await getStorage().set(newSettings);

    status.textContent = 'Settings saved.';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

/**
 * Wire up the reset button to restore defaults without saving.
 */
function initResetButton() {
  document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('seek-amount').value = DEFAULT_SETTINGS.seekAmount;
    document.getElementById('back-key').value    = DEFAULT_SETTINGS.backKey;
    document.getElementById('forward-key').value = DEFAULT_SETTINGS.forwardKey;
    document.getElementById('error').textContent  = '';
    document.getElementById('status').textContent = '';
  });
}

/**
 * Initialize the options page. Called from options.html.
 */
export async function initOptionsPage() {
  await loadSettings();
  initKeyInputs();
  initSaveButton();
  initResetButton();
}
