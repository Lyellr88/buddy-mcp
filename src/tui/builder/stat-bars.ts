import type { StatName } from '@/types.js';
import { STAT_NAMES } from '@/constants.js';

const BAR_WIDTH = 14;
const FILLED = '\u2588'; // █
const EMPTY = '\u2591'; // ░

export function renderStatBarsFromStats(stats: Partial<Record<StatName, number>>): string {
  const entries = STAT_NAMES.filter((s) => stats[s] !== undefined);
  if (entries.length === 0) return '';
  const padWidth = Math.max(...STAT_NAMES.map((s) => s.length));
  const maxVal = Math.max(...entries.map((s) => stats[s] ?? 0), 1);
  const lines: string[] = [];
  for (const name of entries) {
    const val = stats[name] ?? 0;
    const label = name.padEnd(padWidth);
    const filled = Math.round(BAR_WIDTH * (val / maxVal));
    const bar = FILLED.repeat(filled) + EMPTY.repeat(BAR_WIDTH - filled);
    lines.push(`${label} ${bar}  ${String(val).padStart(3)}`);
  }
  return lines.join('\n');
}

export function renderStatBars(peak: StatName | null, dump: StatName | null): string {
  if (!peak && !dump) return '';
  const padWidth = Math.max(...STAT_NAMES.map((s) => s.length));
  const lines: string[] = [];
  for (const name of STAT_NAMES) {
    const label = name.padEnd(padWidth);
    let filled: number;
    let annotation = '';
    if (name === peak) {
      filled = BAR_WIDTH;
      annotation = '  \u2190 peak';
    } else if (name === dump) {
      filled = 1;
      annotation = '  \u2190 dump';
    } else {
      filled = Math.round(BAR_WIDTH * 0.4);
    }
    const bar = FILLED.repeat(filled) + EMPTY.repeat(BAR_WIDTH - filled);
    lines.push(`${label} ${bar}${annotation}`);
  }
  return lines.join('\n');
}
