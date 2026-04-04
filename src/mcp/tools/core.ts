import { writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

import type { Bones, DesiredTraits, ProfileData } from '@/types.js';
import { SPECIES, RARITIES, EYES, HATS, ORIGINAL_SALT, getAffectionWeights, PET_MILESTONES } from '@/constants.js';
import { DEFAULT_PERSONALITIES, getPersonalityRemark } from '@/personalities.js';
import { renderSprite } from '@/sprites/render.js';
import { findSalt } from '@/finder/orchestrator.js';
import { findClaudeBinary } from '@/patcher/binary-finder.js';
import { patchBinary } from '@/patcher/patch.js';
import { verifySalt, detectActiveSalt } from '@/patcher/salt-ops.js';
import { getClaudeUserId, getCompanionName } from '@/config/claude-config.js';
import { loadPetConfigV2, saveProfile } from '@/config/pet-config.js';

import type { PendingPatch } from '../state.js';
import { S, gachaState, dynamicTools, PENDING_PATCH_FILE } from '../state.js';
import { saveGachaState, pickVisibleStatTools } from '../persistence.js';
import { autoManifestTools } from './auto.js';

// --- Core tool handlers ---

function statBar(v: number): string {
  return '█'.repeat(Math.floor(v / 10)) + '░'.repeat(10 - Math.floor(v / 10));
}

const getBuddyCardTool = {
  tool: {
    name: 'get_buddy_card',
    description: 'Display buddy card. Always show the full result to the user exactly as returned.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  handler: async () => {
    if (!S.currentBuddy) return 'Initialize a buddy first!';
    const b = S.currentBuddy;
    const dg = b.stats['DEBUGGING'] ?? 0;
    const pt = b.stats['PATIENCE'] ?? 0;
    const ch = b.stats['CHAOS'] ?? 0;
    const ws = b.stats['WISDOM'] ?? 0;
    const sn = b.stats['SNARK'] ?? 0;

    const shinyTag = b.shiny ? ' ✨ SHINY ✨' : '';
    const hatLine = b.hat && b.hat !== 'none' ? `│  🎩 ${b.hat.padEnd(31)}  │\n` : '';

    const bones: Bones = {
      species: b.species,
      rarity: b.rarity,
      eye: b.eye,
      hat: b.hat,
      shiny: b.shiny,
      stats: b.stats,
    };
    const spriteLines = renderSprite(bones, 0, false);
    const asciiArt = spriteLines.map((line) => `│  ${line.padEnd(34)}  │`).join('\n');

    const bio = b.personality ?? `A ${b.rarity.charAt(0).toUpperCase() + b.rarity.slice(1)} ${b.species} companion.`;
    const bioLines = bio.match(/.{1,32}(\s|$)/g)?.map((l) => `│  "${l.trim().padEnd(32)}"  │`).join('\n') ?? '';

    return `
╭──────────────────────────────────────╮
│ ${shinyTag.padEnd(36)} │
│  ★★ ${b.rarity.toUpperCase().padEnd(14)} ${b.species.toUpperCase().padStart(16)}  │
│                                      │
${hatLine}${asciiArt}
│                                      │
│  ${(b.name ?? 'Buddy').padEnd(34)}  │
│                                      │
${bioLines}
│                                      │
│  DEBUGGING  ${statBar(dg)}  ${String(dg).padStart(2)}           │
│  PATIENCE   ${statBar(pt)}  ${String(pt).padStart(2)}           │
│  CHAOS      ${statBar(ch)}  ${String(ch).padStart(2)}           │
│  WISDOM     ${statBar(ws)}  ${String(ws).padStart(2)}           │
│  SNARK      ${statBar(sn)}  ${String(sn).padStart(2)}           │
│                                      │
╰──────────────────────────────────────╯`;
  },
};

const buddySpeakTool = {
  tool: {
    name: 'buddy_speak',
    description: 'Triggers the buddy to chime in with a personality-aligned remark based on their stats. Always show the result to the user.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  handler: async () => {
    if (!S.currentBuddy) return 'Initialize a buddy first.';
    const remark = getPersonalityRemark(S.currentBuddy);
    return `${S.currentBuddy.name ?? 'Buddy'} says: "${remark}"`;
  },
};

// --- Pet affection footer helper ---

function buildPetFooter(count: number): string {
  const milestone = PET_MILESTONES.find(m => count >= m.threshold);
  if (milestone) return `\n\n💝 Affection: ${count} pets  │  ${milestone.label}`;
  return `\n\n💝 Affection: ${count} pets  │  Next milestone: 25 (uncommon+ guaranteed)`;
}

const petBuddyTool = {
  tool: {
    name: 'pet_buddy',
    description: 'Interact with the buddy. The reaction is a mystery based on their mood and stats. Always show the result to the user.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  handler: async () => {
    if (!S.currentBuddy) return 'No buddy to pet!';
    const b = S.currentBuddy;

    gachaState.petCount++;
    saveGachaState();

    const roll = Math.random() * 100;
    const snark = b.stats['SNARK'] ?? 0;
    const patience = b.stats['PATIENCE'] ?? 50;
    const chaos = b.stats['CHAOS'] ?? 0;
    const name = b.name ?? 'Buddy';

    let reaction: string;
    if (roll < 10) reaction = `✨ RARE EVENT ✨ ${name} lets you scratch that one spot behind the ears. For a brief moment, the Snark vanishes. (+1 temporary Dopamine)`;
    else if (snark > 80 && roll < 50) reaction = `${name} swiped at your cursor. "I'm not a toy. Do I look like I have time for this?"`;
    else if (patience < 25 && roll < 50) reaction = `${name} is vibrating so fast they're blurring. "NOT NOW. I CAN SEE THE MATRIX AND IT IS FULL OF SEMICOLONS."`;
    else if (chaos > 70 && roll < 30) reaction = `${name} makes a sound like a dial-up modem. You're pretty sure they just rewrote your history file.`;
    else reaction = `${name} lets out a soft, digital chirp. *happy ${b.species} noises*`;

    return `${reaction}${buildPetFooter(gachaState.petCount)}`;
  },
};

// --- rollRandomDesiredWithAffection helper ---

function weightedPick<T extends string>(items: readonly T[], weights: Record<T, number>): T {
  const total = items.reduce((sum, item) => sum + (weights[item] ?? 0), 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= weights[item] ?? 0;
    if (r < 0) return item;
  }
  const fallback = items[items.length - 1];
  return fallback !== undefined ? fallback : (items[0] as T);
}

function rollRandomDesiredWithAffection(petCount: number): DesiredTraits {
  const weights = getAffectionWeights(petCount);
  const rarity = weightedPick(RARITIES.filter(r => weights[r] > 0), weights);
  return {
    species: SPECIES[Math.floor(Math.random() * SPECIES.length)] ?? 'capybara',
    rarity,
    eye: EYES[Math.floor(Math.random() * EYES.length)] ?? '·',
    hat: rarity === 'common' ? 'none' : HATS[Math.floor(Math.random() * HATS.length)] ?? 'none',
    shiny: Math.random() < 0.01,
    peak: null,
    dump: null,
  };
}

const rerollBuddyTool = {
  tool: {
    name: 'reroll_buddy',
    description: 'Spin the mystery wheel to find a new buddy identity.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  handler: async () => {
    // 1. Get userId
    const userId = getClaudeUserId();
    if (userId === 'anon') return '❌ No userId found. Open Claude Code at least once first.';

    // 3. Find binary
    let binaryPath: string;
    try {
      binaryPath = findClaudeBinary();
    } catch (err: unknown) {
      return `❌ Claude Code binary not found: ${(err as Error).message}`;
    }

    // 4. Roll random desired traits
    const desired = rollRandomDesiredWithAffection(gachaState.petCount);

    // 5. Find salt — pass binaryPath so workers use the correct hash (FNV-1a on Windows .js, wyhash elsewhere)
    let finderResult: Awaited<ReturnType<typeof findSalt>>;
    try {
      finderResult = await findSalt(userId, desired, { binaryPath });
    } catch (err: unknown) {
      return `❌ Salt search failed: ${(err as Error).message}`;
    }

    // 6. Try to patch immediately — works on Mac/Linux and when Claude is closed on Windows.
    // On Windows with Claude open, patchBinary throws EPERM → save pending patch instead.
    const petConfig = loadPetConfigV2();
    const currentSalt = petConfig?.salt ?? ORIGINAL_SALT;
    let patched = false;
    try {
      patchBinary(binaryPath, currentSalt, finderResult.salt);
      patched = true;
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('Could not find salt')) {
        // Try ORIGINAL_SALT — Claude may have auto-updated and restored it
        if (currentSalt !== ORIGINAL_SALT) {
          try {
            patchBinary(binaryPath, ORIGINAL_SALT, finderResult.salt);
            patched = true;
          } catch {
            // ORIGINAL_SALT also not found
          }
        }

        // Last resort: binary was patched by another tool and ~/.buddy-mcp.json doesn't
        // exist yet. Scan the binary to detect whatever salt is actually embedded.
        if (!patched) {
          const detectedSalt = detectActiveSalt(binaryPath);
          if (detectedSalt) {
            try {
              patchBinary(binaryPath, detectedSalt, finderResult.salt);
              patched = true;
            } catch { /* detection found something but patch still failed */ }
          }
        }

        // Also check if finderResult.salt is already in the binary (retry after a prior partial attempt)
        if (!patched) {
          const alreadyThere = verifySalt(binaryPath, finderResult.salt);
          if (alreadyThere.found > 0) patched = true;
        }

        if (!patched) {
          return [
            `❌ Claude was updated and the binary structure changed.`,
            ``,
            `Your companion reverted to Claude's default — this is expected after a Claude update.`,
            `Run **reroll_buddy** again to re-patch the new binary.`,
            ``,
            `If this keeps failing, check for a buddy-mcp update — the community usually patches within hours.`,
          ].join('\n');
        }
      }
      // Any other error (EPERM, EBUSY) — binary locked, fall through to pending patch flow
    }

    // 7. Roll the result using the same hash the finder used — guarantees consistency
    // Use bones directly from the finder result — the worker computed them using the
    // native hash (Bun.hash in the wyhash subprocess), so we never need to re-hash here.
    const bones = finderResult.bones;
    const profile: ProfileData = {
      salt: finderResult.salt,
      species: bones.species,
      rarity: bones.rarity,
      eye: bones.eye,
      hat: bones.hat,
      shiny: bones.shiny,
      stats: bones.stats,
      name: getCompanionName(),
      personality: DEFAULT_PERSONALITIES[bones.species],
      createdAt: new Date().toISOString(),
    };

    const elapsed = (finderResult.elapsed / 1000).toFixed(1);
    const attempts = finderResult.totalAttempts?.toLocaleString() ?? finderResult.attempts.toLocaleString();
    const shinyTag = profile.shiny ? ' ✨ SHINY! ✨' : '';

    if (!patched) {
      // Save pending patch then spawn a detached watcher that auto-applies when Claude closes
      const pending: PendingPatch = {
        salt: finderResult.salt,
        currentSalt,
        binaryPath,
        profile,
        rolledAt: new Date().toISOString(),
      };
      try {
        writeFileSync(PENDING_PATCH_FILE, JSON.stringify(pending, null, 2));
        gachaState.petCount = 0;
        // Lock stat tools for new buddy now — stable until next reroll
        S.currentBuddy = { ...profile };
        pickVisibleStatTools();
        saveGachaState();
      } catch (err: unknown) {
        return `❌ Could not save pending patch: ${(err as Error).message}`;
      }

      // Spawn watcher as fully detached — survives after MCP server exits
      const watcherPath = join(dirname(fileURLToPath(import.meta.url)), '../watcher.js');
      const watcherSpawned = existsSync(watcherPath);
      if (watcherSpawned) {
        const watcher = spawn(process.execPath, [watcherPath], { detached: true, stdio: 'ignore' });
        watcher.unref();
      }

      const applyInstructions = watcherSpawned
        ? [`**Close Claude Code** — patch applies automatically. Then reopen to see your new companion.`]
        : [`**Close Claude Code, then run:** \`npm run apply\` in the buddy-mcp directory, then reopen.`];

      return [
        `🎲 Found a **${profile.rarity} ${profile.species}**${shinyTag} after ~${attempts} attempts in ${elapsed}s!`,
        ``,
        `⚠️ Binary is locked — Claude Code is still running.`,
        ``,
        ...applyInstructions,
      ].join('\n');
    }

    // 8. Patch succeeded — save profile and update MCP state
    saveProfile(profile, { activate: true });
    S.currentBuddy = { ...profile };
    if (!gachaState.discoveredSpecies.includes(profile.species)) {
      gachaState.discoveredSpecies.push(profile.species);
    }
    if (profile.shiny) gachaState.shinyCount++;
    gachaState.binaryMtime = statSync(binaryPath).mtimeMs;
    gachaState.petCount = 0;
    pickVisibleStatTools();
    saveGachaState();
    autoManifestTools(S.currentBuddy);

    return [
      `🎲 Found a **${profile.rarity} ${profile.species}**${shinyTag} after ~${attempts} attempts in ${elapsed}s!`,
      ``,
      `✅ Binary patched! Restart Claude Code to see your new companion.`,
      `Run get_buddy_card to preview.`,
    ].join('\n');
  },
};

