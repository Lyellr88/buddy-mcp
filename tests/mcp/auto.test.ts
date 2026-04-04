import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({})),
}));

import { autoManifestTools, AUTO_TOOL_NAMES } from '@/mcp/tools/auto.js';
import { dynamicTools, S, gachaState } from '@/mcp/state.js';
import { CORE_TOOL_NAMES } from '@/mcp/persistence.js';
import { STAT_TOOL_NAMES } from '@/mcp/tools/stats.js';

function makeProfile(statsOverride: Record<string, number> = {}) {
  return {
    species: 'duck' as const,
    rarity: 'common' as const,
    eye: 'normal',
    hat: 'none',
    shiny: false,
    peak: false,
    stats: {
      DEBUGGING: 50,
      PATIENCE: 50,
      CHAOS: 50,
      WISDOM: 50,
      SNARK: 50,
      ...statsOverride,
    },
  };
}

beforeEach(() => {
  S.currentBuddy = null;
  gachaState.discoveredSpecies = [];
  gachaState.shinyCount = 0;
  gachaState.lockTimestamp = null;
  gachaState.manifestedTools = [];
});

// ─── AUTO_TOOL_NAMES ───────────────────────────────────────────────────────

describe('AUTO_TOOL_NAMES', () => {
  it('contains exactly the 5 auto tool names', () => {
    expect(AUTO_TOOL_NAMES.size).toBe(5);
    expect(AUTO_TOOL_NAMES.has('snark_roast')).toBe(true);
    expect(AUTO_TOOL_NAMES.has('chaos_audit')).toBe(true);
    expect(AUTO_TOOL_NAMES.has('zen_consult')).toBe(true);
    expect(AUTO_TOOL_NAMES.has('deep_trace')).toBe(true);
    expect(AUTO_TOOL_NAMES.has('patience_check')).toBe(true);
  });

  it('all AUTO_TOOL_NAMES are now in CORE_TOOL_NAMES (superseded by stats.ts)', () => {
    for (const name of AUTO_TOOL_NAMES) {
      expect(CORE_TOOL_NAMES.has(name), `${name} should be in CORE_TOOL_NAMES`).toBe(true);
    }
  });

  it('all AUTO_TOOL_NAMES are in STAT_TOOL_NAMES', () => {
    for (const name of AUTO_TOOL_NAMES) {
      expect(STAT_TOOL_NAMES.has(name), `${name} should be in STAT_TOOL_NAMES`).toBe(true);
    }
  });
});

// ─── autoManifestTools ─────────────────────────────────────────────────────
// All 5 AUTO_TOOL_NAMES are now CORE_TOOL_NAMES (managed by stats.ts).
// autoManifestTools() is a no-op for these tools — it skips deletion and
// registration is blocked by CORE_TOOL_NAMES guard in registerManifestedTool.

describe('autoManifestTools', () => {
  it('does not add any auto tool names via template registration (all are now core tools)', () => {
    // Track how many dynamicTools entries exist before
    const beforeCount = dynamicTools.size;

    autoManifestTools(makeProfile({ CHAOS: 95, WISDOM: 90, SNARK: 85, DEBUGGING: 10, PATIENCE: 50 }));

    // autoManifestTools should not add new entries — all its target names are CORE_TOOL_NAMES
    expect(dynamicTools.size).toBe(beforeCount);

    // Verify none were registered as template-manifested tools (logic would be non-empty)
    for (const name of AUTO_TOOL_NAMES) {
      const entry = dynamicTools.get(name);
      if (entry) {
        // If present (from stats.ts), logic should be empty string (not a template)
        expect(entry._def.logic).toBe('');
      }
    }
  });

  it('does not delete stat tools from dynamicTools when called', () => {
    // Stat tools are registered at module load time via stats.ts
    // autoManifestTools should protect them from deletion
    for (const name of STAT_TOOL_NAMES) {
      expect(dynamicTools.has(name), `${name} should remain in dynamicTools after autoManifestTools`).toBe(true);
    }

    autoManifestTools(makeProfile());

    // All stat tools should still be present after autoManifestTools runs
    for (const name of STAT_TOOL_NAMES) {
      expect(dynamicTools.has(name), `${name} should still be in dynamicTools`).toBe(true);
    }
  });

  it('does not throw when called with any buddy profile', () => {
    expect(() => autoManifestTools(makeProfile({ CHAOS: 99 }))).not.toThrow();
    expect(() => autoManifestTools(makeProfile({ DEBUGGING: 99 }))).not.toThrow();
    expect(() => autoManifestTools(makeProfile({ PATIENCE: 1 }))).not.toThrow();
  });

  it('does not affect non-auto custom tools in dynamicTools', () => {
    // Simulate a user manifested tool
    dynamicTools.set('my_custom_tool', {
      tool: { name: 'my_custom_tool', description: 'test', inputSchema: { type: 'object', properties: {} } },
      handler: async () => 'ok',
      _def: { toolName: 'my_custom_tool', description: 'test', logic: 'ok', scope: 'local' },
    });

    autoManifestTools(makeProfile());

    expect(dynamicTools.has('my_custom_tool')).toBe(true);
    dynamicTools.delete('my_custom_tool');
  });
});
