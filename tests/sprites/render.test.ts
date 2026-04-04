import { describe, it, expect } from 'vitest';
import { renderSprite, spriteFrameCount, renderFace } from '@/sprites/index.js';
import { SPECIES } from '@/constants.js';
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

describe('renderSprite', () => {
  it('returns an array of strings', () => {
    const lines = renderSprite(makeBones());
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    for (const line of lines) {
      expect(typeof line).toBe('string');
    }
  });

  it('replaces eye placeholder', () => {
    const bones = makeBones({ eye: '✦' });
    const lines = renderSprite(bones);
    const joined = lines.join('\n');
    expect(joined).toContain('✦');
    expect(joined).not.toContain('{E}');
  });

  it('adds hat line for non-common rarity', () => {
    const bones = makeBones({ rarity: 'rare', hat: 'crown' });
    const lines = renderSprite(bones);
    const joined = lines.join('\n');
    expect(joined).toContain('\\^^^/');
  });

  it('does not add hat for common rarity', () => {
    const bones = makeBones({ rarity: 'common', hat: 'none' });
    const lines = renderSprite(bones);
    const joined = lines.join('\n');
    expect(joined).not.toContain('\\^^^/');
  });

  it('renders all species without error', () => {
    for (const species of SPECIES) {
      const bones = makeBones({ species });
      expect(() => renderSprite(bones, 0)).not.toThrow();
      expect(() => renderSprite(bones, 1)).not.toThrow();
      expect(() => renderSprite(bones, 2)).not.toThrow();
    }
  });
});

describe('spriteFrameCount', () => {
  it('returns 3 for all species', () => {
    for (const species of SPECIES) {
      expect(spriteFrameCount(species)).toBe(3);
    }
  });
});

describe('renderFace', () => {
  it('returns a non-empty string for all species', () => {
    for (const species of SPECIES) {
      const face = renderFace({ species, eye: '·' });
      expect(typeof face).toBe('string');
      expect(face.length).toBeGreaterThan(0);
    }
  });

  it('includes the eye character', () => {
    const face = renderFace({ species: 'duck', eye: '✦' });
    expect(face).toContain('✦');
  });

  it('renders known faces correctly', () => {
    expect(renderFace({ species: 'duck', eye: '·' })).toBe('(·>');
    expect(renderFace({ species: 'cat', eye: '·' })).toBe('=·ω·=');
    expect(renderFace({ species: 'robot', eye: '·' })).toBe('[··]');
  });
});
