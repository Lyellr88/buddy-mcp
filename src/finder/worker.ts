#!/usr/bin/env node
// This script brute-forces salts to find a matching companion.
// Called by orchestrator.ts as a subprocess.
// Runs under Bun (wyhash) by default, or Node (FNV-1a) when --fnv1a is passed.
//
// Args: <userId> <species> <rarity> <eye> <hat> <shiny> <peak> <dump> [--fnv1a]
// Outputs JSON: { salt, attempts, elapsed }

import type { StatName } from '@/types.js';
import {
  RARITIES,
  RARITY_WEIGHTS,
  RARITY_FLOOR,
  SPECIES,
  EYES,
  HATS,
  STAT_NAMES,
} from '@/constants.js';
import { mulberry32, pick } from '@/generation/rng.js';
import { fnv1a } from '@/generation/hash.js';

const useFnv1a = process.argv.includes('--fnv1a');

function hashKey(key: string): number {
  if (useFnv1a) return fnv1a(key);
  return Number(BigInt(Bun.hash(key)) & 0xffffffffn);
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

const SALT_LEN = 15;
const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
const REPORT_INTERVAL = 100_000;

function randomSalt(): string {
  let s = '';
  for (let i = 0; i < SALT_LEN; i++) {
    s += CHARSET[(Math.random() * CHARSET.length) | 0];
  }
  return s;
}

const args = process.argv.slice(2).filter((a) => a !== '--fnv1a');
const [userId, wantSpecies, wantRarity, wantEye, wantHat, wantShiny, wantPeak, wantDump] = args;

if (!userId || !wantSpecies || !wantRarity || !wantEye || !wantHat) {
  console.error(
    'Usage: worker.ts <userId> <species> <rarity> <eye> <hat> [shiny] [peak] [dump] [--fnv1a]',
  );
  process.exit(1);
}

const requireShiny = wantShiny === 'true';

function validateStatName(value: string | undefined, label: string): StatName | null {
  if (!value || value === 'any') return null;
  if (!(STAT_NAMES as readonly string[]).includes(value)) {
    console.error(`Invalid ${label} stat: "${value}". Valid: ${STAT_NAMES.join(', ')}`);
    process.exit(1);
  }
  return value as StatName;
}

const requirePeak = validateStatName(wantPeak, 'peak');
const requireDump = validateStatName(wantDump, 'dump');

const start = Date.now();
let attempts = 0;

try {
  if (!useFnv1a && (typeof Bun === 'undefined' || typeof Bun.hash !== 'function')) {
    console.error(
      `Bun.hash is not available (typeof Bun: ${typeof Bun}).\n` +
        'This worker must run under Bun, or pass --fnv1a for Node-based Claude installs.',
    );
    process.exit(1);
  }

  if (useFnv1a) {
    process.stderr.write(
      JSON.stringify({ info: 'Using FNV-1a hash (Node runtime detected)' }) + '\n',
    );
  }

  for (;;) {
    attempts++;
    const salt = randomSalt();
    const key = userId + salt;
    const seed = hashKey(key);
    const rng = mulberry32(seed);

    do {
      const rarity = rollRarity(rng);
      if (rarity !== wantRarity) break;

      const species = pick(rng, SPECIES);
      if (species !== wantSpecies) break;

      const eye = pick(rng, EYES);
      if (eye !== wantEye) break;

      const hat = rarity === 'common' ? 'none' : pick(rng, HATS);
      if (hat !== wantHat) break;

      const shiny = rng() < 0.01;
      if (requireShiny && !shiny) break;

      // Always compute stats so the result includes full bones data.
      // This avoids re-hashing in Node (which may silently fall back to FNV-1a).
      const peak = pick(rng, STAT_NAMES);
      let dump = pick(rng, STAT_NAMES);
      while (dump === peak) dump = pick(rng, STAT_NAMES);

      if (requirePeak && peak !== requirePeak) break;
      if (requireDump && dump !== requireDump) break;

      const floor = RARITY_FLOOR[rarity as keyof typeof RARITY_FLOOR] ?? 5;
      const stats: Record<string, number> = {};
      for (const name of STAT_NAMES) {
        if (name === peak) {
          stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
        } else if (name === dump) {
          stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
        } else {
          stats[name] = floor + Math.floor(rng() * 40);
        }
      }

      console.log(
        JSON.stringify({
          salt,
          attempts,
          elapsed: Date.now() - start,
          bones: { species, rarity, eye, hat, shiny, stats },
        }),
      );
      process.exit(0);
    } while (false); // eslint-disable-line no-constant-condition -- intentional breakable block

    if (attempts % REPORT_INTERVAL === 0) {
      process.stderr.write(JSON.stringify({ attempts, elapsed: Date.now() - start }) + '\n');
    }
  }
} catch (err) {
  console.error(
    `Worker crashed after ${attempts} attempts (${Date.now() - start}ms): ${(err as Error).message}`,
  );
  console.error((err as Error).stack);
  process.exit(1);
}
