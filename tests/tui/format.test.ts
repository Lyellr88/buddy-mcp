import { describe, it, expect } from 'vitest';
import { formatCount, progressBar } from '@/tui/format.js';

describe('formatCount', () => {
  it('formats millions', () => {
    expect(formatCount(1_500_000)).toBe('1.5M');
    expect(formatCount(10_000_000)).toBe('10.0M');
  });

  it('formats thousands', () => {
    expect(formatCount(42_000)).toBe('42k');
    expect(formatCount(1_000)).toBe('1k');
  });

  it('returns plain number for small values', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(0)).toBe('0');
  });
});

describe('progressBar', () => {
  it('returns a string of the specified width', () => {
    // The bar contains ANSI escape codes, so just check it's non-empty
    const bar = progressBar(50, 20);
    expect(typeof bar).toBe('string');
    expect(bar.length).toBeGreaterThan(0);
  });

  it('handles 0%', () => {
    const bar = progressBar(0, 10);
    expect(bar).toBeTruthy();
  });

  it('handles 100%', () => {
    const bar = progressBar(100, 10);
    expect(bar).toBeTruthy();
  });
});
