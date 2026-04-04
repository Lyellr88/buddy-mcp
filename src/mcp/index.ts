import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'fs';

import { ORIGINAL_SALT } from '@/constants.js';
import { DEFAULT_PERSONALITIES } from '@/personalities.js';
import { roll } from '@/generation/roll.js';
import { findClaudeBinary } from '@/patcher/binary-finder.js';
import { patchBinary } from '@/patcher/patch.js';
import { getClaudeUserId, getCompanionName } from '@/config/claude-config.js';
import { loadPetConfigV2, saveProfile } from '@/config/pet-config.js';

import type { GachaState, PendingPatch } from './state.js';
import { S, gachaState, dynamicTools, server, GACHA_STATE_FILE, PENDING_PATCH_FILE } from './state.js';
import { loadGachaState, saveGachaState } from './persistence.js';
import { autoManifestTools } from './tools/auto.js';
import './tools/core.js'; // side-effect: registers all 9 core tools into dynamicTools
import './tools/export.js'; // side-effect: registers export_buddy_card + export_buddy_sprite
import './tools/interact.js'; // side-effect: registers activate_buddy_interact + deactivate_buddy_interact
import { STAT_TOOL_NAMES, STAT_TOOLS_MAP } from './tools/stats.js'; // side-effect: registers 10 stat tools

// Returns 2 visible stat tool names: 1 randomly picked from each of the top 2 stats by raw value.
// Returns an empty set when no buddy is active.
function visibleStatTools(): Set<string> {
  if (!S.currentBuddy) return new Set();
  const sorted = (Object.entries(S.currentBuddy.stats) as [keyof typeof STAT_TOOLS_MAP, number][])
    .sort((a, b) => b[1] - a[1]);
  const visible = new Set<string>();
  for (const [stat] of sorted.slice(0, 2)) {
    const pair = STAT_TOOLS_MAP[stat];
    if (pair) visible.add(pair[Math.floor(Math.random() * pair.length)]!);
  }
  return visible;
}

// --- Server handlers ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const visible = visibleStatTools();
  return {
    tools: Array.from(dynamicTools.values())
      .filter((t) => !STAT_TOOL_NAMES.has(t.tool.name) || visible.has(t.tool.name))
      .map((t) => t.tool),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolEntry = dynamicTools.get(request.params.name);
  if (!toolEntry) throw new Error(`Tool not found: ${request.params.name}`);
  try {
    const result = await toolEntry.handler((request.params.arguments ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text: result }] };
  } catch (error: unknown) {
    return { isError: true, content: [{ type: 'text', text: `Error: ${(error as Error).message}` }] };
  }
});

// --- CLI: apply pending patch ---
// Runs when invoked as: buddy-mcp apply
// Patches the binary using the saved pending patch file, then exits.

function applyPendingPatch(): void {
  if (!existsSync(PENDING_PATCH_FILE)) {
    console.log('No pending patch found. Run reroll_buddy in Claude first.');
    return;
  }

  let pending: PendingPatch;
  try {
    pending = JSON.parse(readFileSync(PENDING_PATCH_FILE, 'utf-8')) as PendingPatch;
  } catch {
    console.error('❌ Pending patch file is corrupted. Delete ~/.buddy_mcp_pending.json and try again.');
    process.exit(1);
  }

  const { rarity, species, shiny } = pending.profile;
  const shinyTag = shiny ? ' ✨ SHINY' : '';
  console.log(`🎲 Applying pending patch — ${rarity} ${species}${shinyTag}...`);

  try {
    patchBinary(pending.binaryPath, pending.currentSalt, pending.salt);
  } catch (err: unknown) {
    console.error(`❌ Patch failed: ${(err as Error).message}`);
    console.error('Make sure all Claude Code windows are fully closed, then try again.');
    process.exit(1);
  }

  saveProfile(pending.profile, { activate: true });

  // Update gacha state file directly (no server in memory)
  if (existsSync(GACHA_STATE_FILE)) {
    try {
      const raw = JSON.parse(readFileSync(GACHA_STATE_FILE, 'utf-8')) as GachaState;
      if (!raw.discoveredSpecies.includes(pending.profile.species)) {
        raw.discoveredSpecies.push(pending.profile.species);
      }
      if (pending.profile.shiny) raw.shinyCount = (raw.shinyCount ?? 0) + 1;
      writeFileSync(GACHA_STATE_FILE, JSON.stringify(raw, null, 2));
    } catch {
      // Non-fatal — gacha state will self-heal on next server start
    }
  }

  unlinkSync(PENDING_PATCH_FILE);
  console.log(`✅ ${rarity} ${species}${shinyTag} is now active!`);
  console.log('Restart Claude Code to see your new companion.');
}

if (process.argv[2] === 'apply') {
  applyPendingPatch();
  process.exit(0);
}

// --- Startup ---

async function main() {
  // 1. Load gacha extras (dex, shiny count, manifested tools)
  loadGachaState();

  // 2. Load active buddy profile
  try {
    const petConfig = loadPetConfigV2();
    const activeSalt = petConfig?.activeProfile;
    const activeProfile = activeSalt ? petConfig?.profiles[activeSalt] : undefined;

    if (activeProfile) {
      S.currentBuddy = { ...activeProfile };
    } else {
      // No profile yet — derive buddy from current salt using roll()
      const userId = getClaudeUserId();
      const salt = petConfig?.salt ?? ORIGINAL_SALT;
      const rolled = roll(userId, salt);
      const companionName = getCompanionName();
      S.currentBuddy = {
        salt,
        species: rolled.bones.species,
        rarity: rolled.bones.rarity,
        eye: rolled.bones.eye,
        hat: rolled.bones.hat,
        shiny: rolled.bones.shiny,
        stats: rolled.bones.stats,
        name: companionName,
        personality: DEFAULT_PERSONALITIES[rolled.bones.species],
        createdAt: new Date().toISOString(),
      };
    }
    console.error(`✨ Buddy loaded: ${S.currentBuddy.name ?? S.currentBuddy.species}`);
  } catch (err) {
    console.error('Buddy load failed (non-fatal):', err);
  }

  // 3. Check if binary changed since last patch (Claude auto-update detection)
  try {
    const binaryPath = findClaudeBinary();
    const currentMtime = statSync(binaryPath).mtimeMs;
    if (gachaState.binaryMtime && currentMtime !== gachaState.binaryMtime) {
      console.error(
        '⚠️  Claude binary updated — companion may have reverted. Run reroll_buddy to re-patch.',
      );
    }
  } catch {
    // Binary not found — non-fatal, reroll will surface it
  }

  // 4. Dex sync — ensure current buddy is recorded
  if (S.currentBuddy && !gachaState.discoveredSpecies.includes(S.currentBuddy.species)) {
    gachaState.discoveredSpecies.push(S.currentBuddy.species);
    saveGachaState();
  }

  // 5. Auto-manifest personality tools
  if (S.currentBuddy) autoManifestTools(S.currentBuddy);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('buddy-mcp v2.0.0 running — gacha + binary patching active.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
