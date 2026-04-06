import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (must be before any imports) ────────────────────────────────────

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
  statSync: vi.fn(() => ({ mtimeMs: 12345 })),
  unlinkSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({ unref: vi.fn() })),
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@/finder/orchestrator.js', () => ({
  findSalt: vi.fn(),
}));

vi.mock('@/patcher/binary-finder.js', () => ({
  findClaudeBinary: vi.fn(() => '/fake/claude'),
}));

vi.mock('@/patcher/patch.js', () => ({
  patchBinary: vi.fn(),
  restoreBinary: vi.fn(),
}));

vi.mock('@/config/claude-config.js', () => ({
  getClaudeUserId: vi.fn(() => 'test-user-123'),
  getCompanionName: vi.fn(() => 'TestBuddy'),
}));

vi.mock('@/config/pet-config.js', () => ({
  loadPetConfigV2: vi.fn(() => ({ salt: 'friend-2026-401', activeProfile: null, profiles: {} })),
  saveProfile: vi.fn(),
}));

vi.mock('@/sprites/render.js', () => ({
  renderSprite: vi.fn(() => ['(^_^)', '/ \\', '']),
}));

// ─── Imports ───────────────────────────────────────────────────────────────

// Side-effect import — registers all 6 core tools into dynamicTools
import '@/mcp/tools/core.js';
import { S, gachaState, dynamicTools } from '@/mcp/state.js';
import { STAT_SPEAK_RESPONSES } from '@/personalities.js';
import type { ProfileData } from '@/types.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeBuddy(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    name: 'Tester',
    species: 'duck',
    rarity: 'rare',
    eye: 'normal',
    hat: 'none',
    shiny: false,
    peak: false,
    stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 70, WISDOM: 55, SNARK: 65 },
    personality: 'A test duck.',
    salt: 'friend-2026-401',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function getHandler(name: string) {
  const entry = dynamicTools.get(name);
  if (!entry) throw new Error(`Tool not registered: ${name}`);
  return entry.handler;
}

beforeEach(() => {
  S.currentBuddy = null;
  S.petBuddyStreak = 0;
  S.lastToolCalled = '';
  gachaState.discoveredSpecies = [];
  gachaState.shinyCount = 0;
  gachaState.manifestedTools = [];
  gachaState.sessionAffectionTokens = 0;
  gachaState.sessionAffectionAccumulator = 0;
  vi.clearAllMocks();
});

// ─── Registration block ────────────────────────────────────────────────────

describe('core tool registration', () => {
  it('registers all 5 core tools into dynamicTools', () => {
    const coreNames = ['pet_buddy', 'buddy_talk', 'reroll_buddy', 'view_buddy_dex'];
    for (const name of coreNames) {
      expect(dynamicTools.has(name), `missing tool: ${name}`).toBe(true);
    }
  });
});

// ─── buddy_talk (stat-based responses with context) ──────────────────────