const viewBuddyDexTool = {
  tool: {
    name: 'view_buddy_dex',
    description: 'View your collection of discovered buddy species. Always show the full result to the user exactly as returned.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  handler: async () => {
    let output = '--- BUDDY DEX ---\n\n';
    for (let i = 0; i < SPECIES.length; i += 3) {
      const row = (SPECIES.slice(i, i + 3) as string[]).map((s) => {
        const found = gachaState.discoveredSpecies.includes(s);
        return found ? `[X] ${s.padEnd(10)}` : `[ ] ???       `;
      });
      output += row.join('  ') + '\n';
    }
    output += `\nProgress: ${gachaState.discoveredSpecies.length}/${SPECIES.length} | Shinies Encountered: ${gachaState.shinyCount}`;
    return output;
  },
};



// --- Register core tools ---

dynamicTools.set('get_buddy_card', { ...getBuddyCardTool, _def: { toolName: 'get_buddy_card', description: 'Core: Card', logic: 'N/A', scope: 'global' } });
dynamicTools.set('pet_buddy', { ...petBuddyTool, _def: { toolName: 'pet_buddy', description: 'Core: Pet', logic: 'N/A', scope: 'global' } });
dynamicTools.set('buddy_speak', { ...buddySpeakTool, _def: { toolName: 'buddy_speak', description: 'Core: Speak', logic: 'N/A', scope: 'global' } });
dynamicTools.set('reroll_buddy', { ...rerollBuddyTool, _def: { toolName: 'reroll_buddy', description: 'Core: Gacha', logic: 'N/A', scope: 'global' } });
dynamicTools.set('view_buddy_dex', { ...viewBuddyDexTool, _def: { toolName: 'view_buddy_dex', description: 'Core: Dex', logic: 'N/A', scope: 'global' } });