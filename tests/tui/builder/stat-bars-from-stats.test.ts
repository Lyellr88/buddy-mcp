import { describe, it, expect } from 'vitest';
import { renderStatBarsFromStats } from '@/tui/builder/stat-bars.js';

describe('renderStatBarsFromStats', () => {
  it('returns empty string for empty stats', () => {
    expect(renderStatBarsFromStats({})).toBe('');
  });

  it('renders a single stat', () => {
    const result = renderStatBarsFromStats({ DEBUGGING: 10 });
    expect(result).toContain('DEBUGGING');
    expect(result).toContain('10');
    // Single stat at max → full bar (14 filled blocks)
    expect(result).toContain('█'.repeat(14));
  });

  it('renders multiple stats with proportional bars', () => {
    const result = renderStatBarsFromStats({ DEBUGGING: 10, WISDOM: 5 });
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('DEBUGGING');
    expect(lines[1]).toContain('WISDOM');
  });

  it('scales bars proportionally to max value', () => {
    const result = renderStatBarsFromStats({ CHAOS: 100, SNARK: 50 });
    const lines = result.split('\n');
    // CHAOS (max) should have 14 filled, SNARK should have ~7
    const chaosLine = lines.find((l: string) => l.includes('CHAOS'));
    const snarkLine = lines.find((l: string) => l.includes('SNARK'));
    expect(chaosLine).toBeDefined();
    expect(snarkLine).toBeDefined();
    const chaosFilled = (chaosLine?.match(/█/g) ?? []).length;
    const snarkFilled = (snarkLine?.match(/█/g) ?? []).length;
    expect(chaosFilled).toBe(14);
    expect(snarkFilled).toBe(7);
  });

  it('only renders stats that are defined, not all STAT_NAMES', () => {
    const result = renderStatBarsFromStats({ PATIENCE: 5 });
    expect(result).toContain('PATIENCE');
    expect(result).not.toContain('DEBUGGING');
    expect(result).not.toContain('CHAOS');
  });
});
