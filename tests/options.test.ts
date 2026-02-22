import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateSeekAmount, formatKeyString, initOptionsPage } from '../src/options/options.js';

describe('validateSeekAmount', () => {
  it('accepts valid positive integers', () => {
    expect(validateSeekAmount(5)).toBe(5);
    expect(validateSeekAmount(1)).toBe(1);
    expect(validateSeekAmount(30)).toBe(30);
  });

  it('accepts valid positive floats', () => {
    expect(validateSeekAmount(2.5)).toBe(2.5);
  });

  it('rounds to one decimal place', () => {
    expect(validateSeekAmount(5.3247)).toBe(5.3);
    expect(validateSeekAmount(1.25)).toBe(1.3);
    expect(validateSeekAmount(10.99)).toBe(11);
  });

  it('coerces numeric strings', () => {
    expect(validateSeekAmount('10')).toBe(10);
  });

  it('throws for zero', () => {
    expect(() => validateSeekAmount(0)).toThrow();
  });

  it('throws for negative numbers', () => {
    expect(() => validateSeekAmount(-1)).toThrow();
    expect(() => validateSeekAmount(-0.1)).toThrow();
  });

  it('throws for non-numeric strings', () => {
    expect(() => validateSeekAmount('five')).toThrow();
    expect(() => validateSeekAmount('')).toThrow();
  });

  it('throws for values above 300 seconds', () => {
    expect(() => validateSeekAmount(301)).toThrow();
  });

  it('accepts 300 exactly', () => {
    expect(validateSeekAmount(300)).toBe(300);
  });
});

describe('formatKeyString', () => {
  it('formats a bare key event with no modifiers', () => {
    const event = { key: 'j', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false };
    expect(formatKeyString(event)).toBe('j');
  });

  it('formats Shift+J', () => {
    const event = { key: 'J', shiftKey: true, ctrlKey: false, altKey: false, metaKey: false };
    expect(formatKeyString(event)).toBe('Shift+J');
  });

  it('formats Ctrl+Shift+K', () => {
    const event = { key: 'K', shiftKey: true, ctrlKey: true, altKey: false, metaKey: false };
    expect(formatKeyString(event)).toBe('Ctrl+Shift+K');
  });

  it('formats Alt+J', () => {
    const event = { key: 'J', shiftKey: false, ctrlKey: false, altKey: true, metaKey: false };
    expect(formatKeyString(event)).toBe('Alt+J');
  });

  it('formats Meta+K', () => {
    const event = { key: 'K', shiftKey: false, ctrlKey: false, altKey: false, metaKey: true };
    expect(formatKeyString(event)).toBe('Meta+K');
  });

  it('orders modifiers: Ctrl, Alt, Shift, Meta', () => {
    const event = { key: 'J', shiftKey: true, ctrlKey: true, altKey: true, metaKey: true };
    expect(formatKeyString(event)).toBe('Ctrl+Alt+Shift+Meta+J');
  });
});

