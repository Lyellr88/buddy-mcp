#!/usr/bin/env node
// Detached background watcher — spawned by reroll_buddy when the binary is locked (Windows EPERM).
// Polls every 2 seconds until Claude Code closes, then auto-applies the pending patch and exits.

import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { patchBinary } from '@/patcher/patch.js';
import { saveProfile } from '@/config/pet-config.js';
import { ORIGINAL_SALT } from '@/constants.js';
import type { ProfileData } from '@/types.js';

const PENDING_PATCH_FILE = join(homedir(), '.buddy_mcp_pending.json');
const GACHA_STATE_FILE = join(homedir(), '.buddy_mcp_gacha.json');
const POLL_MS = 2000;
const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface PendingPatch {
  salt: string;
  currentSalt: string;
  binaryPath: string;
  profile: ProfileData;
  rolledAt: string;
}

interface GachaState {
  lockTimestamp: string | null;
  discoveredSpecies: string[];
  shinyCount: number;
  manifestedTools: unknown[];
}

function log(msg: string): void {
  process.stderr.write(`[buddy-mcp watcher] ${msg}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (!existsSync(PENDING_PATCH_FILE)) {
    log('No pending patch found. Exiting.');
    return;
  }

  let pending: PendingPatch;
  try {
    pending = JSON.parse(readFileSync(PENDING_PATCH_FILE, 'utf-8')) as PendingPatch;
  } catch {
    log('Pending patch file is corrupted. Exiting.');
    return;
  }

  const { rarity, species, shiny } = pending.profile;
  const shinyTag = shiny ? ' ✨' : '';
  log(`Waiting for Claude to close — will auto-apply ${rarity} ${species}${shinyTag}...`);

  // Track mtime so we can detect if Claude auto-updates the binary while we wait
  let lastMtime = 0;
  try {
    lastMtime = statSync(pending.binaryPath).mtimeMs;
  } catch {
    // Non-fatal — mtime check is best-effort
  }

  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    await sleep(POLL_MS);

    // Check if binary was replaced by a Claude auto-update
    let currentMtime = 0;
    try {
      currentMtime = statSync(pending.binaryPath).mtimeMs;
    } catch {
      continue; // Binary temporarily missing during update — keep waiting
    }

    const binaryUpdated = lastMtime > 0 && currentMtime !== lastMtime;
    if (binaryUpdated) {
      log('Claude binary was updated — refreshing backup and re-patching...');
      // Delete stale backup so patchBinary creates a fresh one from the new clean binary
      const backupPath = pending.binaryPath + '.buddy-mcp-bak';
      if (existsSync(backupPath)) {
        try { unlinkSync(backupPath); } catch { /* ignore */ }
      }
      lastMtime = currentMtime;
    }

    try {
      patchBinary(pending.binaryPath, pending.currentSalt, pending.salt);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';

      if (msg.includes('EPERM') || msg.includes('EBUSY') || msg.includes('locked')) {
        continue; // Claude still running — keep waiting
      }

      // Salt not found — binary updated and salt structure changed, try ORIGINAL_SALT fallback
      if (msg.includes('Could not find salt')) {
        try {
          patchBinary(pending.binaryPath, ORIGINAL_SALT, pending.salt);
        } catch (fallbackErr: unknown) {
          const fallbackMsg = (fallbackErr as Error).message ?? '';
          if (fallbackMsg.includes('Could not find salt')) {
            log(
              'Claude updated and changed the salt structure — re-patch not possible automatically.\n' +
              'Check for a buddy-mcp update, then run reroll_buddy again.',
            );
          } else {
            log(`Unexpected fallback patch error: ${fallbackMsg}`);
          }
          return;
        }
        // Fallback succeeded — update pending.currentSalt for the success path below
        log('Re-patched using ORIGINAL_SALT after binary update.');
      } else {
        log(`Unexpected patch error: ${msg}`);
        return;
      }
    }

    // Patch succeeded
    saveProfile(pending.profile, { activate: true });

    if (existsSync(GACHA_STATE_FILE)) {
      try {
        const raw = JSON.parse(readFileSync(GACHA_STATE_FILE, 'utf-8')) as GachaState;
        if (!raw.discoveredSpecies.includes(pending.profile.species)) {
          raw.discoveredSpecies.push(pending.profile.species);
        }
        if (pending.profile.shiny) raw.shinyCount = (raw.shinyCount ?? 0) + 1;
        writeFileSync(GACHA_STATE_FILE, JSON.stringify(raw, null, 2));
      } catch {
        // Non-fatal — gacha state self-heals on next server start
      }
    }

    unlinkSync(PENDING_PATCH_FILE);
    log(`✅ ${rarity} ${species}${shinyTag} patched! Reopen Claude Code to see your new companion.`);
    return;
  }

  log('Timed out after 30 minutes. Run `npm run apply` manually if needed.');
}

main().catch((err: unknown) => {
  process.stderr.write(`[buddy-mcp watcher] Fatal: ${(err as Error).message}\n`);
  process.exit(1);
});
