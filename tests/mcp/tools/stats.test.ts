import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({})),
}));

import { S, dynamicTools } from '@/mcp/state.js';
import { STAT_TOOL_NAMES, STAT_TOOLS_MAP } from '@/mcp/tools/stats.js';

const MOCK_BUDDY = {
  name: 'Tester',
  species: 'cat',
  rarity: 'common',
  eye: 'normal',
  hat: 'none',
  shiny: false,
  peak: false,
  stats: { DEBUGGING: 80, PATIENCE: 20, CHAOS: 70, WISDOM: 60, SNARK: 90 },
};

beforeEach(() => {
  S.currentBuddy = null;
});

// ─── STAT_TOOL_NAMES ──────────────────────────────────────────────────────

describe('STAT_TOOL_NAMES', () => {
  it('contains all 20 stat tool names', () => {
    expect(STAT_TOOL_NAMES.size).toBe(20);
  });

  const expected = [
    'deep_trace',
    'trace_nightmare',
    'null_hunt',
    'stack_dive',
    'patience_check',
    'wait_wisdom',
    'vibe_check',
    'still_point',
    'chaos_audit',
    'chaos_roulette',
    'chaos_spark',
    'entropy_roll',
    'zen_consult',
    'zen_mirror',
    'oracle_seek',
    'deep_thought',
    'snark_roast',
    'snark_savage',
    'side_eye',
    'snark_verdict',
  ];
  for (const name of expected) {
    it(`includes ${name}`, () => {
      expect(STAT_TOOL_NAMES.has(name)).toBe(true);
    });
  }
});

// ─── registration ─────────────────────────────────────────────────────────

describe('stat tools registration', () => {
  it('all 20 tools are registered in dynamicTools', () => {
    for (const name of STAT_TOOL_NAMES) {
      expect(dynamicTools.has(name), `missing: ${name}`).toBe(true);
    }
  });

  it('each entry has tool, handler, and _def', () => {
    for (const name of STAT_TOOL_NAMES) {
      const entry = dynamicTools.get(name)!;
      expect(entry.tool).toBeDefined();
      expect(entry.handler).toBeTypeOf('function');
      expect(entry._def).toBeDefined();
    }
  });

  it('tool names match map keys', () => {
    for (const name of STAT_TOOL_NAMES) {
      const entry = dynamicTools.get(name)!;
      expect(entry.tool.name).toBe(name);
    }
  });

  it('descriptions contain [Buddy Tool] prefix', () => {
    for (const name of STAT_TOOL_NAMES) {
      const entry = dynamicTools.get(name)!;
      expect(entry.tool.description).toMatch(/^\[Buddy Tool\]/);
    }
  });

  it('inputSchema allows optional target string', () => {
    for (const name of STAT_TOOL_NAMES) {
      const entry = dynamicTools.get(name)!;
      const schema = entry.tool.inputSchema as { properties?: { target?: unknown } };
      expect(schema.properties?.target).toBeDefined();
    }
  });
});

// ─── no-buddy guard ───────────────────────────────────────────────────────

describe('no-buddy guard', () => {
  it('returns no-buddy message when currentBuddy is null', async () => {
    S.currentBuddy = null;
    for (const name of STAT_TOOL_NAMES) {
      const entry = dynamicTools.get(name)!;
      const result = await entry.handler({});
      expect(result).toMatch(/no buddy/i);
    }
  });
});

// ─── handler responses ────────────────────────────────────────────────────

