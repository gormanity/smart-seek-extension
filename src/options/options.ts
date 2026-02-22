/**
 * options.ts
 *
 * Options page for YTTV Seek Extension.
 *
 * Pure exports (validateSeekAmount, formatKeyString) are used by tests.
 * initOptionsPage() wires up the DOM and is called from init.ts.
 */

import { DEFAULT_SETTINGS, parseKey, isValidKeyString } from '../content/seek-logic.js';

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Validate and coerce a seek amount value.
 * Accepts numbers or numeric strings. Must be > 0 and <= 300.
 *
 * @throws {Error} if the value is invalid
 */
export function validateSeekAmount(value: number | string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid seek amount: ${value}. Must be a positive number.`);
  }
  if (n > 300) {
    throw new Error(`Seek amount ${n} exceeds maximum of 300 seconds.`);
  }
  return Math.round(n * 10) / 10;
}

/**
 * Convert a KeyboardEvent (or event-like object) into a canonical key string.
 * Modifier order: Ctrl, Alt, Shift, Meta.
 */
export function formatKeyString(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>
): string {
  const parts: string[] = [];
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

function getStorage(): chrome.storage.SyncStorageArea {
  return (typeof browser !== 'undefined' ? browser : chrome).storage.sync;
}

/**
 * Load settings from storage and populate the form.
 */
async function loadSettings(): Promise<void> {
  let settings: typeof DEFAULT_SETTINGS;
  try {
    settings = await getStorage().get(DEFAULT_SETTINGS);
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
  (document.getElementById('seek-amount') as HTMLInputElement).value = String(settings.seekAmount);
  (document.getElementById('back-key') as HTMLInputElement).value    = settings.backKey;
  (document.getElementById('forward-key') as HTMLInputElement).value = settings.forwardKey;
}

/**
 * Round the seek amount field to one decimal place on blur.
 */
function initSeekAmountInput(): void {
  const input = document.getElementById('seek-amount') as HTMLInputElement;
  input.addEventListener('blur', () => {
    const n = parseFloat(input.value);
    if (Number.isFinite(n) && n > 0) {
      input.value = String(Math.round(n * 10) / 10);
    }
  });
}

/**
 * Wire up key-capture inputs so pressing a key fills the field.
 * - Adds a `.is-listening` class while the input has focus.
 * - Escape restores the value that was present when focus was gained.
 */
function initKeyInputs(): void {
  for (const id of ['back-key', 'forward-key']) {
    const input = document.getElementById(id) as HTMLInputElement;
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
function initSaveButton(): void {
  const status = document.getElementById('status') as HTMLElement;
  const errEl  = document.getElementById('error') as HTMLElement;

  document.getElementById('save')!.addEventListener('click', async () => {
    errEl.textContent  = '';
    status.textContent = '';

    let seekAmount: number;
    try {
      seekAmount = validateSeekAmount((document.getElementById('seek-amount') as HTMLInputElement).value);
    } catch (e) {
      errEl.textContent = (e as Error).message;
      return;
    }

    const backKey    = (document.getElementById('back-key') as HTMLInputElement).value.trim();
    const forwardKey = (document.getElementById('forward-key') as HTMLInputElement).value.trim();

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
function initResetButton(): void {
  document.getElementById('reset')!.addEventListener('click', () => {
    (document.getElementById('seek-amount') as HTMLInputElement).value = String(DEFAULT_SETTINGS.seekAmount);
    (document.getElementById('back-key') as HTMLInputElement).value    = DEFAULT_SETTINGS.backKey;
    (document.getElementById('forward-key') as HTMLInputElement).value = DEFAULT_SETTINGS.forwardKey;
    document.getElementById('error')!.textContent  = '';
    document.getElementById('status')!.textContent = '';
  });
}

/**
 * Initialize the options page. Called from init.ts.
 */
export async function initOptionsPage(): Promise<void> {
  await loadSettings();
  initSeekAmountInput();
  initKeyInputs();
  initSaveButton();
  initResetButton();
}

// Export parseKey so tests/options.test.ts can validate key parsing indirectly;
// the import is used internally above.
export { parseKey };
