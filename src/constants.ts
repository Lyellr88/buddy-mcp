import { platform, arch } from 'os';
import type { Rarity, Species, Eye, Hat, StatName } from './types.ts';

export const ISSUE_URL = 'https://github.com/lyellr88/buddy-mcp/issues';

export const ORIGINAL_SALT = 'friend-2026-401';

export function diagnostics(extra: Record<string, string> = {}): string {
  const info: Record<string, string> = {
    Platform: `${platform()} ${arch()}`,
    Node: process.version,
    ...extra,
  };
  return Object.entries(info)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
}

export const RARITIES: readonly Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
] as const;

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};

export const RARITY_STARS: Record<Rarity, string> = {
  common: '★',
  uncommon: '★★',
  rare: '★★★',
  epic: '★★★★',
  legendary: '★★★★★',
};

export const SPECIES: readonly Species[] = [
  'duck',
  'goose',
  'blob',
  'cat',
  'dragon',
  'octopus',
  'owl',
  'penguin',
  'turtle',
  'snail',
  'ghost',
  'axolotl',
  'capybara',
  'cactus',
  'robot',
  'rabbit',
  'mushroom',
  'chonk',
] as const;

export const EYES: readonly Eye[] = ['·', '✦', '×', '◉', '@', '°'] as const;

export const HATS: readonly Hat[] = [
  'none',
  'crown',
  'tophat',
  'propeller',
  'halo',
  'wizard',
  'beanie',
  'tinyduck',
] as const;

export const STAT_NAMES: readonly StatName[] = [
  'DEBUGGING',
  'PATIENCE',
  'CHAOS',
  'WISDOM',
  'SNARK',
] as const;

export const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
};
