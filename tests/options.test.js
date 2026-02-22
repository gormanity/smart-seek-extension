import { describe, it, expect } from 'vitest';
import { validateSeekAmount, formatKeyString } from '../src/options/options.js';

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
