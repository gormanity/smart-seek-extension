import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

// ── Chrome stub ────────────────────────────────────────────────────────────
// Must be set on globalThis before the module is imported so the content
// script finds `chrome` when it runs its module-level initialisation code.

type OnChangedCb = (
  changes: Record<string, { newValue: unknown }>,
  area: string,
) => void;

// Captured by the addListener stub so tests can trigger settings updates.
let onChangedCallback: OnChangedCb = () => {};

const chromeMock = {
  storage: {
    sync: {
      get: vi.fn().mockResolvedValue({
        seekAmount: 5,
        backKey: 'Shift+J',
        forwardKey: 'Shift+L',
      }),
    },
    onChanged: {
      addListener: vi.fn((cb: OnChangedCb) => { onChangedCallback = cb; }),
    },
  },
};

(globalThis as Record<string, unknown>).chrome = chromeMock;

// ── Import seek-controller once ────────────────────────────────────────────
// The module registers a keydown listener and calls storage.get on load.
// Importing it multiple times would stack listeners, so we do it once per file.

beforeAll(async () => {
  await import('../src/content/seek-controller.js');
  // Flush the storage.get().then() microtask so settings are applied.
  await Promise.resolve();
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeVideo({
  paused    = true,
  readyState = 0,
  duration  = 0,
  currentTime = 10,
} = {}): HTMLVideoElement {
  const v = document.createElement('video');
  Object.defineProperty(v, 'paused',     { get: () => paused,     configurable: true });
  Object.defineProperty(v, 'readyState', { get: () => readyState, configurable: true });
  Object.defineProperty(v, 'duration',   { get: () => duration,   configurable: true });
  v.currentTime = currentTime;
  document.body.appendChild(v);
  return v;
}

function fireKey(
  key: string,
  opts: { shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  document.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.querySelectorAll('video').forEach(el => el.remove());
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('seek-controller', () => {

  describe('seek backward', () => {
    it('Shift+J seeks back by the seek amount', () => {
      const video = makeVideo({ currentTime: 10 });
      fireKey('J', { shiftKey: true });
      expect(video.currentTime).toBe(5);
    });

    it('Shift+ArrowLeft (hardcoded) seeks back', () => {
      const video = makeVideo({ currentTime: 10 });
      fireKey('ArrowLeft', { shiftKey: true });
      expect(video.currentTime).toBe(5);
    });

    it('clamps to 0 when seeking before the start', () => {
      const video = makeVideo({ currentTime: 2 });
      fireKey('J', { shiftKey: true });
      expect(video.currentTime).toBe(0);
    });
  });

  describe('seek forward', () => {
    it('Shift+L seeks forward by the seek amount', () => {
      const video = makeVideo({ currentTime: 10 });
      fireKey('L', { shiftKey: true });
      expect(video.currentTime).toBe(15);
    });

    it('Shift+ArrowRight (hardcoded) seeks forward', () => {
      const video = makeVideo({ currentTime: 10 });
      fireKey('ArrowRight', { shiftKey: true });
      expect(video.currentTime).toBe(15);
    });
  });

  describe('unhandled keys', () => {
    it('ignores unrecognised keys', () => {
      const video = makeVideo({ currentTime: 10 });
      fireKey('k');
      expect(video.currentTime).toBe(10);
    });

    it('ignores the base key without the required modifier', () => {
      const video = makeVideo({ currentTime: 10 });
      fireKey('j'); // no Shift
      expect(video.currentTime).toBe(10);
    });
  });

  describe('input element guard', () => {
    afterEach(() => {
      // Remove any own `activeElement` override placed on the document instance.
      delete (document as unknown as Record<string, unknown>).activeElement;
      document.querySelectorAll('input, textarea').forEach(el => el.remove());
    });

    it('ignores keypresses when an INPUT is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      const video = makeVideo({ currentTime: 10 });
      fireKey('J', { shiftKey: true });
      expect(video.currentTime).toBe(10);
    });

    it('ignores keypresses when a TEXTAREA is focused', () => {
      const ta = document.createElement('textarea');
      document.body.appendChild(ta);
      ta.focus();
      const video = makeVideo({ currentTime: 10 });
      fireKey('J', { shiftKey: true });
      expect(video.currentTime).toBe(10);
    });

    it('ignores keypresses when a contenteditable element is focused', () => {
      // Document.prototype.activeElement is non-configurable in jsdom so
      // vi.spyOn cannot replace it.  Define an own property on the document
      // instance instead — it shadows the prototype getter for the duration
      // of this test, and afterEach deletes it.
      const div = document.createElement('div');
      Object.defineProperty(div, 'isContentEditable', { get: () => true, configurable: true });
      Object.defineProperty(document, 'activeElement', { get: () => div, configurable: true });
      const video = makeVideo({ currentTime: 10 });
      fireKey('J', { shiftKey: true });
      expect(video.currentTime).toBe(10);
    });
  });

  describe('with no video elements', () => {
    it('does not throw', () => {
      expect(() => fireKey('J', { shiftKey: true })).not.toThrow();
    });

    it('does not call preventDefault when there is no video to seek', () => {
      const event = new KeyboardEvent('keydown', { key: 'J', shiftKey: true, bubbles: true, cancelable: true });
      vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('video selection priority', () => {
    it('prefers a playing and ready video over all others', () => {
      const idle    = makeVideo({ currentTime: 10, paused: true,  readyState: 0 });
      const playing = makeVideo({ currentTime: 20, paused: false, readyState: 3 });
      fireKey('L', { shiftKey: true });
      expect(playing.currentTime).toBe(25);
      expect(idle.currentTime).toBe(10);
    });

    it('falls back to a ready-with-duration video when none are playing', () => {
      const notReady = makeVideo({ currentTime: 10, paused: true, readyState: 0 });
      const ready    = makeVideo({ currentTime: 20, paused: true, readyState: 3, duration: 60 });
      fireKey('L', { shiftKey: true });
      expect(ready.currentTime).toBe(25);
      expect(notReady.currentTime).toBe(10);
    });

    it('falls back to the first video when none are ready', () => {
      const first  = makeVideo({ currentTime: 10 });
      const second = makeVideo({ currentTime: 20 });
      fireKey('L', { shiftKey: true });
      expect(first.currentTime).toBe(15);
      expect(second.currentTime).toBe(20);
    });
  });

  describe('OSD', () => {
    it('creates an OSD element in the document body on first seek', () => {
      makeVideo();
      fireKey('L', { shiftKey: true });
      expect(document.querySelector('.yttv-seek-osd')).not.toBeNull();
    });

    it('applies the --forward modifier class on a forward seek', () => {
      makeVideo();
      fireKey('L', { shiftKey: true });
      expect(document.querySelector('.yttv-seek-osd')!.classList.contains('yttv-seek-osd--forward')).toBe(true);
    });

    it('removes the --forward modifier class on a backward seek', () => {
      makeVideo();
      fireKey('J', { shiftKey: true });
      expect(document.querySelector('.yttv-seek-osd')!.classList.contains('yttv-seek-osd--forward')).toBe(false);
    });

    it('displays the current seek amount in the label', () => {
      makeVideo();
      fireKey('L', { shiftKey: true });
      expect(document.querySelector('.yttv-seek-osd__label')!.textContent).toBe('5');
    });
  });

  describe('event propagation', () => {
    it('calls preventDefault and stopImmediatePropagation for handled keys', () => {
      makeVideo();
      const event = new KeyboardEvent('keydown', { key: 'J', shiftKey: true, bubbles: true, cancelable: true });
      vi.spyOn(event, 'preventDefault');
      vi.spyOn(event, 'stopImmediatePropagation');
      document.dispatchEvent(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopImmediatePropagation).toHaveBeenCalled();
    });

    it('does not call preventDefault for unhandled keys', () => {
      makeVideo();
      const event = new KeyboardEvent('keydown', { key: 'k', bubbles: true, cancelable: true });
      vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('live settings via storage.onChanged', () => {
    afterEach(() => {
      // Restore the default seek amount after each test in this block.
      onChangedCallback({ seekAmount: { newValue: 5 } }, 'sync');
    });

    it('updates the seek distance when seekAmount changes', () => {
      onChangedCallback({ seekAmount: { newValue: 15 } }, 'sync');
      const video = makeVideo({ currentTime: 20 });
      fireKey('L', { shiftKey: true });
      expect(video.currentTime).toBe(35);
    });

    it('reflects updated seek amount in the OSD label', () => {
      onChangedCallback({ seekAmount: { newValue: 10 } }, 'sync');
      makeVideo({ currentTime: 20 });
      fireKey('L', { shiftKey: true });
      expect(document.querySelector('.yttv-seek-osd__label')!.textContent).toBe('10');
    });

    it('ignores changes from non-sync storage areas', () => {
      onChangedCallback({ seekAmount: { newValue: 99 } }, 'local');
      const video = makeVideo({ currentTime: 20 });
      fireKey('L', { shiftKey: true });
      expect(video.currentTime).toBe(25); // still uses default 5s
    });

    it('ignores unknown storage keys', () => {
      // Should not throw or corrupt settings.
      expect(() => onChangedCallback({ unknownKey: { newValue: 'x' } }, 'sync')).not.toThrow();
      const video = makeVideo({ currentTime: 10 });
      fireKey('L', { shiftKey: true });
      expect(video.currentTime).toBe(15);
    });
  });

});
