import type { Bones, Species } from '@/types.js';
import { BODIES, HAT_LINES } from './data.ts';

/**
 * Idle animation sequence from Claude Code.
 * Indexes into the species frame array; -1 = sleeping (eyes replaced with "-").
 */
export const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0] as const;

/**
 * Render a sprite at the given animation frame with padding.
 * Reads from IDLE_SEQUENCE to determine frame index and sleeping state.
 */
export function renderAnimatedSprite(bones: Bones, frame: number, height = 5): string {
  const step = IDLE_SEQUENCE[frame % IDLE_SEQUENCE.length];
  const sleeping = step === -1;
  const spriteFrame = sleeping ? 0 : step;
  const lines = renderSprite(bones, spriteFrame, sleeping);
  while (lines.length < height) lines.push('');
  return lines.slice(0, height).join('\n');
}

export function renderSprite(bones: Bones, frame = 0, sleeping = false): string[] {
  const frames = BODIES[bones.species];
  const eye = sleeping ? '-' : bones.eye;
  const body = frames[frame % frames.length].map((line) => line.replaceAll('{E}', eye));
  const lines = [...body];
  if (bones.hat !== 'none' && !lines[0].trim()) {
    lines[0] = HAT_LINES[bones.hat];
  }
  if (!lines[0].trim() && frames.every((f) => !f[0].trim())) lines.shift();
  return lines;
}

export function spriteFrameCount(species: Species): number {
  return BODIES[species].length;
}

export function renderFace(bones: Pick<Bones, 'species' | 'eye'>): string {
  const e = bones.eye;
  switch (bones.species) {
    case 'duck':
    case 'goose':
      return `(${e}>`;
    case 'blob':
      return `(${e}${e})`;
    case 'cat':
      return `=${e}ω${e}=`;
    case 'dragon':
      return `<${e}~${e}>`;
    case 'octopus':
      return `~(${e}${e})~`;
    case 'owl':
      return `(${e})(${e})`;
    case 'penguin':
      return `(${e}>)`;
    case 'turtle':
      return `[${e}_${e}]`;
    case 'snail':
      return `${e}(@)`;
    case 'ghost':
      return `/${e}${e}\\`;
    case 'axolotl':
      return `}${e}.${e}{`;
    case 'capybara':
      return `(${e}oo${e})`;
    case 'cactus':
      return `|${e}  ${e}|`;
    case 'robot':
      return `[${e}${e}]`;
    case 'rabbit':
      return `(${e}..${e})`;
    case 'mushroom':
      return `|${e}  ${e}|`;
    case 'chonk':
      return `(${e}.${e})`;
    default:
      return `(${e}${e})`;
  }
}
