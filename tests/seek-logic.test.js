import { describe, it, expect } from 'vitest';
import { parseKey, matchesKey, applySeek, formatSeekLabel, isValidKeyString, DEFAULT_SETTINGS } from '../src/content/seek-logic.js';

describe('parseKey', () => {
  it('parses a bare key with no modifiers', () => {
    expect(parseKey('J')).toEqual({ key: 'J', shift: false, ctrl: false, alt: false, meta: false });
  });

  it('parses Shift+J', () => {
    expect(parseKey('Shift+J')).toEqual({ key: 'J', shift: true, ctrl: false, alt: false, meta: false });
  });

  it('parses Shift+L', () => {
    expect(parseKey('Shift+L')).toEqual({ key: 'L', shift: true, ctrl: false, alt: false, meta: false });
  });

  it('parses multiple modifiers', () => {
    expect(parseKey('Ctrl+Shift+K')).toEqual({ key: 'K', shift: true, ctrl: true, alt: false, meta: false });
  });

  it('normalizes lowercase modifier names', () => {
    expect(parseKey('shift+J')).toEqual(parseKey('Shift+J'));
  });

  it('normalizes lowercase key to uppercase when shift is present and key is alphabetic', () => {
    expect(parseKey('Shift+j')).toEqual(parseKey('Shift+J'));
  });

  it('recognizes Ctrl alias Control', () => {
    expect(parseKey('Control+K')).toEqual(parseKey('Ctrl+K'));
  });

  it('recognizes Meta alias Cmd', () => {
    expect(parseKey('Cmd+K')).toEqual(parseKey('Meta+K'));
  });
});

describe('matchesKey', () => {
  function fakeEvent(key, { shiftKey = false, ctrlKey = false, altKey = false, metaKey = false } = {}) {
    return { key, shiftKey, ctrlKey, altKey, metaKey };
  }

  it('matches the default back key (Shift+J)', () => {
    expect(matchesKey(fakeEvent('J', { shiftKey: true }), 'Shift+J')).toBe(true);
  });

  it('matches the default forward key (Shift+L)', () => {
    expect(matchesKey(fakeEvent('L', { shiftKey: true }), 'Shift+L')).toBe(true);
  });

  it('does not match when shift is missing', () => {
    expect(matchesKey(fakeEvent('j'), 'Shift+J')).toBe(false);
  });

  it('does not match a different key', () => {
    expect(matchesKey(fakeEvent('K', { shiftKey: true }), 'Shift+J')).toBe(false);
  });

  it('does not match when an extra modifier is pressed', () => {
    expect(matchesKey(fakeEvent('J', { shiftKey: true, ctrlKey: true }), 'Shift+J')).toBe(false);
  });

  it('matches a bare key with no modifiers', () => {
    // Without shift, the browser reports lowercase 'j'
    expect(matchesKey(fakeEvent('j'), 'j')).toBe(true);
  });

  it('does not match bare key when shift is also pressed', () => {
    // With shift, the browser reports uppercase 'J'; bare 'j' requires no shift
    expect(matchesKey(fakeEvent('J', { shiftKey: true }), 'j')).toBe(false);
  });
});

describe('applySeek', () => {
  it('seeks forward by the given amount', () => {
    const video = document.createElement('video');
    video.currentTime = 10;
    applySeek(video, 5);
    expect(video.currentTime).toBe(15);
  });

  it('seeks backward by the given amount', () => {
    const video = document.createElement('video');
    video.currentTime = 10;
    applySeek(video, -5);
    expect(video.currentTime).toBe(5);
  });

  it('clamps to 0 when seeking would go negative', () => {
    const video = document.createElement('video');
    video.currentTime = 2;
    applySeek(video, -10);
    expect(video.currentTime).toBe(0);
  });

  it('does not clamp forward seeks', () => {
    const video = document.createElement('video');
    video.currentTime = 100;
    applySeek(video, 30);
    expect(video.currentTime).toBe(130);
  });
});

describe('isValidKeyString', () => {
  it('accepts a plain letter key', () => {
    expect(isValidKeyString('j')).toBe(true);
  });

  it('accepts a shifted letter', () => {
    expect(isValidKeyString('Shift+J')).toBe(true);
  });

  it('accepts a named key like ArrowLeft', () => {
    expect(isValidKeyString('ArrowLeft')).toBe(true);
  });

  it('accepts a function key', () => {
    expect(isValidKeyString('F5')).toBe(true);
  });

  it('accepts multiple modifiers with a key', () => {
    expect(isValidKeyString('Ctrl+Shift+K')).toBe(true);
  });

  it('rejects a bare Shift modifier', () => {
    expect(isValidKeyString('Shift')).toBe(false);
  });

  it('rejects a bare Control modifier', () => {
    expect(isValidKeyString('Control')).toBe(false);
  });

  it('rejects modifiers only (Ctrl+Shift)', () => {
    expect(isValidKeyString('Ctrl+Shift')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidKeyString('')).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isValidKeyString(null)).toBe(false);
    expect(isValidKeyString(undefined)).toBe(false);
  });
});

describe('formatSeekLabel', () => {
  it('formats whole seconds without a decimal', () => {
    expect(formatSeekLabel(5)).toBe('5s');
    expect(formatSeekLabel(15)).toBe('15s');
    expect(formatSeekLabel(30)).toBe('30s');
  });

  it('formats fractional seconds with the decimal preserved', () => {
    expect(formatSeekLabel(2.5)).toBe('2.5s');
    expect(formatSeekLabel(0.5)).toBe('0.5s');
  });

  it('always produces a positive label regardless of sign', () => {
    expect(formatSeekLabel(-5)).toBe('5s');
  });
});

describe('DEFAULT_SETTINGS', () => {
  it('has seekAmount of 5', () => {
    expect(DEFAULT_SETTINGS.seekAmount).toBe(5);
  });

  it('has backKey of Shift+J', () => {
    expect(DEFAULT_SETTINGS.backKey).toBe('Shift+J');
  });

  it('has forwardKey of Shift+L', () => {
    expect(DEFAULT_SETTINGS.forwardKey).toBe('Shift+L');
  });
});