// ── Options page DOM ──────────────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <input id="seek-amount" type="number" />
    <input id="back-key"    type="text" />
    <input id="forward-key" type="text" />
    <button id="save"></button>
    <button id="reset"></button>
    <span id="status"></span>
    <span id="error"></span>
  `;
}

function installChrome(seekAmount = 5, backKey = 'Shift+J', forwardKey = 'Shift+L') {
  const mockSet = vi.fn().mockResolvedValue(undefined);
  const mockGet = vi.fn().mockResolvedValue({ seekAmount, backKey, forwardKey });
  (globalThis as Record<string, unknown>).chrome = {
    storage: { sync: { get: mockGet, set: mockSet } },
  };
  return { mockSet, mockGet };
}

const inp = (id: string) => document.getElementById(id) as HTMLInputElement;
const el  = (id: string) => document.getElementById(id)!;

function keydown(target: HTMLElement, key: string, mods: Partial<KeyboardEventInit> = {}) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods }),
  );
}

describe('options page DOM', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  // ── loadSettings ────────────────────────────────────────────────────────────

  describe('loadSettings', () => {
    it('populates seek-amount from storage', async () => {
      buildDOM();
      installChrome(10);
      await initOptionsPage();
      expect(inp('seek-amount').value).toBe('10');
    });

    it('populates back-key from storage', async () => {
      buildDOM();
      installChrome(5, 'Ctrl+B');
      await initOptionsPage();
      expect(inp('back-key').value).toBe('Ctrl+B');
    });

    it('populates forward-key from storage', async () => {
      buildDOM();
      installChrome(5, 'Shift+J', 'Ctrl+F');
      await initOptionsPage();
      expect(inp('forward-key').value).toBe('Ctrl+F');
    });

    it('falls back to defaults when storage throws', async () => {
      buildDOM();
      (globalThis as Record<string, unknown>).chrome = {
        storage: {
          sync: {
            get: vi.fn().mockRejectedValue(new Error('storage error')),
            set: vi.fn(),
          },
        },
      };
      await initOptionsPage();
      expect(inp('seek-amount').value).toBe('5');
      expect(inp('back-key').value).toBe('Shift+J');
      expect(inp('forward-key').value).toBe('Shift+L');
    });
  });

  // ── seek-amount blur rounding ────────────────────────────────────────────────

  describe('seek-amount blur rounding', () => {
    beforeEach(async () => {
      buildDOM();
      installChrome(5);
      await initOptionsPage();
    });

    it('rounds to one decimal place on blur', () => {
      inp('seek-amount').value = '5.37';
      inp('seek-amount').dispatchEvent(new Event('blur'));
      expect(inp('seek-amount').value).toBe('5.4');
    });

    it('does not alter an already-rounded value on blur', () => {
      inp('seek-amount').value = '10';
      inp('seek-amount').dispatchEvent(new Event('blur'));
      expect(inp('seek-amount').value).toBe('10');
    });

    it('does not round a zero value on blur', () => {
      inp('seek-amount').value = '0';
      inp('seek-amount').dispatchEvent(new Event('blur'));
      expect(inp('seek-amount').value).toBe('0');
    });
  });

  // ── key capture inputs ───────────────────────────────────────────────────────

  describe('key capture inputs', () => {
    beforeEach(async () => {
      buildDOM();
      installChrome(5);
      await initOptionsPage();
    });

    it('adds is-listening class on focus', () => {
      inp('back-key').dispatchEvent(new FocusEvent('focus'));
      expect(inp('back-key').classList.contains('is-listening')).toBe(true);
    });

    it('removes is-listening class on blur', () => {
      inp('back-key').dispatchEvent(new FocusEvent('focus'));
      inp('back-key').dispatchEvent(new FocusEvent('blur'));
      expect(inp('back-key').classList.contains('is-listening')).toBe(false);
    });

    it('fills back-key with the pressed key', () => {
      keydown(inp('back-key'), 'j', { shiftKey: true });
      expect(inp('back-key').value).toBe('Shift+j');
    });

    it('fills forward-key with the pressed key', () => {
      keydown(inp('forward-key'), 'l', { shiftKey: true });
      expect(inp('forward-key').value).toBe('Shift+l');
    });

    it('restores the previous value on Escape', () => {
      inp('back-key').value = 'Shift+J';
      inp('back-key').dispatchEvent(new FocusEvent('focus'));
      keydown(inp('back-key'), 'Escape');
      expect(inp('back-key').value).toBe('Shift+J');
    });

    it('ignores bare modifier key presses', () => {
      inp('back-key').value = 'Shift+J';
      keydown(inp('back-key'), 'Shift', { shiftKey: true });
      expect(inp('back-key').value).toBe('Shift+J');
    });

    it('prevents default on keydown', () => {
      const event = new KeyboardEvent('keydown', { key: 'j', bubbles: true, cancelable: true });
      inp('back-key').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('prevents paste', () => {
      const event = new Event('paste', { bubbles: true, cancelable: true });
      inp('back-key').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  // ── save button ──────────────────────────────────────────────────────────────

  describe('save button', () => {
    let mockSet: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      buildDOM();
      ({ mockSet } = installChrome(5, 'Shift+J', 'Shift+L'));
      await initOptionsPage();
    });

    it('writes valid settings to storage', () => {
      el('save').click();
      expect(mockSet).toHaveBeenCalledWith({ seekAmount: 5, backKey: 'Shift+J', forwardKey: 'Shift+L' });
    });

    it('shows "Settings saved." after a successful save', async () => {
      el('save').click();
      await Promise.resolve();
      expect(el('status').textContent).toBe('Settings saved.');
    });

    it('clears "Settings saved." after 2 seconds', async () => {
      vi.useFakeTimers();
      try {
        el('save').click();
        await Promise.resolve();
        expect(el('status').textContent).toBe('Settings saved.');
        vi.advanceTimersByTime(2001);
        expect(el('status').textContent).toBe('');
      } finally {
        vi.useRealTimers();
      }
    });

    it('shows an error for an invalid seek amount', () => {
      inp('seek-amount').value = '-1';
      el('save').click();
      expect(el('error').textContent).not.toBe('');
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('shows an error when back and forward keys are identical', () => {
      inp('back-key').value    = 'Shift+J';
      inp('forward-key').value = 'Shift+J';
      el('save').click();
      expect(el('error').textContent).not.toBe('');
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('shows an error for an empty key binding', () => {
      inp('back-key').value = '';
      el('save').click();
      expect(el('error').textContent).not.toBe('');
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('clears a previous error at the start of each save attempt', () => {
      inp('seek-amount').value = '-1';
      el('save').click();
      expect(el('error').textContent).not.toBe('');
      inp('seek-amount').value = '5';
      el('save').click();
      expect(el('error').textContent).toBe('');
    });
  });

  // ── reset button ─────────────────────────────────────────────────────────────

  describe('reset button', () => {
    beforeEach(async () => {
      buildDOM();
      installChrome(30, 'Ctrl+B', 'Ctrl+F');
      await initOptionsPage();
    });

    it('resets seek-amount to the default', () => {
      expect(inp('seek-amount').value).toBe('30');
      el('reset').click();
      expect(inp('seek-amount').value).toBe('5');
    });

    it('resets back-key to the default', () => {
      expect(inp('back-key').value).toBe('Ctrl+B');
      el('reset').click();
      expect(inp('back-key').value).toBe('Shift+J');
    });

    it('resets forward-key to the default', () => {
      expect(inp('forward-key').value).toBe('Ctrl+F');
      el('reset').click();
      expect(inp('forward-key').value).toBe('Shift+L');
    });

    it('clears error and status messages', () => {
      el('error').textContent  = 'some error';
      el('status').textContent = 'Settings saved.';
      el('reset').click();
      expect(el('error').textContent).toBe('');
      expect(el('status').textContent).toBe('');
    });
  });
});
