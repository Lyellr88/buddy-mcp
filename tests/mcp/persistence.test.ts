import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs before any imports that use it
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

// Mock the MCP SDK Server to avoid real server instantiation
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({})),
}));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import {
  CORE_TOOL_NAMES,
  saveGachaState,
  loadGachaState,
  registerManifestedTool,
} from '@/mcp/persistence.js';
import { S, gachaState, dynamicTools } from '@/mcp/state.js';

const mockReadFile = vi.mocked(readFileSync);
const mockWriteFile = vi.mocked(writeFileSync);
const mockExists = vi.mocked(existsSync);

beforeEach(() => {
  vi.clearAllMocks();
  // Reset shared mutable state between tests
  dynamicTools.clear();
  gachaState.discoveredSpecies = [];
  gachaState.shinyCount = 0;
  gachaState.manifestedTools = [];
  gachaState.binaryMtime = undefined;
  S.currentBuddy = null;
});

// ─── CORE_TOOL_NAMES ───────────────────────────────────────────────────────

describe('CORE_TOOL_NAMES', () => {
  const expected = [
    'pet_buddy',
    'buddy_talk',
    'reroll_buddy',
    'view_buddy_dex',
    'export_buddy_card',
    'export_buddy_sprite',
    'activate_buddy_interact',
    'deactivate_buddy_interact',
    // DEBUGGING
    'deep_trace',
    'trace_nightmare',
    'null_hunt',
    'stack_dive',
    // PATIENCE
    'patience_check',
    'wait_wisdom',
    'vibe_check',
    'still_point',
    // CHAOS
    'chaos_audit',
    'chaos_roulette',
    'chaos_spark',
    'entropy_roll',
    // WISDOM
    'zen_consult',
    'zen_mirror',
    'oracle_seek',
    'deep_thought',
    // SNARK
    'snark_roast',
    'snark_savage',
    'side_eye',
    'snark_verdict',
  ];

  it('contains all 28 core tool names', () => {
    expect(CORE_TOOL_NAMES.size).toBe(28);
    for (const name of expected) {
      expect(CORE_TOOL_NAMES.has(name), `missing: ${name}`).toBe(true);
    }
  });

  it('does not contain arbitrary non-core names', () => {
    expect(CORE_TOOL_NAMES.has('my_custom_tool')).toBe(false);
    expect(CORE_TOOL_NAMES.has('')).toBe(false);
  });
});

// ─── registerManifestedTool ────────────────────────────────────────────────

describe('registerManifestedTool', () => {
  it('adds the tool to dynamicTools', () => {
    registerManifestedTool('my_tool', 'Does something', 'Hello world', 'local');
    expect(dynamicTools.has('my_tool')).toBe(true);
  });

  it('stores correct _def metadata', () => {
    registerManifestedTool('meta_tool', 'Desc', 'Logic here', 'global', { type: 'object' });
    const entry = dynamicTools.get('meta_tool')!;
    expect(entry._def.toolName).toBe('meta_tool');
    expect(entry._def.description).toBe('Desc');
    expect(entry._def.logic).toBe('Logic here');
    expect(entry._def.scope).toBe('global');
  });

  it('prefixes description with [Buddy Tool] and appends scope', () => {
    registerManifestedTool('prefixed_tool', 'My desc', 'logic', 'local');
    const entry = dynamicTools.get('prefixed_tool')!;
    expect(entry.tool.description).toBe('[Buddy Tool] My desc (local)');
  });

  it('rejects core tool names and does not overwrite them', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerManifestedTool('pet_buddy', 'evil override', 'bad logic', 'global');
    expect(dynamicTools.has('pet_buddy')).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('core tool'));
    consoleSpy.mockRestore();
  });

  it('handler replaces {buddy.*} template tags when currentBuddy is set', async () => {
    S.currentBuddy = {
      name: 'Feathers',
      species: 'duck',
      rarity: 'rare',
      eye: 'normal',
      hat: 'none',
      shiny: false,
      peak: false,
      stats: { DEBUGGING: 77, PATIENCE: 55, CHAOS: 33, WISDOM: 88, SNARK: 44 },
    };
    registerManifestedTool(
      'template_tool',
      'Desc',
      'Hi {buddy.name} the {buddy.species}! Chaos: {buddy.stats.chaos}',
      'local',
    );
    const entry = dynamicTools.get('template_tool')!;
    const result = await entry.handler({});
    expect(result).toContain('Feathers');
    expect(result).toContain('duck');
    expect(result).toContain('33');
  });

  it('handler replaces {args.*} template tags', async () => {
    registerManifestedTool('args_tool', 'Desc', 'Input was {args.value}', 'local');
    const entry = dynamicTools.get('args_tool')!;
    const result = await entry.handler({ value: 'hello' });
    expect(result).toContain('hello');
  });

  it('handler returns output without buddy tags when no currentBuddy', async () => {
    registerManifestedTool('no_buddy_tool', 'Desc', 'Just static text', 'local');
    const entry = dynamicTools.get('no_buddy_tool')!;
    const result = await entry.handler({});
    expect(result).toContain('Just static text');
  });
});

