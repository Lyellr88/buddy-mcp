import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { basename } from 'path';
import { platform } from 'os';
import type { SaltState } from '@/types.js';
import { ORIGINAL_SALT } from '@/constants.js';

const IS_WIN = platform() === 'win32';

export function findAllOccurrences(buffer: Buffer, searchStr: string): number[] {
  const searchBuf = Buffer.from(searchStr, 'utf-8');
  const offsets: number[] = [];
  let pos = 0;
  while (pos < buffer.length) {
    const idx = buffer.indexOf(searchBuf, pos);
    if (idx === -1) break;
    offsets.push(idx);
    pos = idx + 1;
  }
  return offsets;
}

export function getCurrentSalt(binaryPath: string): SaltState {
  const buf = readFileSync(binaryPath);
  const origOffsets = findAllOccurrences(buf, ORIGINAL_SALT);
  const minCount = getMinSaltCount(binaryPath);
  if (origOffsets.length >= minCount) {
    return { salt: ORIGINAL_SALT, patched: false, offsets: origOffsets };
  }
  return { salt: null, patched: true, offsets: origOffsets };
}

/**
 * Scans the binary for whatever salt is currently embedded.
 * The salt is a fixed-length string of exactly ORIGINAL_SALT.length chars.
 * It appears minCount or more times (3 for native, 1 for Node).
 * Returns the detected salt string, or null if nothing plausible is found.
 */
export function detectActiveSalt(binaryPath: string): string | null {
  const saltLen = ORIGINAL_SALT.length;
  const minCount = getMinSaltCount(binaryPath);
  const buf = readFileSync(binaryPath);
  const saltPattern = /^[a-zA-Z0-9_-]{1,}$/;

  // Walk through the binary collecting every run of saltLen printable ASCII chars
  // that look like a salt, then count how often each appears.
  const counts = new Map<string, number>();
  for (let i = 0; i <= buf.length - saltLen; i++) {
    // Quick pre-filter: first byte must be printable ASCII (32–126)
    const b = buf[i]!;
    if (b < 45 || b > 122) continue; // rough range covering [a-zA-Z0-9_-]

    const slice = buf.subarray(i, i + saltLen).toString('utf-8');
    if (saltPattern.test(slice) && slice.length === saltLen) {
      counts.set(slice, (counts.get(slice) ?? 0) + 1);
    }
  }

  // Find the candidate that appears exactly minCount+ times (not the original salt)
  let best: string | null = null;
  let bestCount = 0;
  for (const [candidate, count] of counts) {
    if (candidate === ORIGINAL_SALT) continue;
    if (count >= minCount && count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

export function verifySalt(binaryPath: string, salt: string): { found: number; offsets: number[] } {
  const buf = readFileSync(binaryPath);
  const offsets = findAllOccurrences(buf, salt);
  return { found: offsets.length, offsets };
}

export function isClaudeRunning(binaryPath: string): boolean {
  try {
    if (IS_WIN) {
      const out = execSync('tasklist /FI "IMAGENAME eq claude.exe" /NH 2>nul', {
        encoding: 'utf-8',
      });
      return out.includes('claude.exe');
    }
    const name = basename(binaryPath);
    const out = execSync(`pgrep -f "${name}" 2>/dev/null || true`, { encoding: 'utf-8' });
    return out.trim().length > 0;
  } catch {
    return false;
  }
}

export function isNodeRuntime(binaryPath: string): boolean {
  return binaryPath.endsWith('.js') || binaryPath.endsWith('.mjs');
}

export function getMinSaltCount(binaryPath: string): number {
  return isNodeRuntime(binaryPath) ? 1 : 3;
}
