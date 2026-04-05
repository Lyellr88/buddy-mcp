import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ORIGINAL_SALT } from '@/constants.js';
import { patchBinary, restoreBinary, findRestorableBackup } from '@/patcher/patch.js';

// Build a fake binary buffer with the ORIGINAL_SALT embedded N times
function makeFakeBinary(salt = ORIGINAL_SALT, count = 3): Buffer {
  const padding = Buffer.alloc(64, 0x41); // 'A' * 64
  const saltBuf = Buffer.from(salt);
  const parts: Buffer[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(padding, saltBuf);
  }
  parts.push(padding);
  return Buffer.concat(parts);
}

// A salt the same length as ORIGINAL_SALT for patching
const CUSTOM_SALT = 'custom-2026-001'; // same length as 'friend-2026-401' (15 chars)

let tmpDir: string;
let binaryPath: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'buddy-patch-test-'));
  binaryPath = join(tmpDir, 'claude');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('patchBinary', () => {
  it('patches all occurrences of old salt with new salt', () => {
    writeFileSync(binaryPath, makeFakeBinary(ORIGINAL_SALT, 3));
    const result = patchBinary(binaryPath, ORIGINAL_SALT, CUSTOM_SALT);
    expect(result.replacements).toBe(3);
    expect(result.verified).toBe(true);
    const patched = readFileSync(binaryPath);
    expect(patched.includes(Buffer.from(CUSTOM_SALT))).toBe(true);
    expect(patched.includes(Buffer.from(ORIGINAL_SALT))).toBe(false);
  });

  it('throws on salt length mismatch', () => {
    writeFileSync(binaryPath, makeFakeBinary());
    expect(() => patchBinary(binaryPath, ORIGINAL_SALT, 'short')).toThrow('Salt length mismatch');
  });

  it('throws if old salt not found in binary', () => {
    writeFileSync(binaryPath, Buffer.from('no salt here at all'));
    expect(() => patchBinary(binaryPath, ORIGINAL_SALT, CUSTOM_SALT)).toThrow(
      'Could not find salt',
    );
  });

  it('writes .buddy-mcp-bak only when binary has ORIGINAL_SALT', () => {
    writeFileSync(binaryPath, makeFakeBinary(ORIGINAL_SALT, 3));
    patchBinary(binaryPath, ORIGINAL_SALT, CUSTOM_SALT);
    const backupPath = binaryPath + '.buddy-mcp-bak';
    // Backup should exist and contain ORIGINAL_SALT (not the patched version)
    const backup = readFileSync(backupPath);
    expect(backup.includes(Buffer.from(ORIGINAL_SALT))).toBe(true);
  });

  it('does NOT write .buddy-mcp-bak when binary does not have ORIGINAL_SALT', () => {
    // Binary patched with custom salt (simulates post-update state)
    const differentSalt = 'differ-2099-001'; // same length
    writeFileSync(binaryPath, makeFakeBinary(differentSalt, 3));
    // Patch from differentSalt to CUSTOM_SALT — binary never had ORIGINAL_SALT
    patchBinary(binaryPath, differentSalt, CUSTOM_SALT);
    const backupPath = binaryPath + '.buddy-mcp-bak';
    // Backup should NOT be written (binary didn't have ORIGINAL_SALT)
    expect(existsSync(backupPath)).toBe(false);
  });
});

describe('findRestorableBackup', () => {
  it('returns null when no backups exist', () => {
    expect(findRestorableBackup(binaryPath)).toBeNull();
  });

  it('returns .buddy-mcp-bak when it has ORIGINAL_SALT', () => {
    const backupPath = binaryPath + '.buddy-mcp-bak';
    writeFileSync(backupPath, makeFakeBinary(ORIGINAL_SALT, 3));
    expect(findRestorableBackup(binaryPath)).toBe(backupPath);
  });

  it('skips .buddy-mcp-bak without ORIGINAL_SALT and falls back to .anybuddy-bak', () => {
    // buddy-mcp-bak is poisoned (no original salt)
    writeFileSync(binaryPath + '.buddy-mcp-bak', makeFakeBinary(CUSTOM_SALT, 3));
    // anybuddy-bak is the real original
    const anybuddyBak = binaryPath + '.anybuddy-bak';
    writeFileSync(anybuddyBak, makeFakeBinary(ORIGINAL_SALT, 3));
    expect(findRestorableBackup(binaryPath)).toBe(anybuddyBak);
  });

  it('returns null when both backups exist but neither has ORIGINAL_SALT', () => {
    writeFileSync(binaryPath + '.buddy-mcp-bak', makeFakeBinary(CUSTOM_SALT, 3));
    writeFileSync(binaryPath + '.anybuddy-bak', makeFakeBinary(CUSTOM_SALT, 3));
    expect(findRestorableBackup(binaryPath)).toBeNull();
  });

  it('skips unreadable backup files gracefully', () => {
    // Create a directory where the backup file should be (makes it unreadable as a file)
    mkdirSync(binaryPath + '.buddy-mcp-bak');
    const anybuddyBak = binaryPath + '.anybuddy-bak';
    writeFileSync(anybuddyBak, makeFakeBinary(ORIGINAL_SALT, 3));
    expect(findRestorableBackup(binaryPath)).toBe(anybuddyBak);
  });
});

describe('restoreBinary', () => {
  it('restores binary from .buddy-mcp-bak', () => {
    const original = makeFakeBinary(ORIGINAL_SALT, 3);
    writeFileSync(binaryPath + '.buddy-mcp-bak', original);
    writeFileSync(binaryPath, makeFakeBinary(CUSTOM_SALT, 3)); // current = patched
    restoreBinary(binaryPath);
    const restored = readFileSync(binaryPath);
    expect(restored.includes(Buffer.from(ORIGINAL_SALT))).toBe(true);
  });

  it('falls back to .anybuddy-bak when .buddy-mcp-bak is poisoned', () => {
    // Poisoned backup
    writeFileSync(binaryPath + '.buddy-mcp-bak', makeFakeBinary(CUSTOM_SALT, 3));
    // Good fallback
    writeFileSync(binaryPath + '.anybuddy-bak', makeFakeBinary(ORIGINAL_SALT, 3));
    writeFileSync(binaryPath, makeFakeBinary(CUSTOM_SALT, 3));
    restoreBinary(binaryPath);
    const restored = readFileSync(binaryPath);
    expect(restored.includes(Buffer.from(ORIGINAL_SALT))).toBe(true);
  });

  it('throws when no valid backup exists', () => {
    writeFileSync(binaryPath, makeFakeBinary(CUSTOM_SALT, 3));
    expect(() => restoreBinary(binaryPath)).toThrow('No valid backup found');
  });
});
