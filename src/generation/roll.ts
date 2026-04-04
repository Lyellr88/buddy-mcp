import type { Rarity, Bones, RollResult, StatName, RngFunction } from '@/types.js';
import {
  RARITIES,
  RARITY_WEIGHTS,
  RARITY_FLOOR,
  SPECIES,
  EYES,
  HATS,
  STAT_NAMES,
} from '@/constants.js';
import { mulberry32, pick } from './rng.ts';
import { hashString } from './hash.ts';

export function rollRarity(rng: RngFunction): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return 'common';
}

function rollStats(rng: RngFunction, rarity: Rarity): Partial<Record<StatName, number>> {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) dump = pick(rng, STAT_NAMES);

  const stats: Partial<Record<StatName, number>> = {};
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }
  return stats;
}

export function rollFrom(rng: RngFunction): RollResult {
  const rarity = rollRarity(rng);
  const bones: Bones = {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
  };
  const inspirationSeed = Math.floor(rng() * 1e9);
  return { bones, inspirationSeed };
}

export function roll(userId: string, salt: string, { useNodeHash = false } = {}): RollResult {
  const key = userId + salt;
  return rollFrom(mulberry32(hashString(key, { useNodeHash })));
}
