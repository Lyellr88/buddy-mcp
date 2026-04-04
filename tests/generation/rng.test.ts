import { describe, it, expect } from 'vitest';
import { mulberry32, pick } from '@/generation/rng.js';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const values1 = Array.from({ length: 10 }, () => rng1());
    const values2 = Array.from({ length: 10 }, () => rng2());
    expect(values1).not.toEqual(values2);
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const rng = mulberry32(99);
    const arr = ['a', 'b', 'c', 'd', 'e'] as const;
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(pick(rng, arr));
    }
  });

  it('is deterministic', () => {
    const arr = ['x', 'y', 'z'] as const;
    const rng1 = mulberry32(7);
    const rng2 = mulberry32(7);
    for (let i = 0; i < 20; i++) {
      expect(pick(rng1, arr)).toBe(pick(rng2, arr));
    }
  });
});
