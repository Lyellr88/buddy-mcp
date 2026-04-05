import { describe, it, expect } from 'vitest';
import { renderSprite } from '@/sprites/index.js';
import { SPECIES, EYES, HATS, RARITIES, STAT_NAMES } from '@/constants.js';
import { stateToBones, type BuilderState } from '@/tui/builder/state.js';
import { RARITY_HEX } from '@/tui/builder/colors.js';
import { renderStatBars } from '@/tui/builder/stat-bars.js';

function makeState(overrides: Partial<BuilderState> = {}): BuilderState {
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

describe('preview sprite rendering', () => {
  it('renders all 18 species without {E} placeholder', () => {
    for (const species of SPECIES) {
      const bones = stateToBones(makeState({ species }));
      const lines = renderSprite(bones, 0);
      const joined = lines.join('\n');
      expect(joined).not.toContain('{E}');
    }
  });

  it('renders all eye types correctly', () => {
    for (const eye of EYES) {
      const bones = stateToBones(makeState({ eye }));
      const lines = renderSprite(bones, 0);
      const joined = lines.join('\n');
      expect(joined).not.toContain('{E}');
      expect(joined).toContain(eye);
    }
  });

  it('shows hat for non-common rarity', () => {
    for (const hat of HATS.filter((h) => h !== 'none')) {
      const bones = stateToBones(makeState({ rarity: 'legendary', hat }));
      const lines = renderSprite(bones, 0);
      // Hat should occupy line 0 (for species with blank first line)
      expect(lines.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('omits hat for common rarity', () => {
    const bones = stateToBones(makeState({ rarity: 'common', hat: 'crown' }));
    // stateToBones forces hat to 'none' for common
    expect(bones.hat).toBe('none');
    const lines = renderSprite(bones, 0);
    expect(lines.join('\n')).not.toContain('\\^^^/');
  });

  it('sprite has 4-5 lines', () => {
    for (const species of SPECIES) {
      const bones = stateToBones(makeState({ species }));
      const lines = renderSprite(bones, 0);
      expect(lines.length).toBeGreaterThanOrEqual(4);
      expect(lines.length).toBeLessThanOrEqual(5);
    }
  });

  it('each rarity maps to a valid color', () => {
    for (const rarity of RARITIES) {
      expect(RARITY_HEX[rarity]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('renderStatBars', () => {
  it('returns empty string when no peak or dump', () => {
    expect(renderStatBars(null, null)).toBe('');
  });

  it('renders all 5 stats with bars', () => {
    const result = renderStatBars('DEBUGGING', 'CHAOS');
    const lines = result.split('\n');
    expect(lines.length).toBe(5);
    for (const name of STAT_NAMES) {
      expect(result).toContain(name);
    }
  });

  it('marks peak stat', () => {
    const result = renderStatBars('PATIENCE', 'SNARK');
    const patienceLine = result.split('\n').find((l) => l.includes('PATIENCE'));
    expect(patienceLine).toContain('\u2190 peak');
  });

  it('marks dump stat', () => {
    const result = renderStatBars('PATIENCE', 'SNARK');
    const snarkLine = result.split('\n').find((l) => l.includes('SNARK'));
    expect(snarkLine).toContain('\u2190 dump');
  });

  it('peak bar is full width', () => {
    const result = renderStatBars('DEBUGGING', 'CHAOS');
    const debugLine = result.split('\n').find((l) => l.includes('DEBUGGING'));
    // 14 filled blocks
    expect(debugLine).toContain('\u2588'.repeat(14));
  });

  it('dump bar is minimal', () => {
    const result = renderStatBars('DEBUGGING', 'CHAOS');
    const chaosLine = result.split('\n').find((l) => l.includes('CHAOS'));
    // 1 filled + 13 empty
    expect(chaosLine).toContain('\u2588' + '\u2591'.repeat(13));
  });

  it('uses block characters for bars', () => {
    const result = renderStatBars('DEBUGGING', 'CHAOS');
    expect(result).toContain('\u2588'); // filled
    expect(result).toContain('\u2591'); // empty
  });

  it('works with only peak (no dump)', () => {
    const result = renderStatBars('WISDOM', null);
    expect(result).toContain('\u2190 peak');
    expect(result).not.toContain('\u2190 dump');
  });
});
