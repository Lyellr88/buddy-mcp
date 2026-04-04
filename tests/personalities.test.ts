import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PERSONALITIES,
  REMARKS,
  GOOSE_REMARKS,
  getExtremeTraits,
  getPersonalityRemark,
} from '@/personalities.js';
import { SPECIES, STAT_NAMES } from '@/constants.js';
import type { ProfileData } from '@/types.js';

// Minimal ProfileData factory for tests
function makeProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    species: 'duck',
    rarity: 'common',
    eye: 'normal',
    hat: 'none',
    shiny: false,
    stats: { DEBUGGING: 50, PATIENCE: 50, CHAOS: 50, WISDOM: 50, SNARK: 50 },
    peak: false,
    ...overrides,
  };
}

describe('DEFAULT_PERSONALITIES', () => {
  it('has an entry for every species', () => {
    for (const species of SPECIES) {
      expect(DEFAULT_PERSONALITIES[species], `missing personality for ${species}`).toBeTruthy();
    }
  });

  it('all descriptions are non-empty strings', () => {
    for (const [species, desc] of Object.entries(DEFAULT_PERSONALITIES)) {
      expect(typeof desc, species).toBe('string');
      expect(desc.length, species).toBeGreaterThan(0);
    }
  });
});

describe('REMARKS', () => {
  it('has entries for all stat names', () => {
    for (const stat of STAT_NAMES) {
      expect(REMARKS[stat], `missing remarks for ${stat}`).toBeDefined();
      expect(REMARKS[stat]!.length).toBeGreaterThan(0);
    }
  });

  it('all remark pools contain only non-empty strings', () => {
    for (const [stat, pool] of Object.entries(REMARKS)) {
      for (const remark of pool) {
        expect(typeof remark, `bad remark in ${stat}`).toBe('string');
        expect(remark.length, `empty remark in ${stat}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('GOOSE_REMARKS', () => {
  it('is a non-empty array of strings', () => {
    expect(Array.isArray(GOOSE_REMARKS)).toBe(true);
    expect(GOOSE_REMARKS.length).toBeGreaterThan(0);
    for (const r of GOOSE_REMARKS) {
      expect(typeof r).toBe('string');
      expect(r.length).toBeGreaterThan(0);
    }
  });
});

describe('getExtremeTraits', () => {
  it('sorts by value descending, treating PATIENCE as inverted', () => {
    const stats = { DEBUGGING: 90, PATIENCE: 10, CHAOS: 50, WISDOM: 40, SNARK: 30 };
    const sorted = getExtremeTraits(stats);
    // PATIENCE=10 → effective score 90 (ties DEBUGGING), DEBUGGING=90, both at top
    expect(sorted[0]![1]).toBeGreaterThanOrEqual(sorted[1]![1] ?? 0);
  });

  it('returns all entries passed in', () => {
    const stats = { DEBUGGING: 80, PATIENCE: 20, CHAOS: 60 };
    const result = getExtremeTraits(stats);
    expect(result).toHaveLength(3);
  });

  it('puts high-chaos buddy with chaos at top', () => {
    const stats = { DEBUGGING: 10, PATIENCE: 90, CHAOS: 95, WISDOM: 20, SNARK: 15 };
    const sorted = getExtremeTraits(stats);
    expect(sorted[0]![0]).toBe('CHAOS');
  });

  it('puts high-patience buddy (low PATIENCE value) near top due to inversion', () => {
    const stats = { DEBUGGING: 30, PATIENCE: 5, CHAOS: 20, WISDOM: 25, SNARK: 10 };
    const sorted = getExtremeTraits(stats);
    // PATIENCE=5 → effective 95, should be first
    expect(sorted[0]![0]).toBe('PATIENCE');
  });

  it('returns empty array for empty input', () => {
    expect(getExtremeTraits({})).toEqual([]);
  });
});

describe('getPersonalityRemark', () => {
  it('always returns a non-empty string for a standard buddy', () => {
    const buddy = makeProfile();
    for (let i = 0; i < 20; i++) {
      const remark = getPersonalityRemark(buddy);
      expect(typeof remark).toBe('string');
      expect(remark.length).toBeGreaterThan(0);
    }
  });

  it('always returns a non-empty string for a goose buddy', () => {
    const buddy = makeProfile({ species: 'goose' });
    for (let i = 0; i < 20; i++) {
      const remark = getPersonalityRemark(buddy);
      expect(typeof remark).toBe('string');
      expect(remark.length).toBeGreaterThan(0);
    }
  });

  it('returns a value from the known remark pools or defaults', () => {
    const allRemarks = new Set<string>([
      ...Object.values(DEFAULT_PERSONALITIES),
      ...GOOSE_REMARKS,
      ...Object.values(REMARKS).flat(),
      'The bug is not in the code, but in the mind.',
    ]);
    const buddy = makeProfile();
    for (let i = 0; i < 30; i++) {
      expect(allRemarks.has(getPersonalityRemark(buddy))).toBe(true);
    }
  });
});
