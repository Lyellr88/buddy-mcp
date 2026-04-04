import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock homedir to use a temp directory
const tempDir = mkdtempSync(join(tmpdir(), 'buddy-mcp-test-'));
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => tempDir };
});

// Import after mock is set up
const { savePetConfig, loadPetConfig } = await import('@/config/pet-config.js');

afterEach(() => {
  try {
    rmSync(join(tempDir, '.buddy-mcp.json'), { force: true });
  } catch {
    /* ignore */
  }
});

describe('savePetConfig + loadPetConfig', () => {
  it('round-trips config data', () => {
    const config = {
      salt: 'test-salt-123456',
      species: 'duck' as const,
      rarity: 'rare' as const,
      eye: '·' as const,
      hat: 'crown' as const,
    };
    savePetConfig(config);
    const loaded = loadPetConfig();
    expect(loaded).toEqual(config);
  });

  it('returns null when no config exists', () => {
    expect(loadPetConfig()).toBeNull();
  });

  it('overwrites existing config', () => {
    savePetConfig({ salt: 'first-salt-00000' });
    savePetConfig({ salt: 'second-salt-0000' });
    const loaded = loadPetConfig();
    expect(loaded?.salt).toBe('second-salt-0000');
  });

  it('preserves optional fields', () => {
    const config = {
      salt: 'full-config-12345',
      previousSalt: 'old-salt-1234567',
      species: 'cat' as const,
      rarity: 'epic' as const,
      eye: '✦' as const,
      hat: 'wizard' as const,
      appliedTo: '/path/to/binary',
      appliedAt: '2026-04-01T00:00:00.000Z',
    };
    savePetConfig(config);
    expect(loadPetConfig()).toEqual(config);
  });

  it('writes valid JSON to disk', () => {
    savePetConfig({ salt: 'json-check-12345' });
    const raw = readFileSync(join(tempDir, '.buddy-mcp.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.salt).toBe('json-check-12345');
  });
});
