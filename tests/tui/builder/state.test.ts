import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  applyRarityConstraints,
  applyDumpConstraint,
  getVisibleFields,
  stateToDesiredTraits,
  stateToBones,
  firstUnfilledField,
  allTraitsFlagged,
} from '@/tui/builder/state.js';
import type { BuilderState } from '@/tui/builder/state.js';
import { SPECIES, EYES, RARITIES, STAT_NAMES } from '@/constants.js';

function baseState(overrides: Partial<BuilderState> = {}): BuilderState {
  return {
    species: 'duck',
    eye: '·',
    rarity: 'legendary',
    hat: 'crown',
    shiny: false,
    statsMode: 'none',
    peak: 'DEBUGGING',
    dump: 'PATIENCE',
    ...overrides,
  };
}

describe('createInitialState', () => {
  it('returns defaults with no flags', () => {
    const state = createInitialState({});
    expect(SPECIES).toContain(state.species);
    expect(EYES).toContain(state.eye);
    expect(RARITIES).toContain(state.rarity);
    expect(state.shiny).toBe(false);
    expect(state.statsMode).toBe('none');
  });

  it('pre-populates from valid flags', () => {
    const state = createInitialState({
      species: 'dragon',
      eye: '✦',
      rarity: 'epic',
      hat: 'wizard',
      shiny: true,
      peak: 'CHAOS',
      dump: 'WISDOM',
    });
    expect(state.species).toBe('dragon');
    expect(state.eye).toBe('✦');
    expect(state.rarity).toBe('epic');
    expect(state.hat).toBe('wizard');
    expect(state.shiny).toBe(true);
    expect(state.statsMode).toBe('customize');
    expect(state.peak).toBe('CHAOS');
    expect(state.dump).toBe('WISDOM');
  });

  it('ignores invalid flag values', () => {
    const state = createInitialState({
      species: 'unicorn',
      eye: 'X',
      rarity: 'mythic',
    });
    expect(state.species).toBe(SPECIES[0]);
    expect(state.eye).toBe(EYES[0]);
    expect(state.rarity).toBe(RARITIES[0]);
  });

  it('forces hat to none for common rarity', () => {
    const state = createInitialState({ rarity: 'common', hat: 'crown' });
    expect(state.hat).toBe('none');
  });

  it('resolves dump collision with peak', () => {
    const state = createInitialState({ peak: 'DEBUGGING', dump: 'DEBUGGING' });
    expect(state.dump).not.toBe(state.peak);
    expect(STAT_NAMES).toContain(state.dump);
  });

  it('sets statsMode to customize when peak flag is provided', () => {
    const state = createInitialState({ peak: 'WISDOM' });
    expect(state.statsMode).toBe('customize');
  });

  it('sets statsMode to customize when dump flag is provided', () => {
    const state = createInitialState({ dump: 'SNARK' });
    expect(state.statsMode).toBe('customize');
  });
});

describe('applyRarityConstraints', () => {
  it('resets hat to none for common rarity', () => {
    const result = applyRarityConstraints(baseState({ rarity: 'common', hat: 'wizard' }));
    expect(result.hat).toBe('none');
  });

  it('sets hat to crown when switching from common to non-common with hat none', () => {
    const result = applyRarityConstraints(baseState({ rarity: 'legendary', hat: 'none' }));
    expect(result.hat).toBe('crown');
  });

  it('preserves hat for non-common rarity with existing hat', () => {
    const result = applyRarityConstraints(baseState({ rarity: 'epic', hat: 'wizard' }));
    expect(result.hat).toBe('wizard');
  });

  it('returns same reference when no change needed', () => {
    const state = baseState({ rarity: 'legendary', hat: 'crown' });
    const result = applyRarityConstraints(state);
    expect(result).toBe(state);
  });
});

describe('applyDumpConstraint', () => {
  it('resets dump when it equals peak', () => {
    const result = applyDumpConstraint(baseState({ peak: 'CHAOS', dump: 'CHAOS' }));
    expect(result.dump).not.toBe('CHAOS');
    expect(STAT_NAMES).toContain(result.dump);
  });

  it('preserves dump when different from peak', () => {
    const state = baseState({ peak: 'CHAOS', dump: 'WISDOM' });
    const result = applyDumpConstraint(state);
    expect(result).toBe(state);
  });
});

