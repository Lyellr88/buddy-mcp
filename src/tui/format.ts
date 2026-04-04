import chalk from 'chalk';
import type { Rarity } from '@/types.js';

export function progressBar(pct: number, width: number): string {
  const filled = Math.min(width, Math.round((pct / 100) * width));
  const empty = width - filled;
  return chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

export function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return String(n);
}

export const RARITY_CHALK: Record<Rarity, (s: string) => string> = {
  common: chalk.gray,
  uncommon: chalk.green,
  rare: chalk.blue,
  epic: chalk.magenta,
  legendary: chalk.yellow,
};
