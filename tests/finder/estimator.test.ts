import { describe, it, expect } from 'vitest';
import { estimateAttempts } from '@/finder/estimator.js';
import type { DesiredTraits } from '@/types.js';

function makeDesired(overrides: Partial<DesiredTraits> = {}): DesiredTraits {
  return {
    species: 'duck',
    rarity: 'common',
    eye: '·',
    hat: 'none',
    shiny: false,
    peak: null,
    dump: null,
    ...overrides,
  };
}

describe('estimateAttempts', () => {
  it('returns a positive number', () => {
    expect(estimateAttempts(makeDesired())).toBeGreaterThan(0);
  });

  it('common is easier than legendary', () => {
    const common = estimateAttempts(makeDesired({ rarity: 'common' }));
    const legendary = estimateAttempts(makeDesired({ rarity: 'legendary' }));
    expect(legendary).toBeGreaterThan(common);
  });

  it('shiny multiplies expected attempts by ~100', () => {
    const normal = estimateAttempts(makeDesired());
    const shiny = estimateAttempts(makeDesired({ shiny: true }));
    expect(shiny / normal).toBeCloseTo(100, 0);
  });

  it('peak stat multiplies expected attempts by ~5', () => {
    const normal = estimateAttempts(makeDesired());
    const withPeak = estimateAttempts(makeDesired({ peak: 'DEBUGGING' }));
    expect(withPeak / normal).toBeCloseTo(5, 0);
  });

  it('non-common hats multiply by ~8', () => {
    const commonNoHat = estimateAttempts(makeDesired({ rarity: 'common', hat: 'none' }));
    const rareWithHat = estimateAttempts(makeDesired({ rarity: 'rare', hat: 'crown' }));
    // rare is 10% vs common 60%, so ratio should account for both rarity and hat
    const rarityFactor = 60 / 10;
    const hatFactor = 8;
    expect(rareWithHat / commonNoHat).toBeCloseTo(rarityFactor * hatFactor, -1);
  });
});
