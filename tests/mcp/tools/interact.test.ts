import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => false),
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({})),
}));

// ─── Imports ───────────────────────────────────────────────────────────────

import '@/mcp/tools/interact.js';
import { S, gachaState, dynamicTools } from '@/mcp/state.js';
import { buildInteractInstruction, INTERACT_TRIGGERS } from '@/personalities.js';
import type { ProfileData } from '@/types.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeBuddy(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    name: 'Chester',
    species: 'cat',
    rarity: 'rare',
    eye: 'normal',
    hat: 'none',
    shiny: false,
    peak: false,
    stats: { DEBUGGING: 60, PATIENCE: 40, CHAOS: 30, WISDOM: 55, SNARK: 80 },
    personality: 'A test cat.',
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
  gachaState.interactMode = false;
  vi.clearAllMocks();
});

// ─── Tool registration ─────────────────────────────────────────────────────

describe('interact tool registration', () => {
  it('registers activate_buddy_interact', () => {
    expect(dynamicTools.has('activate_buddy_interact')).toBe(true);
  });

  it('registers deactivate_buddy_interact', () => {
    expect(dynamicTools.has('deactivate_buddy_interact')).toBe(true);
  });
});

// ─── activate_buddy_interact ───────────────────────────────────────────────

describe('activate_buddy_interact', () => {
  it('returns initialize prompt when no buddy', async () => {
    const result = await getHandler('activate_buddy_interact')({});
    expect(result).toContain('Initialize a buddy first');
  });

  it('returns already watching when mode already active', async () => {
    S.currentBuddy = makeBuddy({ name: 'Chester' });
    gachaState.interactMode = true;
    const result = await getHandler('activate_buddy_interact')({});
    expect(result).toContain('already watching');
    expect(result).toContain('Chester');
  });

  it('sets interactMode to true', async () => {
    S.currentBuddy = makeBuddy();
    await getHandler('activate_buddy_interact')({});
    expect(gachaState.interactMode).toBe(true);
  });

  it('calls saveGachaState', async () => {
    const { writeFileSync } = await import('fs');
    S.currentBuddy = makeBuddy();
    await getHandler('activate_buddy_interact')({});
    expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
  });

  it('returns instruction string containing buddy name', async () => {
    S.currentBuddy = makeBuddy({ name: 'Chester' });
    const result = await getHandler('activate_buddy_interact')({});
    expect(result).toContain('Chester');
  });

  it('returns instruction string with BUDDY INTERACTION MODE header', async () => {
    S.currentBuddy = makeBuddy();
    const result = await getHandler('activate_buddy_interact')({});
    expect(result).toContain('BUDDY INTERACTION MODE');
  });
});

// ─── deactivate_buddy_interact ────────────────────────────────────────────

describe('deactivate_buddy_interact', () => {
  it('returns not watching message when inactive', async () => {
    const result = await getHandler('deactivate_buddy_interact')({});
    expect(result).toContain("wasn't watching");
  });

  it('sets interactMode to false when active', async () => {
    S.currentBuddy = makeBuddy();
    gachaState.interactMode = true;
    await getHandler('deactivate_buddy_interact')({});
    expect(gachaState.interactMode).toBe(false);
  });

  it('calls saveGachaState on deactivate', async () => {
    const { writeFileSync } = await import('fs');
    S.currentBuddy = makeBuddy();
    gachaState.interactMode = true;
    await getHandler('deactivate_buddy_interact')({});
    expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
  });

  it('returns farewell quip with buddy name', async () => {
    S.currentBuddy = makeBuddy({ name: 'Chester' });
    gachaState.interactMode = true;
    const result = await getHandler('deactivate_buddy_interact')({});
    expect(result).toContain('Chester');
    expect(result).toContain('stops watching');
  });
});

// ─── buildInteractInstruction ─────────────────────────────────────────────

describe('buildInteractInstruction', () => {
  it('includes buddy name', () => {
    const result = buildInteractInstruction(makeBuddy({ name: 'Chester' }));
    expect(result).toContain('Chester');
  });

  it('includes dominant stat trigger language', () => {
    const buddy = makeBuddy({ stats: { DEBUGGING: 20, PATIENCE: 20, CHAOS: 20, WISDOM: 20, SNARK: 90 } });
    const result = buildInteractInstruction(buddy);
    expect(result).toContain('SNARK');
  });

  it('includes HONK override for goose species', () => {
    const buddy = makeBuddy({ species: 'goose' });
    const result = buildInteractInstruction(buddy);
    expect(result.toUpperCase()).toContain('HONK');
  });

  it('mentions very rarely for capybara', () => {
    const buddy = makeBuddy({ species: 'capybara' });
    const result = buildInteractInstruction(buddy);
    expect(result).toContain('very rarely');
  });

  it('mentions frequently for chaos dominant buddy', () => {
    const buddy = makeBuddy({ stats: { DEBUGGING: 20, PATIENCE: 50, CHAOS: 90, WISDOM: 20, SNARK: 20 } });
    const result = buildInteractInstruction(buddy);
    expect(result).toContain('frequently');
  });
});

// ─── INTERACT_TRIGGERS ────────────────────────────────────────────────────

describe('INTERACT_TRIGGERS', () => {
  const statNames = ['SNARK', 'CHAOS', 'WISDOM', 'DEBUGGING', 'PATIENCE'] as const;

  it('has entries for all 5 stat names', () => {
    for (const stat of statNames) {
      expect(INTERACT_TRIGGERS[stat], `missing stat: ${stat}`).toBeDefined();
    }
  });

  it('each stat has a random quip pool', () => {
    for (const stat of statNames) {
      expect(INTERACT_TRIGGERS[stat]?.['random']?.length).toBeGreaterThan(0);
    }
  });

  it('each stat has error and success pools', () => {
    for (const stat of statNames) {
      expect(INTERACT_TRIGGERS[stat]?.['error']?.length).toBeGreaterThan(0);
      expect(INTERACT_TRIGGERS[stat]?.['success']?.length).toBeGreaterThan(0);
    }
  });
});
