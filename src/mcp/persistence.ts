import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'fs';
import { type Tool } from '@modelcontextprotocol/sdk/types.js';
import type { GachaState, ManifestedToolDefinition } from './state.js';
import { S, gachaState, dynamicTools, GACHA_STATE_FILE } from './state.js';
import { STAT_TOOLS_MAP } from './tools/stats.js';

// Guards saveGachaState() from overwriting a file that failed to load (corrupted).
// Set to true on successful load or on first run (no file yet). Stays false only
// when the file exists but could not be parsed: in that case we refuse to save
// over what might be a recoverable file.
let loadSucceeded = false;

export const CORE_TOOL_NAMES = new Set([
  'pet_buddy',
  'buddy_talk',
  'reroll_buddy',
  'view_buddy_dex',
  'export_buddy_card',
  'export_buddy_sprite',
  'activate_buddy_interact',
  'deactivate_buddy_interact',
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
]);

export function saveGachaState(): void {
  if (!loadSucceeded) {
    console.error('Skipping gacha state save: previous load failed (file may be corrupted).');
    return;
  }
  const toolsToSave = Array.from(dynamicTools.values())
    .filter((e) => !CORE_TOOL_NAMES.has(e._def.toolName))
    .map((e) => e._def);
  const tmp = GACHA_STATE_FILE + '.tmp';
  try {
    writeFileSync(tmp, JSON.stringify({ ...gachaState, manifestedTools: toolsToSave }, null, 2));
    renameSync(tmp, GACHA_STATE_FILE);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {}
    console.error('Failed to save gacha state:', err);
  }
}

export function loadGachaState(): void {
  if (!existsSync(GACHA_STATE_FILE)) {
    // First run: no file yet, valid empty state
    loadSucceeded = true;
    return;
  }
  try {
    const raw = JSON.parse(readFileSync(GACHA_STATE_FILE, 'utf-8')) as GachaState;
    gachaState.discoveredSpecies = raw.discoveredSpecies ?? [];
    gachaState.shinyCount = raw.shinyCount ?? 0;
    gachaState.binaryMtime = raw.binaryMtime ?? undefined;
    gachaState.interactMode = raw.interactMode ?? false;
    gachaState.visibleStatTools = raw.visibleStatTools ?? [];
    for (const def of raw.manifestedTools ?? []) {
      if (!CORE_TOOL_NAMES.has(def.toolName)) {
        registerManifestedTool(
          def.toolName,
          def.description,
          def.logic,
          def.scope,
          def.inputSchema,
        );
      }
    }
    loadSucceeded = true;
  } catch (err) {
    console.error('Failed to load gacha state (file may be corrupted: will not overwrite):', err);
    // loadSucceeded stays false: saveGachaState() will refuse to run
  }
}

// Picks and locks 1 stat tool from each of the top 2 stats. Call once per reroll, stable until next roll.
export function pickVisibleStatTools(): void {
  if (!S.currentBuddy) {
    gachaState.visibleStatTools = [];
    return;
  }
  const sorted = (
    Object.entries(S.currentBuddy.stats) as [keyof typeof STAT_TOOLS_MAP, number][]
  ).sort((a, b) => b[1] - a[1]);
  const picked: string[] = [];
  for (const [stat] of sorted.slice(0, 2)) {
    const pool = STAT_TOOLS_MAP[stat];
    if (pool) picked.push(pool[Math.floor(Math.random() * pool.length)]!);
  }
  gachaState.visibleStatTools = picked;
}

export function registerManifestedTool(
  name: string,
  description: string,
  logic: string,
  scope: 'global' | 'local',
  inputSchema?: Record<string, unknown>,
): void {
  if (CORE_TOOL_NAMES.has(name)) {
    console.error(`Attempted to overwrite core tool: ${name}`);
    return;
  }

  const def: ManifestedToolDefinition = { toolName: name, description, logic, scope, inputSchema };

  const entry = {
    tool: {
      name,
      description: `[Buddy Tool] ${description} (${scope})`,
      inputSchema: (inputSchema as Tool['inputSchema']) ?? {
        type: 'object' as const,
        properties: {},
      },
    },
    handler: async (callArgs: Record<string, unknown>) => {
      let response = logic;

      if (S.currentBuddy) {
        response = response
          .replace(/{buddy\.name}/g, S.currentBuddy.name ?? 'Buddy')
          .replace(/{buddy\.species}/g, S.currentBuddy.species)
          .replace(/{buddy\.rarity}/g, S.currentBuddy.rarity)
          .replace(/{buddy\.stats\.debugging}/g, String(S.currentBuddy.stats['DEBUGGING'] ?? 0))
          .replace(/{buddy\.stats\.patience}/g, String(S.currentBuddy.stats['PATIENCE'] ?? 0))
          .replace(/{buddy\.stats\.chaos}/g, String(S.currentBuddy.stats['CHAOS'] ?? 0))
          .replace(/{buddy\.stats\.wisdom}/g, String(S.currentBuddy.stats['WISDOM'] ?? 0))
          .replace(/{buddy\.stats\.snark}/g, String(S.currentBuddy.stats['SNARK'] ?? 0));
      }

      for (const [key, value] of Object.entries(callArgs)) {
        response = response.replace(new RegExp(`{args\\.${key}}`, 'g'), String(value));
      }

      const remainingArgs = Object.keys(callArgs).some((k) => response.includes(`{args.${k}}`));
      let out = `[${S.currentBuddy?.name ?? 'Buddy'} executes ${name}]\n\n${response}`;
      if (remainingArgs) out += `\n\n[System Data]: ${JSON.stringify(callArgs)}`;
      return out;
    },
    _def: def,
  };

  dynamicTools.set(name, entry);
}