describe('getVisibleFields', () => {
  it('includes hat for non-common rarity', () => {
    const fields = getVisibleFields(baseState({ rarity: 'legendary' }));
    expect(fields).toContain('hat');
  });

  it('excludes hat for common rarity', () => {
    const fields = getVisibleFields(baseState({ rarity: 'common' }));
    expect(fields).not.toContain('hat');
  });

  it('includes peak and dump when statsMode is customize', () => {
    const fields = getVisibleFields(baseState({ statsMode: 'customize' }));
    expect(fields).toContain('peak');
    expect(fields).toContain('dump');
  });

  it('excludes peak and dump when statsMode is none', () => {
    const fields = getVisibleFields(baseState({ statsMode: 'none' }));
    expect(fields).not.toContain('peak');
    expect(fields).not.toContain('dump');
  });

  it('always includes species, eye, rarity, shiny, statsMode', () => {
    const fields = getVisibleFields(baseState());
    expect(fields).toContain('species');
    expect(fields).toContain('eye');
    expect(fields).toContain('rarity');
    expect(fields).toContain('shiny');
    expect(fields).toContain('statsMode');
  });
});

describe('stateToDesiredTraits', () => {
  it('converts state to DesiredTraits', () => {
    const traits = stateToDesiredTraits(
      baseState({ species: 'cat', eye: '×', rarity: 'rare', hat: 'tophat', shiny: true }),
    );
    expect(traits).toEqual({
      species: 'cat',
      eye: '×',
      rarity: 'rare',
      hat: 'tophat',
      shiny: true,
      peak: null,
      dump: null,
    });
  });

  it('sets peak and dump when statsMode is customize', () => {
    const traits = stateToDesiredTraits(
      baseState({ statsMode: 'customize', peak: 'CHAOS', dump: 'WISDOM' }),
    );
    expect(traits.peak).toBe('CHAOS');
    expect(traits.dump).toBe('WISDOM');
  });

  it('forces hat to none for common rarity', () => {
    const traits = stateToDesiredTraits(baseState({ rarity: 'common', hat: 'crown' }));
    expect(traits.hat).toBe('none');
  });
});

describe('stateToBones', () => {
  it('converts state to Bones with empty stats', () => {
    const bones = stateToBones(
      baseState({ species: 'ghost', eye: '°', rarity: 'epic', hat: 'halo' }),
    );
    expect(bones).toEqual({
      species: 'ghost',
      eye: '°',
      rarity: 'epic',
      hat: 'halo',
      shiny: false,
      stats: {},
    });
  });

  it('forces hat to none for common rarity', () => {
    const bones = stateToBones(baseState({ rarity: 'common', hat: 'wizard' }));
    expect(bones.hat).toBe('none');
  });
});

describe('firstUnfilledField', () => {
  it('returns species when no flags provided', () => {
    expect(firstUnfilledField({})).toBe('species');
  });

  it('returns eye when only species is flagged', () => {
    expect(firstUnfilledField({ species: 'duck' })).toBe('eye');
  });

  it('returns rarity when species and eye are flagged', () => {
    expect(firstUnfilledField({ species: 'duck', eye: '·' })).toBe('rarity');
  });

  it('returns hat when species, eye, and non-common rarity are flagged', () => {
    expect(firstUnfilledField({ species: 'duck', eye: '·', rarity: 'legendary' })).toBe('hat');
  });

  it('skips hat for common rarity', () => {
    expect(firstUnfilledField({ species: 'duck', eye: '·', rarity: 'common' })).toBe('shiny');
  });

  it('returns shiny when all visual traits are flagged', () => {
    expect(
      firstUnfilledField({ species: 'duck', eye: '·', rarity: 'legendary', hat: 'crown' }),
    ).toBe('shiny');
  });
});

describe('allTraitsFlagged', () => {
  it('returns false with no flags', () => {
    expect(allTraitsFlagged({})).toBe(false);
  });

  it('returns false with partial flags', () => {
    expect(allTraitsFlagged({ species: 'duck', eye: '·' })).toBe(false);
  });

  it('returns true when all visual traits flagged with non-common rarity', () => {
    expect(allTraitsFlagged({ species: 'duck', eye: '·', rarity: 'legendary', hat: 'crown' })).toBe(
      true,
    );
  });

  it('returns true for common rarity without hat flag', () => {
    expect(allTraitsFlagged({ species: 'duck', eye: '·', rarity: 'common' })).toBe(true);
  });

  it('returns false for non-common rarity without hat flag', () => {
    expect(allTraitsFlagged({ species: 'duck', eye: '·', rarity: 'legendary' })).toBe(false);
  });

  it('returns false with invalid flag values', () => {
    expect(allTraitsFlagged({ species: 'unicorn', eye: '·', rarity: 'common' })).toBe(false);
  });
});
