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

// Side-effect import — registers all 10 core tools into dynamicTools
import '@/mcp/tools/core.js';
import { S, gachaState, dynamicTools } from '@/mcp/state.js';
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
  gachaState.manifestedTools = [];
  vi.clearAllMocks();
});

// ─── Registration block ────────────────────────────────────────────────────

describe('core tool registration', () => {
  it('registers all 10 core tools into dynamicTools', () => {
    const coreNames = [
      'initialize_buddy', 'get_buddy_card', 'pet_buddy', 'buddy_speak',
      'manifest_buddy_tool', 'vibe_check', 'reroll_buddy',
      'view_buddy_dex', 'restore_buddy',
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

  it('always returns a non-empty string with buddy name', async () => {
    S.currentBuddy = makeBuddy({ name: 'Feathers' });
    for (let i = 0; i < 10; i++) {
      const result = await getHandler('pet_buddy')({});
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('includes buddy name in response', async () => {
    S.currentBuddy = makeBuddy({ name: 'Feathers' });
    // Run enough times to hit at least the default path
    const results = await Promise.all(Array.from({ length: 20 }, () => getHandler('pet_buddy')({})));
    expect(results.some((r) => r.includes('Feathers'))).toBe(true);
  });
});

// ─── vibe_check ────────────────────────────────────────────────────────────

describe('vibe_check', () => {
  it('returns prompt when no buddy', async () => {
    const result = await getHandler('vibe_check')({});
    expect(result).toContain('Initialize a buddy first');
  });

  it('returns a non-empty string when buddy is set', async () => {
    S.currentBuddy = makeBuddy();
    const result = await getHandler('vibe_check')({});
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
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

// ─── initialize_buddy ─────────────────────────────────────────────────────

describe('initialize_buddy', () => {
  it('sets S.currentBuddy with provided data', async () => {
    await getHandler('initialize_buddy')({
      name: 'Quill',
      species: 'owl',
      rarity: 'legendary',
      bio: 'A wise owl.',
      ascii: '(o_o)',
      stats: { debugging: 80, patience: 60, chaos: 30, wisdom: 95, snark: 20 },
    });
    expect(S.currentBuddy).not.toBeNull();
    expect(S.currentBuddy?.name).toBe('Quill');
    expect(S.currentBuddy?.species).toBe('owl');
    expect(S.currentBuddy?.stats['WISDOM']).toBe(95);
  });

  it('returns sync confirmation message', async () => {
    const result = await getHandler('initialize_buddy')({
      name: 'Quill',
      species: 'owl',
      rarity: 'legendary',
      bio: 'bio',
      ascii: 'art',
      stats: { debugging: 50, patience: 50, chaos: 50, wisdom: 50, snark: 50 },
    });
    expect(result).toContain('Quill');
    expect(result).toContain('Synced');
  });
});

// ─── manifest_buddy_tool ──────────────────────────────────────────────────

describe('manifest_buddy_tool', () => {
  it('returns prompt when no buddy', async () => {
    const result = await getHandler('manifest_buddy_tool')({
      toolName: 'new_tool', description: 'desc', logic: 'logic',
    });
    expect(result).toContain('Initialize a buddy first');
  });

  it('registers a new tool and returns confirmation', async () => {
    S.currentBuddy = makeBuddy({ name: 'Inventor' });
    const result = await getHandler('manifest_buddy_tool')({
      toolName: 'my_invented_tool', description: 'Does things', logic: 'Hello!', scope: 'local',
    });
    expect(dynamicTools.has('my_invented_tool')).toBe(true);
    expect(result).toContain('my_invented_tool');
  });

  it('returns duplicate warning if tool name already exists', async () => {
    S.currentBuddy = makeBuddy();
    dynamicTools.set('taken_tool', {
      tool: { name: 'taken_tool', description: 'x', inputSchema: { type: 'object', properties: {} } },
      handler: async () => '',
      _def: { toolName: 'taken_tool', description: 'x', logic: 'x', scope: 'local' },
    });
    const result = await getHandler('manifest_buddy_tool')({
      toolName: 'taken_tool', description: 'desc', logic: 'logic',
    });
    expect(result).toContain('already exists');
  });
});

// ─── restore_buddy ────────────────────────────────────────────────────────

describe('restore_buddy', () => {
  it('returns success message when restoreBinary succeeds', async () => {
    const { restoreBinary } = await import('@/patcher/patch.js');
    vi.mocked(restoreBinary).mockImplementationOnce(() => {});
    const result = await getHandler('restore_buddy')({});
    expect(result).toContain('restored');
  });

  it('returns error message when binary not found', async () => {
    const { findClaudeBinary } = await import('@/patcher/binary-finder.js');
    vi.mocked(findClaudeBinary).mockImplementationOnce(() => { throw new Error('not found'); });
    const result = await getHandler('restore_buddy')({});
    expect(result).toContain('❌');
    expect(result).toContain('not found');
  });

  it('returns error when restoreBinary fails', async () => {
    const { restoreBinary } = await import('@/patcher/patch.js');
    vi.mocked(restoreBinary).mockImplementationOnce(() => { throw new Error('permission denied'); });
    const result = await getHandler('restore_buddy')({});
    expect(result).toContain('❌');
    expect(result).toContain('permission denied');
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