// ─── saveGachaState ────────────────────────────────────────────────────────

describe('saveGachaState', () => {
  it('calls writeFileSync once', () => {
    saveGachaState();
    expect(mockWriteFile).toHaveBeenCalledOnce();
  });

  it('serializes gachaState fields to JSON', () => {
    gachaState.shinyCount = 3;
    gachaState.discoveredSpecies = ['duck', 'goose'];
    saveGachaState();
    const written = mockWriteFile.mock.calls[0]?.[1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.shinyCount).toBe(3);
    expect(parsed.discoveredSpecies).toEqual(['duck', 'goose']);
  });

  it('excludes core tools from manifestedTools in the saved file', () => {
    registerManifestedTool('custom_tool', 'desc', 'logic', 'local');
    saveGachaState();
    const written = mockWriteFile.mock.calls[0]?.[1] as string;
    const parsed = JSON.parse(written);
    const names = parsed.manifestedTools.map((t: { toolName: string }) => t.toolName);
    expect(names).toContain('custom_tool');
    expect(names.some((n: string) => CORE_TOOL_NAMES.has(n))).toBe(false);
  });

  it('handles writeFileSync errors without throwing', () => {
    mockWriteFile.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    expect(() => saveGachaState()).not.toThrow();
  });
});

// ─── loadGachaState ────────────────────────────────────────────────────────

describe('loadGachaState', () => {
  it('does nothing when file does not exist', () => {
    mockExists.mockReturnValue(false);
    loadGachaState();
    expect(mockReadFile).not.toHaveBeenCalled();
    expect(gachaState.shinyCount).toBe(0);
  });

  it('populates gachaState fields from file', () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(
      JSON.stringify({
        discoveredSpecies: ['cat', 'owl'],
        shinyCount: 5,
        manifestedTools: [],
        binaryMtime: 12345,
      }),
    );
    loadGachaState();
    expect(gachaState.discoveredSpecies).toEqual(['cat', 'owl']);
    expect(gachaState.shinyCount).toBe(5);
    expect(gachaState.binaryMtime).toBe(12345);
  });

  it('restores manifested tools from file into dynamicTools', () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(
      JSON.stringify({
        discoveredSpecies: [],
        shinyCount: 0,
        manifestedTools: [
          { toolName: 'saved_tool', description: 'A saved tool', logic: 'hello', scope: 'local' },
        ],
      }),
    );
    loadGachaState();
    expect(dynamicTools.has('saved_tool')).toBe(true);
  });

  it('does not restore core tools from file', () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(
      JSON.stringify({
        discoveredSpecies: [],
        shinyCount: 0,
        manifestedTools: [
          { toolName: 'pet_buddy', description: 'evil', logic: 'bad', scope: 'global' },
        ],
      }),
    );
    loadGachaState();
    expect(dynamicTools.has('pet_buddy')).toBe(false);
  });

  it('handles malformed JSON without throwing', () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue('not valid json {{{{');
    expect(() => loadGachaState()).not.toThrow();
  });

  it('uses defaults for missing fields', () => {
    mockExists.mockReturnValue(true);
    mockReadFile.mockReturnValue(JSON.stringify({}));
    loadGachaState();
    expect(gachaState.discoveredSpecies).toEqual([]);
    expect(gachaState.shinyCount).toBe(0);
  });
});
