import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sets up the DOM required by popup.ts and installs a chrome stub.
 * Call vi.resetModules() before this in each beforeEach so that the module
 * re-runs with the fresh DOM and fresh mock on every test.
 */
function setupPopup(seekAmount: number, backKey = 'Shift+J', forwardKey = 'Shift+L') {
  document.body.innerHTML = `
    <span id="amount-value"></span>
    <button id="decrease"></button>
    <button id="increase"></button>
    <span id="back-key"></span>
    <span id="forward-key"></span>
    <button id="open-settings"></button>
  `;

  const mockSet             = vi.fn().mockResolvedValue(undefined);
  const mockOpenOptionsPage = vi.fn();

  (globalThis as Record<string, unknown>).chrome = {
    storage: {
      sync: {
        get: vi.fn().mockResolvedValue({ seekAmount, backKey, forwardKey }),
        set: mockSet,
      },
    },
    runtime: { openOptionsPage: mockOpenOptionsPage },
  };

  return { mockSet, mockOpenOptionsPage };
}

const get = (id: string) => document.getElementById(id)!;
const btn = (id: string) => document.getElementById(id) as HTMLButtonElement;

// ── Tests ──────────────────────────────────────────────────────────────────

describe('popup', () => {

  describe('initial render', () => {
    beforeEach(async () => {
      vi.resetModules();
      setupPopup(5);
      await import('../src/popup/popup.js');
    });

    afterEach(() => { document.body.innerHTML = ''; });

    it('displays the seek amount', () => {
      expect(get('amount-value').textContent).toBe('5');
    });

    it('displays the back key binding', () => {
      expect(get('back-key').textContent).toBe('Shift+J');
    });

    it('displays the forward key binding', () => {
      expect(get('forward-key').textContent).toBe('Shift+L');
    });

    it('decrease button is enabled when above the minimum', () => {
      expect(btn('decrease').disabled).toBe(false);
    });

    it('increase button is enabled when below the maximum', () => {
      expect(btn('increase').disabled).toBe(false);
    });
  });

  describe('decrease button', () => {
    let mockSet: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      vi.resetModules();
      ({ mockSet } = setupPopup(5));
      await import('../src/popup/popup.js');
    });

    afterEach(() => { document.body.innerHTML = ''; });

    it('decrements the displayed amount by 0.5', () => {
      btn('decrease').click();
      expect(get('amount-value').textContent).toBe('4.5');
    });

    it('persists the new amount to storage', () => {
      btn('decrease').click();
      // storage.set is called synchronously before the async function suspends.
      expect(mockSet).toHaveBeenCalledWith({ seekAmount: 4.5 });
    });

    it('allows further decrements after the first click', () => {
      btn('decrease').click();
      btn('decrease').click();
      expect(get('amount-value').textContent).toBe('4');
    });
  });

  describe('increase button', () => {
    let mockSet: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      vi.resetModules();
      ({ mockSet } = setupPopup(5));
      await import('../src/popup/popup.js');
    });

    afterEach(() => { document.body.innerHTML = ''; });

    it('increments the displayed amount by 0.5', () => {
      btn('increase').click();
      expect(get('amount-value').textContent).toBe('5.5');
    });

    it('persists the new amount to storage', () => {
      btn('increase').click();
      expect(mockSet).toHaveBeenCalledWith({ seekAmount: 5.5 });
    });

    it('allows further increments after the first click', () => {
      btn('increase').click();
      btn('increase').click();
      expect(get('amount-value').textContent).toBe('6');
    });
  });

  describe('at the minimum (0.5 s)', () => {
    beforeEach(async () => {
      vi.resetModules();
      setupPopup(0.5);
      await import('../src/popup/popup.js');
    });

    afterEach(() => { document.body.innerHTML = ''; });

    it('decrease button is disabled', () => {
      expect(btn('decrease').disabled).toBe(true);
    });

    it('amount stays at the minimum when decrease is clicked', () => {
      btn('decrease').click();
      expect(get('amount-value').textContent).toBe('0.5');
    });

    it('increase button re-enables the decrease button', () => {
      btn('increase').click();
      expect(btn('decrease').disabled).toBe(false);
    });
  });

  describe('at the maximum (300 s)', () => {
    beforeEach(async () => {
      vi.resetModules();
      setupPopup(300);
      await import('../src/popup/popup.js');
    });

    afterEach(() => { document.body.innerHTML = ''; });

    it('increase button is disabled', () => {
      expect(btn('increase').disabled).toBe(true);
    });

    it('amount stays at the maximum when increase is clicked', () => {
      btn('increase').click();
      expect(get('amount-value').textContent).toBe('300');
    });

    it('decrease button re-enables the increase button', () => {
      btn('decrease').click();
      expect(btn('increase').disabled).toBe(false);
    });
  });

  describe('open settings button', () => {
    let mockOpenOptionsPage: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      vi.resetModules();
      ({ mockOpenOptionsPage } = setupPopup(5));
      await import('../src/popup/popup.js');
    });

    afterEach(() => { document.body.innerHTML = ''; });

    it('calls chrome.runtime.openOptionsPage', () => {
      btn('open-settings').click();
      expect(mockOpenOptionsPage).toHaveBeenCalled();
    });
  });

});
