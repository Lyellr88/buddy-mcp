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

// Side-effect import — registers all 7 core tools into dynamicTools
import '@/mcp/tools/core.js';
import { S, gachaState, dynamicTools } from '@/mcp/state.js';
import { getAffectionWeights } from '@/constants.js';
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
  gachaState.discoveredSpecies = [];
  gachaState.shinyCount = 0;
  gachaState.petCount = 0;
  gachaState.manifestedTools = [];
  vi.clearAllMocks();
});

// ─── Registration block ────────────────────────────────────────────────────

describe('core tool registration', () => {
  it('registers all 6 core tools into dynamicTools', () => {
    const coreNames = [
      'get_buddy_card', 'pet_buddy', 'buddy_speak',
      'reroll_buddy',
      'view_buddy_dex',
    ];
    for (const name of coreNames) {
      expect(dynamicTools.has(name), `missing tool: ${name}`).toBe(true);
    }
  });
});

// ─── get_buddy_card ────────────────────────────────────────────────────────

describe('get_buddy_card', () => {
  it('returns prompt when no buddy', async () => {
    const result = await getHandler('get_buddy_card')({});
    expect(result).toContain('Initialize a buddy first');
  });

  it('returns a card with buddy name and rarity when buddy is set', async () => {
    S.currentBuddy = makeBuddy({ name: 'Quackers', rarity: 'epic' });
    const result = await getHandler('get_buddy_card')({});
    expect(result).toContain('Quackers');
    expect(result).toContain('EPIC');
  });

  it('includes shiny tag when buddy is shiny', async () => {
    S.currentBuddy = makeBuddy({ shiny: true });
    const result = await getHandler('get_buddy_card')({});
    expect(result).toContain('SHINY');
  });

  it('includes hat line when buddy has a hat', async () => {
    S.currentBuddy = makeBuddy({ hat: 'tinyduck' });
    const result = await getHandler('get_buddy_card')({});
    expect(result).toContain('tinyduck');
  });

  it('includes all 5 stat bars', async () => {
    S.currentBuddy = makeBuddy();
    const result = await getHandler('get_buddy_card')({});
    expect(result).toContain('DEBUGGING');
    expect(result).toContain('PATIENCE');
    expect(result).toContain('CHAOS');
    expect(result).toContain('WISDOM');
    expect(result).toContain('SNARK');
  });
});

// ─── buddy_speak ───────────────────────────────────────────────────────────

describe('buddy_speak', () => {
  it('returns prompt when no buddy', async () => {
    const result = await getHandler('buddy_speak')({});
    expect(result).toContain('Initialize a buddy first');
  });

  it('returns a non-empty remark with buddy name when buddy is set', async () => {
    S.currentBuddy = makeBuddy({ name: 'Waddles' });
    const result = await getHandler('buddy_speak')({});
    expect(result).toContain('Waddles');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── pet_buddy ─────────────────────────────────────────────────────────────

describe('pet_buddy', () => {
  it('returns prompt when no buddy', async () => {
    const result = await getHandler('pet_buddy')({});
    expect(result).toContain('No buddy to pet');
  });

  it('does not increment petCount when no buddy', async () => {
    await getHandler('pet_buddy')({});
    expect(gachaState.petCount).toBe(0);
  });

  it('increments petCount on each call', async () => {
    S.currentBuddy = makeBuddy();
    await getHandler('pet_buddy')({});
    expect(gachaState.petCount).toBe(1);
    await getHandler('pet_buddy')({});
    expect(gachaState.petCount).toBe(2);
  });

  it('calls saveGachaState after increment', async () => {
    const { writeFileSync } = await import('fs');
    S.currentBuddy = makeBuddy();
    await getHandler('pet_buddy')({});
    expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
  });

  it('includes affection footer below 25 pets', async () => {
    S.currentBuddy = makeBuddy({ name: 'Feathers' });
    gachaState.petCount = 0;
    const result = await getHandler('pet_buddy')({});
    expect(result).toContain('💝 Affection: 1 pets');
    expect(result).toContain('Next milestone: 25');
  });

  it('includes uncommon milestone label at 25 pets', async () => {
    S.currentBuddy = makeBuddy();
    gachaState.petCount = 24;
    const result = await getHandler('pet_buddy')({});
    expect(result).toContain('💝 Affection: 25 pets');
    expect(result).toContain('Uncommon+');
  });

  it('includes rare milestone label at 50 pets', async () => {
    S.currentBuddy = makeBuddy();
    gachaState.petCount = 49;
    const result = await getHandler('pet_buddy')({});
    expect(result).toContain('💝 Affection: 50 pets');
    expect(result).toContain('Rare+');
  });

  it('includes epic/legendary label at 75+ pets', async () => {
    S.currentBuddy = makeBuddy();
    gachaState.petCount = 74;
    const result = await getHandler('pet_buddy')({});
    expect(result).toContain('💝 Affection: 75 pets');
    expect(result).toContain('Epic/Legendary');
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
    const results = await Promise.all(Array.from({ length: 20 }, () => getHandler('pet_buddy')({})));
    expect(results.some((r) => r.includes('Feathers'))).toBe(true);
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
    vi.mocked(findClaudeBinary).mockImplementationOnce(() => { throw new Error('missing'); });
    const result = await getHandler('reroll_buddy')({});
    expect(result).toContain('binary not found');
  });
});

// ─── getAffectionWeights ──────────────────────────────────────────────────

describe('getAffectionWeights', () => {
  it('returns baseline weights at 0 pets', () => {
    const w = getAffectionWeights(0);
    expect(w.common).toBe(60);
    expect(w.uncommon).toBe(25);
    expect(w.rare).toBe(10);
  });

  it('returns baseline weights at 24 pets', () => {
    const w = getAffectionWeights(24);
    expect(w.common).toBe(60);
  });

  it('locks out common at 25 pets', () => {
    const w = getAffectionWeights(25);
    expect(w.common).toBe(0);
    expect(w.uncommon).toBeGreaterThan(0);
  });

  it('locks out common at 49 pets', () => {
    const w = getAffectionWeights(49);
    expect(w.common).toBe(0);
    expect(w.uncommon).toBeGreaterThan(0);
  });

  it('locks out common and uncommon at 50 pets', () => {
    const w = getAffectionWeights(50);
    expect(w.common).toBe(0);
    expect(w.uncommon).toBe(0);
    expect(w.rare).toBeGreaterThan(0);
  });

  it('at 75+ pets epic weight exceeds rare weight', () => {
    const w = getAffectionWeights(75);
    expect(w.common).toBe(0);
    expect(w.uncommon).toBe(0);
    expect(w.epic).toBeGreaterThan(w.rare);
    expect(w.legendary).toBeGreaterThan(0);
  });

  it('at 100 pets same weights as 75', () => {
    expect(getAffectionWeights(100)).toEqual(getAffectionWeights(75));
  });
});