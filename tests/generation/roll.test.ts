import { describe, it, expect } from 'vitest';
import { rollRarity, rollFrom, roll } from '@/generation/roll.js';
import { mulberry32 } from '@/generation/rng.js';
import { RARITIES, SPECIES, EYES, HATS, STAT_NAMES } from '@/constants.js';

describe('rollRarity', () => {
  it('returns a valid rarity', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const rarity = rollRarity(rng);
      expect(RARITIES).toContain(rarity);
    }
  });

  it('produces roughly correct distribution over many rolls', () => {
    const counts: Record<string, number> = {};
    for (const r of RARITIES) counts[r] = 0;

    const rng = mulberry32(1);
    const n = 10000;
    for (let i = 0; i < n; i++) {
      counts[rollRarity(rng)]++;
    }

    // Common should be ~60%, allow wide tolerance
    expect(counts.common / n).toBeGreaterThan(0.45);
    expect(counts.common / n).toBeLessThan(0.75);
    // Legendary should be ~1%
    expect(counts.legendary / n).toBeLessThan(0.05);
  });
});

describe('rollFrom', () => {
  it('produces deterministic results', () => {
    const r1 = rollFrom(mulberry32(123));
    const r2 = rollFrom(mulberry32(123));
    expect(r1).toEqual(r2);
  });

  it('returns valid bones', () => {
    const result = rollFrom(mulberry32(999));
    expect(RARITIES).toContain(result.bones.rarity);
    expect(SPECIES).toContain(result.bones.species);
    expect(EYES).toContain(result.bones.eye);
    if (result.bones.rarity === 'common') {
      expect(result.bones.hat).toBe('none');
    } else {
      expect(HATS).toContain(result.bones.hat);
    }
    expect(typeof result.bones.shiny).toBe('boolean');
    expect(typeof result.inspirationSeed).toBe('number');
  });

  it('has stats with valid stat names', () => {
    const result = rollFrom(mulberry32(42));
    for (const key of Object.keys(result.bones.stats)) {
      expect(STAT_NAMES).toContain(key);
    }
  });
});

describe('roll', () => {
  it('produces deterministic results for same userId + salt', () => {
    const r1 = roll('test-user', 'test-salt-12345', { useNodeHash: true });
    const r2 = roll('test-user', 'test-salt-12345', { useNodeHash: true });
    expect(r1).toEqual(r2);
  });

  it('produces different results for different salts', () => {
    const r1 = roll('user', 'salt-aaaaaaaaaaaaa', { useNodeHash: true });
    const r2 = roll('user', 'salt-bbbbbbbbbbbbb', { useNodeHash: true });
    // Very unlikely to be identical
    expect(r1.bones.species !== r2.bones.species || r1.bones.rarity !== r2.bones.rarity).toBe(true);
  });
});
