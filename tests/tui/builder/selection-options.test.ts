import { describe, it, expect } from 'vitest';
import { SPECIES, EYES, RARITIES, HATS, STAT_NAMES } from '@/constants.js';

// Test the option-generation logic that feeds into OpenTUI Select components.
// We import these indirectly via the selection-panel module, but since they
// depend on OpenTUI at runtime, we test the underlying data logic here.

describe('species options', () => {
  it('generates one option per species', () => {
    expect(SPECIES.length).toBe(18);
  });

  it('all species names are non-empty strings', () => {
    for (const s of SPECIES) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe('eye options', () => {
  it('has 6 eye styles', () => {
    expect(EYES.length).toBe(6);
  });

  it('all eyes are single characters or symbols', () => {
    for (const e of EYES) {
      expect(e.length).toBeLessThanOrEqual(2); // some unicode chars take 2 bytes in length
    }
  });
});

describe('rarity options', () => {
  it('has 5 rarities', () => {
    expect(RARITIES.length).toBe(5);
  });

  it('ordered from common to legendary', () => {
    expect(RARITIES[0]).toBe('common');
    expect(RARITIES[4]).toBe('legendary');
  });
});

describe('hat options', () => {
  it('has 8 hats total including none', () => {
    expect(HATS.length).toBe(8);
  });

  it('hat list for selection excludes none', () => {
    const selectable = HATS.filter((h) => h !== 'none');
    expect(selectable.length).toBe(7);
    expect(selectable).not.toContain('none');
  });
});

describe('stat options', () => {
  it('has 5 stats', () => {
    expect(STAT_NAMES.length).toBe(5);
  });

  it('excluding a stat leaves 4', () => {
    const filtered = STAT_NAMES.filter((s) => s !== 'DEBUGGING');
    expect(filtered.length).toBe(4);
    expect(filtered).not.toContain('DEBUGGING');
  });

  it('all stat names are uppercase', () => {
    for (const s of STAT_NAMES) {
      expect(s).toBe(s.toUpperCase());
    }
  });
});
