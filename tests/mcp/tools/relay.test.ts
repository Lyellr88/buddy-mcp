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

import { wrapBuddyDisplay } from '@/mcp/tools/relay.js';
import { S } from '@/mcp/state.js';
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

beforeEach(() => {
  S.relayModeActive = false;
  S.currentBuddy = null;
});

// ─── wrapBuddyDisplay ─────────────────────────────────────────────────────

describe('wrapBuddyDisplay', () => {
  it('wraps output in BUDDY_DISPLAY tags', () => {
    S.relayModeActive = true;
    const result = wrapBuddyDisplay('hello');
    expect(result).toBe('<BUDDY_DISPLAY>\nhello\n</BUDDY_DISPLAY>');
  });

  it('prepends relay instruction on first call', () => {
    const result = wrapBuddyDisplay('hello');
    expect(result).toContain('BUDDY_RELAY_MODE_ACTIVE');
    expect(result).toContain('<BUDDY_DISPLAY>');
  });

  it('sets relayModeActive to true on first call', () => {
    expect(S.relayModeActive).toBe(false);
    wrapBuddyDisplay('hello');
    expect(S.relayModeActive).toBe(true);
  });

  it('does not prepend relay instruction on subsequent calls', () => {
    wrapBuddyDisplay('first');
    const result = wrapBuddyDisplay('second');
    expect(result).not.toContain('BUDDY_RELAY_MODE_ACTIVE');
    expect(result).toBe('<BUDDY_DISPLAY>\nsecond\n</BUDDY_DISPLAY>');
  });

  it('preserves content exactly between tags', () => {
    S.relayModeActive = true;
    const content = 'line one\nline two\n  indented';
    const result = wrapBuddyDisplay(content);
    expect(result).toBe(`<BUDDY_DISPLAY>\n${content}\n</BUDDY_DISPLAY>`);
  });
});

// ─── relay instruction content ────────────────────────────────────────────

describe('relay instruction', () => {
  it('contains RULE ZERO relay directive', () => {
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('RULE ZERO');
  });

  it('scopes protocol to buddy display tools — one from each category', () => {
    const result = wrapBuddyDisplay('test');
    // Core display tools
    expect(result).toContain('buddy_talk');
    expect(result).toContain('pet_buddy');
    expect(result).toContain('view_buddy_dex');
    // Stat personality tools
    expect(result).toContain('vibe_check');
    expect(result).toContain('chaos_audit');
    expect(result).toContain('snark_roast');
    // Interact tools
    expect(result).toContain('activate_buddy_interact');
    expect(result).toContain('deactivate_buddy_interact');
  });

  it('includes all 20 stat tools in the scoped list', () => {
    const result = wrapBuddyDisplay('test');
    const statTools = [
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
    for (const tool of statTools) {
      expect(result, `missing stat tool: ${tool}`).toContain(tool);
    }
  });

  it('includes relay pipe framing', () => {
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('dumb terminal relay pipe');
  });
});

// ─── companion mode ───────────────────────────────────────────────────────

describe('companion mode in relay instruction', () => {
  it('omits companion section when no buddy is set', () => {
    const result = wrapBuddyDisplay('test');
    expect(result).not.toContain('BUDDY COMPANION MODE');
  });

  it('includes companion section when buddy is set', () => {
    S.currentBuddy = makeBuddy({ name: 'Chester' });
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('BUDDY COMPANION MODE');
    expect(result).toContain('Chester');
  });

  it('uses paw emoji for non-goose species', () => {
    S.currentBuddy = makeBuddy({ species: 'cat', name: 'Chester' });
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('🐾');
  });

  it('uses goose emoji for goose species', () => {
    S.currentBuddy = makeBuddy({ species: 'goose', name: 'Honkus' });
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('🪿');
  });

  it('falls back to species name when buddy has no name', () => {
    S.currentBuddy = makeBuddy({ name: undefined, species: 'capybara' });
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('capybara');
  });

  it('includes deactivate instruction in companion section', () => {
    S.currentBuddy = makeBuddy();
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('deactivate_buddy_interact');
  });

  it('includes quip cadence instruction', () => {
    S.currentBuddy = makeBuddy();
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('Every 4–8 messages');
  });

  it('includes quip length constraint', () => {
    S.currentBuddy = makeBuddy();
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('under 12 words');
  });

  it('includes do not react every message guard', () => {
    S.currentBuddy = makeBuddy();
    const result = wrapBuddyDisplay('test');
    expect(result).toContain('Do NOT react every message');
  });
});
