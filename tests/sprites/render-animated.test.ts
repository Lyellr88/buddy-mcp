import { describe, it, expect } from 'vitest';
import { renderSprite, renderAnimatedSprite, IDLE_SEQUENCE } from '@/sprites/index.js';
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

describe('renderSprite sleeping mode', () => {
  it('replaces eye with "-" when sleeping', () => {
    const bones = makeBones({ eye: '✦' });
    const lines = renderSprite(bones, 0, true);
    const joined = lines.join('\n');
    expect(joined).toContain('-');
    expect(joined).not.toContain('✦');
  });

  it('uses normal eye when not sleeping', () => {
    const bones = makeBones({ eye: '✦' });
    const lines = renderSprite(bones, 0, false);
    expect(lines.join('\n')).toContain('✦');
  });
});

describe('renderAnimatedSprite', () => {
  it('returns a string with exactly height lines', () => {
    const result = renderAnimatedSprite(makeBones(), 0, 5);
    expect(result.split('\n')).toHaveLength(5);
  });

  it('respects custom height parameter', () => {
    const result = renderAnimatedSprite(makeBones(), 0, 7);
    expect(result.split('\n')).toHaveLength(7);
  });

  it('uses sleeping eye at IDLE_SEQUENCE frames with value -1', () => {
    // Find a frame index in IDLE_SEQUENCE that equals -1
    const sleepIdx = IDLE_SEQUENCE.findIndex((s) => s === -1);
    expect(sleepIdx).toBeGreaterThanOrEqual(0);

    const bones = makeBones({ eye: '✦' });
    const result = renderAnimatedSprite(bones, sleepIdx);
    expect(result).toContain('-');
    expect(result).not.toContain('✦');
  });

  it('uses normal eye at non-sleeping frames', () => {
    const normalIdx = IDLE_SEQUENCE.findIndex((s) => s === 0);
    const bones = makeBones({ eye: '✦' });
    const result = renderAnimatedSprite(bones, normalIdx);
    expect(result).toContain('✦');
  });
});

describe('IDLE_SEQUENCE', () => {
  it('is a non-empty array of numbers', () => {
    expect(IDLE_SEQUENCE.length).toBeGreaterThan(0);
    for (const val of IDLE_SEQUENCE) {
      expect(typeof val).toBe('number');
    }
  });

  it('contains at least one sleeping frame (-1)', () => {
    expect(IDLE_SEQUENCE).toContain(-1);
  });
});
