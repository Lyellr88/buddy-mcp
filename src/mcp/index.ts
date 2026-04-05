import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'fs';

import { ORIGINAL_SALT } from '@/constants.js';
import { DEFAULT_PERSONALITIES } from '@/personalities.js';
import { roll } from '@/generation/roll.js';
import { findClaudeBinary } from '@/patcher/binary-finder.js';
import { patchBinary, findRestorableBackup, restoreBinary } from '@/patcher/patch.js';
import { verifySalt } from '@/patcher/salt-ops.js';
import { getClaudeUserId, getCompanionName, renameCompanion, setCompanionPersonality } from '@/config/claude-config.js';
import { loadPetConfigV2, saveProfile } from '@/config/pet-config.js';
import { isHookInstalled, installHook } from '@/config/hooks.js';

import type { GachaState, PendingPatch } from './state.js';
import { S, gachaState, dynamicTools, server, GACHA_STATE_FILE, PENDING_PATCH_FILE } from './state.js';
import { loadGachaState, saveGachaState, pickVisibleStatTools } from './persistence.js';
import { autoManifestTools } from './tools/auto.js';
import './tools/core.js'; // side-effect: registers all 9 core tools into dynamicTools
import './tools/export.js'; // side-effect: registers export_buddy_card + export_buddy_sprite
import './tools/interact.js'; // side-effect: registers activate_buddy_interact + deactivate_buddy_interact
import { STAT_TOOL_NAMES } from './tools/stats.js'; // side-effect: registers 20 stat tools

// Returns the cached set of visible stat tool names — locked per roll, set by pickVisibleStatTools().
function visibleStatTools(): Set<string> {
  return new Set(gachaState.visibleStatTools);
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

// --- CLI: apply pending patch or re-apply saved salt after update ---
// Runs when invoked as: buddy-mcp apply or buddy-mcp apply --silent
// Handles two cases:
// 1. Pending patch waiting from reroll (reads ~/.buddy_mcp_pending.json)
// 2. Hook-triggered re-apply after binary update (reads saved salt from pet config)

function applyPendingPatch({ silent = false } = {}): void {
  // First, try pending patch file (from reroll)
  if (existsSync(PENDING_PATCH_FILE)) {
    let pending: PendingPatch;
    try {
      pending = JSON.parse(readFileSync(PENDING_PATCH_FILE, 'utf-8')) as PendingPatch;
    } catch {
      if (!silent) console.error('❌ Pending patch file is corrupted. Delete ~/.buddy_mcp_pending.json and try again.');
      process.exit(silent ? 0 : 1);
    }

    const { rarity, species, shiny } = pending.profile;
    const shinyTag = shiny ? ' ✨ SHINY' : '';
    if (!silent) console.log(`🎲 Applying pending patch — ${rarity} ${species}${shinyTag}...`);

    try {
      patchBinary(pending.binaryPath, pending.currentSalt, pending.salt);
    } catch (err: unknown) {
      if (!silent) {
        console.error(`❌ Patch failed: ${(err as Error).message}`);
        console.error('Make sure all Claude Code windows are fully closed, then try again.');
      }
      process.exit(silent ? 0 : 1);
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
    if (!silent) {
      console.log(`✅ ${rarity} ${species}${shinyTag} is now active!`);
      console.log('Restart Claude Code to see your new companion.');
    }

    // Install hook on successful apply (unless already installed)
    if (!isHookInstalled()) {
      try {
        installHook(process.argv[1]);
      } catch {
        // Non-fatal — hook install failure shouldn't crash the apply
      }
    }
    return;
  }

  // No pending file — try hook-triggered re-apply after update
  // Load saved salt from pet config
  const petConfig = loadPetConfigV2();
  if (!petConfig?.salt) {
    if (!silent) console.log('No saved pet config. Run reroll_buddy in Claude first.');
    process.exit(0);
  }

  let binaryPath: string;
  try {
    binaryPath = findClaudeBinary();
  } catch (err) {
    if (!silent) console.error((err as Error).message);
    process.exit(0);
  }

  // Fast path: check if our salt is already applied
  const checkOurs = verifySalt(binaryPath, petConfig.salt);
  if (checkOurs.found >= 3) {
    if (!silent) console.log('✅ Pet already applied.');
    return;
  }

  // Try patching with ORIGINAL_SALT (fresh binary from update)
  const checkOrig = verifySalt(binaryPath, ORIGINAL_SALT);
  if (checkOrig.found >= 3) {
    try {
      patchBinary(binaryPath, ORIGINAL_SALT, petConfig.salt);
      // Restore companion identity from saved profile
      const activeSalt = petConfig.activeProfile;
      const profile = activeSalt ? petConfig.profiles[activeSalt] : undefined;
      if (profile?.name) { try { renameCompanion(profile.name); } catch { /* non-fatal */ } }
      if (profile?.personality) { try { setCompanionPersonality(profile.personality); } catch { /* non-fatal */ } }
      if (!silent) console.log('✅ Pet re-patched after update.');
      return;
    } catch (err) {
      if (!silent) console.error(`❌ Re-patch failed: ${(err as Error).message}`);
      process.exit(silent ? 0 : 1);
    }
  }

  // Fallback: try restoring from any valid backup, then re-patch
  const backupPath = findRestorableBackup(binaryPath);
  if (backupPath) {
    try {
      restoreBinary(binaryPath);
      patchBinary(binaryPath, ORIGINAL_SALT, petConfig.salt);
      const activeSalt = petConfig.activeProfile;
      const profile = activeSalt ? petConfig.profiles[activeSalt] : undefined;
      if (profile?.name) { try { renameCompanion(profile.name); } catch { /* non-fatal */ } }
      if (profile?.personality) { try { setCompanionPersonality(profile.personality); } catch { /* non-fatal */ } }
      if (!silent) console.log('✅ Pet restored from backup and re-patched after update.');
      return;
    } catch (err) {
      if (!silent) console.error(`❌ Restore+repatch failed: ${(err as Error).message}`);
      process.exit(silent ? 0 : 1);
    }
  }

  // Fallback: couldn't find a known salt or backup
  if (!silent) {
    console.error('⚠️  Could not find a known salt in binary or any valid backup.');
    console.error('Run buddy-mcp-build restore, or reinstall Claude Code.');
  }
  process.exit(silent ? 0 : 1);
}

if (process.argv[2] === 'apply') {
  const silent = process.argv.includes('--silent');
  applyPendingPatch({ silent });
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

  // 6. Lock stat tools if not already set (first launch or old state file)
  if (S.currentBuddy && gachaState.visibleStatTools.length === 0) {
    pickVisibleStatTools();
    saveGachaState();
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('buddy-mcp v2.0.0 running — gacha + binary patching active.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
