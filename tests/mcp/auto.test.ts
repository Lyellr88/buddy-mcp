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
  dynamicTools.clear();
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
});

// ─── autoManifestTools ─────────────────────────────────────────────────────

describe('autoManifestTools', () => {
  it('registers tools for the top 3 dominant traits', () => {
    const buddy = makeProfile({ CHAOS: 95, WISDOM: 90, SNARK: 85, DEBUGGING: 10, PATIENCE: 50 });
    autoManifestTools(buddy);
    expect(dynamicTools.has('chaos_audit')).toBe(true);
    expect(dynamicTools.has('zen_consult')).toBe(true);
    expect(dynamicTools.has('snark_roast')).toBe(true);
  });

  it('registers chaos_audit for a high-chaos buddy', () => {
    autoManifestTools(makeProfile({ CHAOS: 99, DEBUGGING: 1, PATIENCE: 90, WISDOM: 1, SNARK: 1 }));
    expect(dynamicTools.has('chaos_audit')).toBe(true);
  });

  it('registers zen_consult for a high-wisdom buddy', () => {
    autoManifestTools(makeProfile({ WISDOM: 99, CHAOS: 1, PATIENCE: 90, DEBUGGING: 1, SNARK: 1 }));
    expect(dynamicTools.has('zen_consult')).toBe(true);
  });

  it('registers deep_trace for a high-debugging buddy', () => {
    autoManifestTools(makeProfile({ DEBUGGING: 99, CHAOS: 1, PATIENCE: 90, WISDOM: 1, SNARK: 1 }));
    expect(dynamicTools.has('deep_trace')).toBe(true);
  });

  it('registers snark_roast for a high-snark buddy', () => {
    autoManifestTools(makeProfile({ SNARK: 99, CHAOS: 1, PATIENCE: 90, WISDOM: 1, DEBUGGING: 1 }));
    expect(dynamicTools.has('snark_roast')).toBe(true);
  });

  it('registers patience_check for a very-low-patience buddy (inversion)', () => {
    // PATIENCE=1 → effective 99 → should be top trait
    autoManifestTools(makeProfile({ PATIENCE: 1, CHAOS: 10, WISDOM: 10, DEBUGGING: 10, SNARK: 10 }));
    expect(dynamicTools.has('patience_check')).toBe(true);
  });

  it('registers at most 3 auto tools', () => {
    autoManifestTools(makeProfile());
    const autoRegistered = [...dynamicTools.keys()].filter((k) => AUTO_TOOL_NAMES.has(k));
    expect(autoRegistered.length).toBeLessThanOrEqual(3);
  });

  it('clears old auto tools on re-call and registers new ones', () => {
    autoManifestTools(makeProfile({ CHAOS: 99, WISDOM: 80, SNARK: 70, DEBUGGING: 1, PATIENCE: 90 }));
    expect(dynamicTools.has('chaos_audit')).toBe(true);

    // Re-call with a completely different profile
    autoManifestTools(makeProfile({ DEBUGGING: 99, WISDOM: 80, SNARK: 70, CHAOS: 1, PATIENCE: 90 }));
    // chaos_audit should be gone (cleared), deep_trace should be in
    expect(dynamicTools.has('chaos_audit')).toBe(false);
    expect(dynamicTools.has('deep_trace')).toBe(true);
  });

  it('does not register duplicate tools in a single call', () => {
    autoManifestTools(makeProfile({ CHAOS: 90, WISDOM: 85, SNARK: 80, DEBUGGING: 75, PATIENCE: 50 }));
    const allKeys = [...dynamicTools.keys()];
    const uniqueKeys = new Set(allKeys);
    expect(allKeys.length).toBe(uniqueKeys.size);
  });

  it('registered tool has a non-empty description and logic', () => {
    autoManifestTools(makeProfile({ WISDOM: 99, CHAOS: 1, PATIENCE: 90, DEBUGGING: 1, SNARK: 1 }));
    const entry = dynamicTools.get('zen_consult');
    expect(entry).toBeDefined();
    expect(entry!._def.description.length).toBeGreaterThan(0);
    expect(entry!._def.logic.length).toBeGreaterThan(0);
    expect(entry!._def.scope).toBe('global');
  });
});