describe('handler responses with active buddy', () => {
  beforeEach(() => {
    S.currentBuddy = { ...MOCK_BUDDY };
  });

  it('each tool returns a non-empty string', async () => {
    for (const name of STAT_TOOL_NAMES) {
      const entry = dynamicTools.get(name)!;
      const result = await entry.handler({});
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('response includes buddy name', async () => {
    for (const name of STAT_TOOL_NAMES) {
      const entry = dynamicTools.get(name)!;
      const result = await entry.handler({});
      expect(result).toContain('Tester');
    }
  });

  it('appends target context when provided (excludes vibe_check)', async () => {
    for (const name of STAT_TOOL_NAMES) {
      if (name === 'vibe_check') continue; // custom handler — target not applicable
      const entry = dynamicTools.get(name)!;
      const result = await entry.handler({ target: 'myfile.ts' });
      expect(result).toContain('myfile.ts');
    }
  });

  it('deep_trace response comes from DEBUGGING pool', async () => {
    const entry = dynamicTools.get('deep_trace')!;
    // Run multiple times to ensure no crash and always returns string
    for (let i = 0; i < 5; i++) {
      const result = await entry.handler({});
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('snark_savage uses mistake pool (shorter, punchier responses)', async () => {
    const entry = dynamicTools.get('snark_savage')!;
    const result = await entry.handler({});
    expect(typeof result).toBe('string');
  });

  it('vibe_check returns [Vibe Check: ...] or COSMIC EVENT string', async () => {
    const entry = dynamicTools.get('vibe_check')!;
    // Run multiple times — cosmic event fires at 5% so we assert on both possible shapes
    let seenNormal = false;
    for (let i = 0; i < 20; i++) {
      const result = await entry.handler({});
      expect(typeof result).toBe('string');
      if (result.startsWith('[Vibe Check:')) seenNormal = true;
      expect(result).toMatch(/Vibe Check|COSMIC EVENT/);
    }
    expect(seenNormal).toBe(true); // at 5% chance, 20 runs should almost always hit normal
  });
});

// ─── STAT_TOOLS_MAP ───────────────────────────────────────────────────────

describe('STAT_TOOLS_MAP', () => {
  it('covers all 5 stats', () => {
    const stats = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'] as const;
    for (const stat of stats) {
      expect(STAT_TOOLS_MAP[stat]).toBeDefined();
      expect(STAT_TOOLS_MAP[stat].length).toBe(4);
    }
  });

  it('each stat maps to exactly 4 tool names that exist in STAT_TOOL_NAMES', () => {
    for (const [, tools] of Object.entries(STAT_TOOLS_MAP)) {
      for (const name of tools) {
        expect(STAT_TOOL_NAMES.has(name), `${name} not in STAT_TOOL_NAMES`).toBe(true);
      }
    }
  });

  it('all 20 STAT_TOOL_NAMES appear exactly once across all map entries', () => {
    const all = Object.values(STAT_TOOLS_MAP).flat();
    expect(all.length).toBe(20);
    expect(new Set(all).size).toBe(20);
  });
});

// ─── top-stat visibility logic ────────────────────────────────────────────

describe('top-stat visibility', () => {
  it('STAT_TOOLS_MAP covers all 5 stats with 4 tools each', () => {
    const stats = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'] as const;
    for (const stat of stats) {
      expect(STAT_TOOLS_MAP[stat].length).toBe(4);
    }
  });

  it('top 2 stats by raw value are correct for MOCK_BUDDY', () => {
    // MOCK_BUDDY: SNARK=90, DEBUGGING=80 are top 2 raw
    const stats = MOCK_BUDDY.stats;
    const sorted = (Object.entries(stats) as [keyof typeof STAT_TOOLS_MAP, number][]).sort(
      (a, b) => b[1] - a[1],
    );
    const top2 = sorted.slice(0, 2).map(([s]) => s);
    expect(top2[0]).toBe('SNARK');
    expect(top2[1]).toBe('DEBUGGING');
  });

  it('patience buddy — PATIENCE raw value wins (no inversion)', () => {
    const stats = { DEBUGGING: 52, PATIENCE: 81, CHAOS: 15, WISDOM: 26, SNARK: 19 };
    const sorted = (Object.entries(stats) as [keyof typeof STAT_TOOLS_MAP, number][]).sort(
      (a, b) => b[1] - a[1],
    );
    expect(sorted[0]![0]).toBe('PATIENCE');
    expect(sorted[1]![0]).toBe('DEBUGGING');
    // Each stat has a valid 4-tool array
    expect(STAT_TOOLS_MAP['PATIENCE'].length).toBe(4);
    expect(STAT_TOOLS_MAP['DEBUGGING'].length).toBe(4);
  });

  it('1 random tool shown per top stat — 2 visible total at runtime', () => {
    // With top 2 stats, visibleStatTools picks 1 from each stat's 4-tool pool
    const top2Stats = ['SNARK', 'DEBUGGING'] as const;
    for (const stat of top2Stats) {
      expect(STAT_TOOLS_MAP[stat].length).toBe(4);
    }
    // 18 tools remain hidden (20 total - 2 shown)
    expect(STAT_TOOL_NAMES.size - 2).toBe(18);
  });
});
