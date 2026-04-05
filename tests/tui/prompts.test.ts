import { describe, it, expect } from 'vitest';
import { validateFlag } from '@/tui/prompts.js';
import { SPECIES, EYES, RARITIES } from '@/constants.js';

describe('validateFlag', () => {
  it('returns valid value unchanged', () => {
    expect(validateFlag('species', 'duck', SPECIES)).toBe('duck');
    expect(validateFlag('eye', '·', EYES)).toBe('·');
    expect(validateFlag('rarity', 'legendary', RARITIES)).toBe('legendary');
  });

  it('returns undefined for undefined value', () => {
    expect(validateFlag('species', undefined, SPECIES)).toBeUndefined();
  });

  it('returns undefined for "any"', () => {
    expect(validateFlag('species', 'any', SPECIES)).toBeUndefined();
  });

  it('throws for invalid value', () => {
    expect(() => validateFlag('species', 'unicorn', SPECIES)).toThrow('Invalid --species');
  });
});