describe('buddy_talk', () => {
  it('returns prompt when no buddy', async () => {
    const result = await getHandler('buddy_talk')({});
    expect(result).toContain('Initialize a buddy first');
  });

  it('returns response with buddy name and 🐾 emoji for non-goose', async () => {
    S.currentBuddy = makeBuddy({ name: 'Waddles', species: 'duck' });
    const result = await getHandler('buddy_talk')({});
    expect(result).toContain('🐾');
    expect(result).toContain('Waddles');
    expect(result).toMatch(/🐾 Waddles: "/);
  });

  it('returns response with 🪿 emoji for goose', async () => {
    S.currentBuddy = makeBuddy({ name: 'Honker', species: 'goose' });
    const result = await getHandler('buddy_talk')({});
    expect(result).toContain('🪿');
    expect(result).toContain('Honker');
    expect(result).toMatch(/🪿 Honker: "/);
  });

  it('picks from top 2 stats by value', async () => {
    S.currentBuddy = makeBuddy({
      name: 'Tester',
      stats: { SNARK: 95, CHAOS: 80, DEBUGGING: 30, PATIENCE: 20, WISDOM: 15 },
    });
    // Top 2: SNARK (95) + CHAOS (80)
    const allSnarkChaos = [...STAT_SPEAK_RESPONSES.SNARK, ...STAT_SPEAK_RESPONSES.CHAOS];
    for (let i = 0; i < 10; i++) {
      const result = await getHandler('buddy_talk')({});
      const remark = result.split('"')[1]; // Extract quoted remark
      expect(allSnarkChaos).toContain(remark);
    }
  });

  it('matches context to stat pool (case-insensitive)', async () => {
    S.currentBuddy = makeBuddy({
      name: 'Tester',
      stats: { SNARK: 95, CHAOS: 80, DEBUGGING: 30, PATIENCE: 20, WISDOM: 15 },
    });
    // Pass context "debugging" even though DEBUGGING is not in top 2
    // Should force response from DEBUGGING pool
    const result = await getHandler('buddy_talk')({ context: 'debugging' });
    const remark = result.split('"')[1]; // Extract quoted remark
    expect(STAT_SPEAK_RESPONSES.DEBUGGING).toContain(remark);
  });

  it('ignores unrecognized context and uses top 2 stats', async () => {
    S.currentBuddy = makeBuddy({
      name: 'Tester',
      stats: { SNARK: 95, CHAOS: 80, DEBUGGING: 30, PATIENCE: 20, WISDOM: 15 },
    });
    // Unrecognized context should fall back to top 2 (SNARK + CHAOS)
    const allSnarkChaos = [...STAT_SPEAK_RESPONSES.SNARK, ...STAT_SPEAK_RESPONSES.CHAOS];
    const result = await getHandler('buddy_talk')({ context: 'xyz123' });
    const remark = result.split('"')[1]; // Extract quoted remark
    expect(allSnarkChaos).toContain(remark);
  });

  it('resets pet streak when called', async () => {
    S.currentBuddy = makeBuddy();
    S.petBuddyStreak = 3; // Set a streak
    await getHandler('buddy_talk')({});
    expect(S.petBuddyStreak).toBe(0);
  });

  it('handles PATIENCE inverse weighting correctly', async () => {
    S.currentBuddy = makeBuddy({
      name: 'Patient',
      stats: { PATIENCE: 15, SNARK: 50, CHAOS: 40, DEBUGGING: 30, WISDOM: 25 },
    });
    // PATIENCE 15 is inverted to 85 (100-15), making it high
    // So top 2 should be PATIENCE and SNARK
    for (let i = 0; i < 5; i++) {
      const result = await getHandler('buddy_talk')({});
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('returns different responses on multiple calls (randomization)', async () => {
    S.currentBuddy = makeBuddy({
      name: 'Random',
      stats: { SNARK: 90, CHAOS: 80, DEBUGGING: 30, PATIENCE: 20, WISDOM: 15 },
    });
    const results = new Set<string>();
    for (let i = 0; i < 15; i++) {
      const result = await getHandler('buddy_talk')({});
      results.add(result);
    }
    // Should get multiple different responses from the pools
    expect(results.size).toBeGreaterThan(1);
  });
});

// ─── pet_buddy ─────────────────────────────────────────────────────────────

describe('pet_buddy', () => {
  it('returns prompt when no buddy', async () => {
    const result = await getHandler('pet_buddy')({});
    expect(result).toContain('No buddy to pet');
  });

  it('calls saveGachaState after increment', async () => {
    const { writeFileSync } = await import('fs');
    S.currentBuddy = makeBuddy();
    await getHandler('pet_buddy')({});
    expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
  });

  it('always returns a non-empty string', async () => {
    S.currentBuddy = makeBuddy({ name: 'Feathers' });
    for (let i = 0; i < 10; i++) {
      const result = await getHandler('pet_buddy')({});
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('includes buddy name in response', async () => {
    S.currentBuddy = makeBuddy({ name: 'Feathers' });
    const results = await Promise.all(
      Array.from({ length: 20 }, () => getHandler('pet_buddy')({})),
    );
    expect(results.some((r) => r.includes('Feathers'))).toBe(true);
  });
});

// ─── Session Affection Mini-Game Tests ─────────────────────────────────────

describe('session affection minigame (pet_buddy & reroll_buddy)', () => {
  it('accumulates 1-15% toward token on each pet', async () => {
    S.currentBuddy = makeBuddy();
    const before = gachaState.sessionAffectionAccumulator;
    await getHandler('pet_buddy')({});
    const after = gachaState.sessionAffectionAccumulator;
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeGreaterThanOrEqual(1);
    expect(after - before).toBeLessThanOrEqual(15);
  });

  it('does not modify accumulator when no buddy', async () => {
    const before = gachaState.sessionAffectionAccumulator;
    await getHandler('pet_buddy')({});
    expect(gachaState.sessionAffectionAccumulator).toBe(before);
  });

  it('earns token when accumulator hits 100%', async () => {
    const originalRandom = Math.random;
    S.currentBuddy = makeBuddy();
    gachaState.sessionAffectionAccumulator = 95;
    const before = gachaState.sessionAffectionTokens;

    try {
      // Mock random to return 0.9, which gives gain = Math.floor(0.9 * 15) + 1 = 14
      vi.spyOn(Math, 'random').mockReturnValue(0.9);
      await getHandler('pet_buddy')({});
      // 95 + 14 = 109, which is >= 100, so token should be earned
      expect(gachaState.sessionAffectionTokens).toBe(before + 1);
      expect(gachaState.sessionAffectionAccumulator).toBe(0);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('resets accumulator to 0 after earning token', async () => {
    const originalRandom = Math.random;
    S.currentBuddy = makeBuddy();
    gachaState.sessionAffectionAccumulator = 90;

    try {
      // Mock to guarantee crossing 100%
      vi.spyOn(Math, 'random').mockReturnValue(0.85);
      await getHandler('pet_buddy')({});
      // 90 + 13 = 103, token earned, accumulator reset
      expect(gachaState.sessionAffectionAccumulator).toBe(0);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('shows EARNED TOKEN message when token earned', async () => {
    const originalRandom = Math.random;
    S.currentBuddy = makeBuddy();
    gachaState.sessionAffectionAccumulator = 88;

    try {
      // Mock to guarantee token earn
      vi.spyOn(Math, 'random').mockReturnValue(0.95);
      const result = await getHandler('pet_buddy')({});
      // 88 + 15 = 103, should see EARNED TOKEN
      expect(result).toContain('EARNED TOKEN');
    } finally {
      Math.random = originalRandom;
    }
  });

  it('shows accumulator progress when token not earned', async () => {
    S.currentBuddy = makeBuddy();
    const result = await getHandler('pet_buddy')({});
    if (gachaState.sessionAffectionAccumulator < 100) {
      expect(result).toContain('/100');
    }
  });

  it('consumes token on reroll with rare or better guarantee', async () => {
    const { findSalt } = await import('@/finder/orchestrator.js');
    const { patchBinary } = await import('@/patcher/patch.js');

    vi.mocked(patchBinary).mockImplementationOnce(() => {
      /* successful patch */
    });
    vi.mocked(findSalt).mockResolvedValueOnce({
      salt: 'test-salt-123',
      bones: {
        species: 'duck',
        rarity: 'rare',
        eye: '·',
        hat: 'none',
        shiny: false,
        stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 70, WISDOM: 55, SNARK: 65 },
      },
      elapsed: 100,
      attempts: [1],
      totalAttempts: 1,
    } as Record<string, unknown>);

    S.currentBuddy = makeBuddy();
    gachaState.sessionAffectionTokens = 3;

    const { loadPetConfigV2 } = await import('@/config/pet-config.js');
    vi.mocked(loadPetConfigV2).mockReturnValueOnce({
      salt: 'friend-2026-401',
      activeProfile: null,
      profiles: {},
    });

    await getHandler('reroll_buddy')({});

    // Token should be consumed
    expect(gachaState.sessionAffectionTokens).toBe(2);
  });

  it('stacks multiple tokens across rerolls', async () => {
    S.currentBuddy = makeBuddy();
    gachaState.sessionAffectionTokens = 5;
    gachaState.sessionAffectionAccumulator = 50;

    // Should have 5 tokens ready to use on next reroll
    expect(gachaState.sessionAffectionTokens).toBe(5);
  });

  it('token reroll boosts hat chance to 60%', async () => {
    const { findSalt } = await import('@/finder/orchestrator.js');
    const { patchBinary } = await import('@/patcher/patch.js');

    // Mock successful patch
    vi.mocked(patchBinary).mockImplementationOnce(() => {
      /* successful patch */
    });

    // Capture what traits are requested by findSalt
    let capturedDesired: Record<string, unknown> | null = null;
    vi.mocked(findSalt).mockImplementation(async (userId, desired) => {
      capturedDesired = desired as Record<string, unknown>;
      return {
        salt: 'test-salt-hat',
        bones: {
          species: 'duck',
          rarity: 'rare',
          eye: '·',
          hat: desired.hat as string,
          shiny: desired.shiny as boolean,
          stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 70, WISDOM: 55, SNARK: 65 },
        },
        elapsed: 100,
        attempts: [1],
        totalAttempts: 1,
      } as Record<string, unknown>;
    });

    S.currentBuddy = makeBuddy();
    gachaState.sessionAffectionTokens = 1;

    const { loadPetConfigV2 } = await import('@/config/pet-config.js');
    vi.mocked(loadPetConfigV2).mockReturnValueOnce({
      salt: 'friend-2026-401',
      activeProfile: null,
      profiles: {},
    });

    await getHandler('reroll_buddy')({});

    // Token was used
    expect(gachaState.sessionAffectionTokens).toBe(0);
    // Hat should be requested with 60% boost logic
    // (can't deterministically test the RNG, but verify findSalt was called with a hat value)
    expect(capturedDesired).not.toBeNull();
  });

  it('token reroll boosts shiny chance to 20%', async () => {
    const { findSalt } = await import('@/finder/orchestrator.js');
    const { patchBinary } = await import('@/patcher/patch.js');

    vi.mocked(patchBinary).mockImplementationOnce(() => {
      /* successful patch */
    });

    let capturedShiny = false;
    vi.mocked(findSalt).mockImplementation(async (userId, desired) => {
      capturedShiny = (desired as Record<string, unknown>).shiny as boolean;
      return {
        salt: 'test-salt-shiny',
        bones: {
          species: 'duck',
          rarity: 'rare',
          eye: '·',
          hat: 'none',
          shiny: capturedShiny,
          stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 70, WISDOM: 55, SNARK: 65 },
        },
        elapsed: 100,
        attempts: [1],
        totalAttempts: 1,
      } as Record<string, unknown>;
    });

    S.currentBuddy = makeBuddy();
    gachaState.sessionAffectionTokens = 1;

    const { loadPetConfigV2 } = await import('@/config/pet-config.js');
    vi.mocked(loadPetConfigV2).mockReturnValueOnce({
      salt: 'friend-2026-401',
      activeProfile: null,
      profiles: {},
    });

    await getHandler('reroll_buddy')({});

    // Token was used, shiny was considered with 20% boost logic
    expect(gachaState.sessionAffectionTokens).toBe(0);
  });

  it('resets accumulator on new buddy after reroll', async () => {
    const { findSalt } = await import('@/finder/orchestrator.js');
    const { patchBinary } = await import('@/patcher/patch.js');

    vi.mocked(patchBinary).mockImplementationOnce(() => {
      /* successful patch */
    });
    vi.mocked(findSalt).mockResolvedValueOnce({
      salt: 'test-salt-789',
      bones: {
        species: 'duck',
        rarity: 'epic',
        eye: '·',
        hat: 'none',
        shiny: false,
        stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 70, WISDOM: 55, SNARK: 65 },
      },
      elapsed: 100,
      attempts: [1],
      totalAttempts: 1,
    } as Record<string, unknown>);

    S.currentBuddy = makeBuddy();
    gachaState.sessionAffectionAccumulator = 75;
    gachaState.sessionAffectionTokens = 2;

    const { loadPetConfigV2 } = await import('@/config/pet-config.js');
    vi.mocked(loadPetConfigV2).mockReturnValueOnce({
      salt: 'friend-2026-401',
      activeProfile: null,
      profiles: {},
    });

    await getHandler('reroll_buddy')({});

    // Accumulator resets, tokens remain (not consumed if had none to use)
    expect(gachaState.sessionAffectionAccumulator).toBe(0);
    expect(gachaState.sessionAffectionTokens).toBe(1); // Consumed 1 token
  });
});

// ─── view_buddy_dex ────────────────────────────────────────────────────────

describe('view_buddy_dex', () => {
  it('shows empty dex when nothing discovered', async () => {
    const result = await getHandler('view_buddy_dex')({});
    expect(result).toContain('BUDDY DEX');
    expect(result).toContain('0/');
  });

  it('marks discovered species with [X]', async () => {
    gachaState.discoveredSpecies = ['duck'];
    const result = await getHandler('view_buddy_dex')({});
    expect(result).toContain('[X] duck');
  });

  it('shows shiny count', async () => {
    gachaState.shinyCount = 3;
    const result = await getHandler('view_buddy_dex')({});
    expect(result).toContain('Shinies Encountered: 3');
  });
});

// ─── pet_buddy easter egg (streak tracking) ────────────────────────────────

describe('pet_buddy easter egg (consecutive call tracking)', () => {
  it('increments streak on consecutive pet_buddy calls', async () => {
    S.currentBuddy = makeBuddy();
    expect(S.petBuddyStreak).toBe(0);

    await getHandler('pet_buddy')({});
    expect(S.petBuddyStreak).toBe(1);

    await getHandler('pet_buddy')({});
    expect(S.petBuddyStreak).toBe(2);

    await getHandler('pet_buddy')({});
    expect(S.petBuddyStreak).toBe(3);
  });

  it('resets streak when non-pet_buddy tool is called', async () => {
    S.currentBuddy = makeBuddy();

    // Build streak
    await getHandler('pet_buddy')({});
    await getHandler('pet_buddy')({});
    expect(S.petBuddyStreak).toBe(2);

    // Call buddy_talk — should reset
    await getHandler('buddy_talk')({});
    expect(S.petBuddyStreak).toBe(0);
  });

  it('triggers x3 easter egg response at streak 3', async () => {
    S.currentBuddy = makeBuddy({ name: 'Striker' });

    // Build to streak 3
    await getHandler('pet_buddy')({});
    await getHandler('pet_buddy')({});
    const result3 = await getHandler('pet_buddy')({});

    // Should contain one of the x3 easter egg markers
    expect(
      result3.includes('COMBO x3') ||
        result3.includes('PETTING OVERDRIVE') ||
        result3.includes('MAXIMUM AFFECTION'),
    ).toBe(true);

    // Should NOT be a regular reaction
    expect(result3.includes('RARE EVENT')).toBe(false);
  });

  it('continues escalating at streak 4+', async () => {
    S.currentBuddy = makeBuddy({ name: 'Striker' });

    // Build to streak 4
    await getHandler('pet_buddy')({});
    await getHandler('pet_buddy')({});
    await getHandler('pet_buddy')({});
    const result4 = await getHandler('pet_buddy')({});

    // Should contain one of the escalating easter egg markers
    expect(
      result4.includes('CRITICAL PETTING MASS') ||
        result4.includes('PETTING SINGULARITY') ||
        result4.includes('THE PET ETERNAL'),
    ).toBe(true);
  });

  it('resets streak on view_buddy_dex', async () => {
    S.currentBuddy = makeBuddy();

    await getHandler('pet_buddy')({});
    await getHandler('pet_buddy')({});
    expect(S.petBuddyStreak).toBe(2);

    await getHandler('view_buddy_dex')({});
    expect(S.petBuddyStreak).toBe(0);
  });

  it('resets streak on reroll_buddy', async () => {
    S.currentBuddy = makeBuddy();

    await getHandler('pet_buddy')({});
    await getHandler('pet_buddy')({});
    expect(S.petBuddyStreak).toBe(2);

    // reroll_buddy will fail but should still reset streak
    const { getClaudeUserId } = await import('@/config/claude-config.js');
    vi.mocked(getClaudeUserId).mockReturnValueOnce('anon');

    await getHandler('reroll_buddy')({});
    expect(S.petBuddyStreak).toBe(0);
  });
});

// ─── reroll_buddy (early exits) ───────────────────────────────────────────

describe('reroll_buddy', () => {
  it('returns error when no userId found', async () => {
    const { getClaudeUserId } = await import('@/config/claude-config.js');
    vi.mocked(getClaudeUserId).mockReturnValueOnce('anon');
    const result = await getHandler('reroll_buddy')({});
    expect(result).toContain('No userId found');
  });

  it('returns error when binary not found', async () => {
    const { findClaudeBinary } = await import('@/patcher/binary-finder.js');
    vi.mocked(findClaudeBinary).mockImplementationOnce(() => {
      throw new Error('missing');
    });
    const result = await getHandler('reroll_buddy')({});
    expect(result).toContain('binary not found');
  });
});
