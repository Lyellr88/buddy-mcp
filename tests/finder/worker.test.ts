import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { join } from 'path';
import { fnv1a } from '@/generation/hash.js';
import { mulberry32, pick } from '@/generation/rng.js';
import { RARITIES, RARITY_WEIGHTS, SPECIES, EYES, HATS } from '@/constants.js';

const WORKER_PATH = join(__dirname, '..', '..', 'dist', 'finder', 'worker.js');

// Use FNV-1a mode (--fnv1a) so tests don't require Bun
function spawnWorker(args: string[]): { salt: string; attempts: number; elapsed: number } {
  const output = execFileSync('node', [WORKER_PATH, ...args, '--fnv1a'], {
    encoding: 'utf-8',
    timeout: 30000,
  });
  return JSON.parse(output.trim());
}

function rollRarity(rng: () => number): string {
  const total = 100;
  let roll = rng() * total;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return 'common';
}

function verifyPet(
  userId: string,
  salt: string,
  expected: { species: string; rarity: string; eye: string; hat: string },
): boolean {
  const seed = fnv1a(userId + salt);
  const rng = mulberry32(seed);

  const rarity = rollRarity(rng);
  if (rarity !== expected.rarity) return false;

  const species = pick(rng, SPECIES);
  if (species !== expected.species) return false;

  const eye = pick(rng, EYES);
  if (eye !== expected.eye) return false;

  const hat = rarity === 'common' ? 'none' : pick(rng, HATS);
  if (hat !== expected.hat) return false;

  return true;
}

describe('finder worker', () => {
  it('finds a salt for a common duck (easy target)', () => {
    const userId = 'test-worker-user';
    const target = { species: 'duck', rarity: 'common', eye: '·', hat: 'none' };

    const result = spawnWorker([
      userId,
      target.species,
      target.rarity,
      target.eye,
      target.hat,
      'false',
      'any',
      'any',
    ]);

    expect(result.salt).toBeTruthy();
    expect(result.salt.length).toBe(15);
    expect(result.attempts).toBeGreaterThan(0);
    expect(result.elapsed).toBeGreaterThanOrEqual(0);

    // Verify the found salt actually produces the correct pet
    expect(verifyPet(userId, result.salt, target)).toBe(true);
  });

  it('exits with error on missing arguments', () => {
    expect(() => {
      execFileSync('node', [WORKER_PATH, '--fnv1a'], {
        encoding: 'utf-8',
        timeout: 5000,
      });
    }).toThrow();
  });
});
