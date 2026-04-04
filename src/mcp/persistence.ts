import { readFileSync, writeFileSync, existsSync } from 'fs';
import { type Tool } from '@modelcontextprotocol/sdk/types.js';
import type { GachaState, ManifestedToolDefinition } from './state.js';
import { S, gachaState, dynamicTools, GACHA_STATE_FILE } from './state.js';

// --- Persistence ---

export const CORE_TOOL_NAMES = new Set([
  'initialize_buddy',
  'get_buddy_card',
  'pet_buddy',
  'buddy_speak',
  'manifest_buddy_tool',
  'vibe_check',
  'reroll_buddy',
  'view_buddy_dex',
  'restore_buddy',
  'export_buddy_card',
  'export_buddy_sprite',
]);

export function saveGachaState(): void {
  const toolsToSave = Array.from(dynamicTools.values())
    .filter((e) => !CORE_TOOL_NAMES.has(e._def.toolName))
    .map((e) => e._def);
  try {
    writeFileSync(
      GACHA_STATE_FILE,
      JSON.stringify({ ...gachaState, manifestedTools: toolsToSave }, null, 2),
    );
  } catch (err) {
    console.error('Failed to save gacha state:', err);
  }
}

export function loadGachaState(): void {
  if (!existsSync(GACHA_STATE_FILE)) return;
  try {
    const raw = JSON.parse(readFileSync(GACHA_STATE_FILE, 'utf-8')) as GachaState;
    gachaState.discoveredSpecies = raw.discoveredSpecies ?? [];
    gachaState.shinyCount = raw.shinyCount ?? 0;
    gachaState.binaryMtime = raw.binaryMtime ?? undefined;
    // Restore manifested tools from previous session
    for (const def of raw.manifestedTools ?? []) {
      if (!CORE_TOOL_NAMES.has(def.toolName)) {
        registerManifestedTool(def.toolName, def.description, def.logic, def.scope, def.inputSchema);
      }
    }
  } catch (err) {
    console.error('Failed to load gacha state:', err);
  }
}

// --- Dynamic tool system ---

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
      inputSchema: (inputSchema as Tool['inputSchema']) ?? { type: 'object' as const, properties: {} },
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
