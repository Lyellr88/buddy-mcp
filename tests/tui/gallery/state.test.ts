import { describe, it, expect } from 'vitest';
import { activeEntryIndex, DEFAULT_PROFILE, type GalleryEntry } from '@/tui/gallery/state.js';
import type { Bones } from '@/types.js';

function makeBones(overrides: Partial<Bones> = {}): Bones {
  return {
    species: 'duck',
    rarity: 'common',
    eye: '·',
    hat: 'none',
    shiny: false,
    stats: {},
    ...overrides,
  };
}

function makeEntry(overrides: Partial<GalleryEntry> = {}): GalleryEntry {
  return {
    name: 'test',
    isDefault: false,
    isActive: false,
    bones: makeBones(),
    profile: null,
    ...overrides,
  };
}

describe('activeEntryIndex', () => {
  it('returns the index of the active entry', () => {
    const entries = [
      makeEntry({ isActive: false }),
      makeEntry({ isActive: true }),
      makeEntry({ isActive: false }),
    ];
    expect(activeEntryIndex(entries)).toBe(1);
  });

  it('returns 0 when no entry is active', () => {
    const entries = [makeEntry({ isActive: false }), makeEntry({ isActive: false })];
    expect(activeEntryIndex(entries)).toBe(0);
  });

  it('returns first active entry if multiple are active', () => {
    const entries = [
      makeEntry({ isActive: false }),
      makeEntry({ isActive: true }),
      makeEntry({ isActive: true }),
    ];
    expect(activeEntryIndex(entries)).toBe(1);
  });
});

describe('DEFAULT_PROFILE', () => {
  it('is a sentinel string distinct from normal names', () => {
    expect(DEFAULT_PROFILE).toBe('__default__');
  });
});
