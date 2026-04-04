import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { PetConfig, PetConfigV2, ProfileData } from '@/types.js';

const tempDir = mkdtempSync(join(tmpdir(), 'buddy-mcp-v2-'));
const configPath = join(tempDir, '.buddy-mcp.json');

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => tempDir };
});

// Mock claude-config so migrateV1 doesn't read real files
vi.mock('@/config/claude-config.ts', () => ({
  getCompanionName: () => 'TestBuddy',
  getCompanionPersonality: () => 'friendly',
  getClaudeUserId: () => 'test-user',
  renameCompanion: vi.fn(),
  setCompanionPersonality: vi.fn(),
}));

const {
  loadPetConfigV2,
  savePetConfigV2,
  saveProfile,
  getProfiles,
  switchToProfile,
  deleteProfile,
} = await import('@/config/pet-config.js');

function makeProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    salt: 'profile-salt-1234',
    species: 'duck',
    rarity: 'common',
    eye: '·',
    hat: 'none',
    shiny: false,
    stats: {},
    name: null,
    personality: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeV2(overrides: Partial<PetConfigV2> = {}): PetConfigV2 {
  return {
    version: 2,
    activeProfile: null,
    salt: 'friend-2026-401',
    profiles: {},
    ...overrides,
  };
}

afterEach(() => {
  try {
    rmSync(configPath, { force: true });
  } catch {
    /* ignore */
  }
});

describe('loadPetConfigV2 + savePetConfigV2', () => {
  it('returns null when no config exists', () => {
    expect(loadPetConfigV2()).toBeNull();
  });

  it('round-trips v2 config', () => {
    const salt = 'sparky-salt-1234';
    const config = makeV2({
      activeProfile: salt,
      profiles: { [salt]: makeProfile({ salt, name: 'Sparky' }) },
    });
    savePetConfigV2(config);
    expect(loadPetConfigV2()).toEqual(config);
  });

  it('returns null on corrupt JSON', () => {
    writeFileSync(configPath, 'not json{{{');
    expect(loadPetConfigV2()).toBeNull();
  });
});

describe('v1 → v2 migration', () => {
  it('migrates a v1 config with custom salt into a salt-keyed profile', () => {
    const v1: PetConfig = {
      salt: 'custom-salt-12345',
      species: 'cat',
      rarity: 'rare',
      eye: '✦',
      hat: 'crown',
      appliedAt: '2026-03-01T00:00:00.000Z',
    };
    writeFileSync(configPath, JSON.stringify(v1));

    const loaded = loadPetConfigV2();
    expect(loaded?.version).toBe(2);
    expect(loaded?.activeProfile).toBe('custom-salt-12345');
    expect(loaded?.profiles['custom-salt-12345']).toBeDefined();
    expect(loaded?.profiles['custom-salt-12345'].species).toBe('cat');
  });

  it('migrates a restored v1 config with no active profile', () => {
    const v1: PetConfig = {
      salt: 'friend-2026-401',
      restored: true,
    };
    writeFileSync(configPath, JSON.stringify(v1));

    const loaded = loadPetConfigV2();
    expect(loaded?.version).toBe(2);
    expect(loaded?.activeProfile).toBeNull();
    expect(Object.keys(loaded?.profiles ?? {})).toHaveLength(0);
  });

  it('migrates v1 with original salt to empty profiles', () => {
    const v1: PetConfig = { salt: 'friend-2026-401' };
    writeFileSync(configPath, JSON.stringify(v1));

    const loaded = loadPetConfigV2();
    expect(loaded?.activeProfile).toBeNull();
    expect(Object.keys(loaded?.profiles ?? {})).toHaveLength(0);
  });
});

describe('name-keyed → salt-keyed migration', () => {
  it('migrates old name-keyed profiles to salt-keyed', () => {
    const nameKeyed: PetConfigV2 = {
      version: 2,
      activeProfile: 'fluffy',
      salt: 'fluffy-salt-12345',
      profiles: {
        fluffy: makeProfile({ salt: 'fluffy-salt-12345', name: null }),
        sparky: makeProfile({ salt: 'sparky-salt-12345', name: 'Sparky' }),
      },
    };
    writeFileSync(configPath, JSON.stringify(nameKeyed));

    const loaded = loadPetConfigV2();
    // Profiles are now keyed by salt
    expect(loaded?.profiles['fluffy-salt-12345']).toBeDefined();
    expect(loaded?.profiles['sparky-salt-12345']).toBeDefined();
    // Old name keys are gone
    expect(loaded?.profiles['fluffy']).toBeUndefined();
    expect(loaded?.profiles['sparky']).toBeUndefined();
    // Display names preserved
    expect(loaded?.profiles['fluffy-salt-12345'].name).toBe('fluffy');
    expect(loaded?.profiles['sparky-salt-12345'].name).toBe('Sparky');
    // activeProfile updated to salt
    expect(loaded?.activeProfile).toBe('fluffy-salt-12345');
  });

  it('leaves already salt-keyed profiles unchanged', () => {
    const saltKeyed = makeV2({
      profiles: {
        abcdefghijklmno: makeProfile({ salt: 'abcdefghijklmno', name: 'Test' }),
      },
    });
    savePetConfigV2(saltKeyed);
    const loaded = loadPetConfigV2();
    expect(loaded?.profiles['abcdefghijklmno']).toBeDefined();
    expect(loaded?.profiles['abcdefghijklmno'].name).toBe('Test');
  });
});

describe('saveProfile', () => {
  it('adds a profile keyed by salt without activating', () => {
    savePetConfigV2(makeV2());
    const profile = makeProfile({ salt: 'new-salt-1234567', name: 'Fluffy' });
    saveProfile(profile);

    const loaded = loadPetConfigV2();
    expect(loaded?.profiles['new-salt-1234567']).toEqual(profile);
    expect(loaded?.activeProfile).toBeNull();
    expect(loaded?.salt).toBe('friend-2026-401');
  });

  it('adds a profile and activates it', () => {
    savePetConfigV2(makeV2({ salt: 'old-salt-1234567' }));
    const profile = makeProfile({ salt: 'activated-salt-00', name: 'Sparky' });
    saveProfile(profile, { activate: true });

    const loaded = loadPetConfigV2();
    expect(loaded?.activeProfile).toBe('activated-salt-00');
    expect(loaded?.salt).toBe('activated-salt-00');
    expect(loaded?.previousSalt).toBe('old-salt-1234567');
  });

  it('creates fresh v2 config if none exists', () => {
    saveProfile(makeProfile({ salt: 'first-salt-12345', name: 'First' }));
    const loaded = loadPetConfigV2();
    expect(loaded?.version).toBe(2);
    expect(loaded?.profiles['first-salt-12345']).toBeDefined();
  });

  it('does not set previousSalt when activating with same salt', () => {
    savePetConfigV2(makeV2({ salt: 'same-salt-1234567' }));
    saveProfile(makeProfile({ salt: 'same-salt-1234567' }), { activate: true });

    const loaded = loadPetConfigV2();
    expect(loaded?.previousSalt).toBeUndefined();
  });

  it('allows duplicate display names with different salts', () => {
    savePetConfigV2(makeV2());
    saveProfile(makeProfile({ salt: 'salt-aaaaaaaaaaaa', name: 'Tom' }));
    saveProfile(makeProfile({ salt: 'salt-bbbbbbbbbbbb', name: 'Tom' }));

    const loaded = loadPetConfigV2();
    expect(loaded?.profiles['salt-aaaaaaaaaaaa']?.name).toBe('Tom');
    expect(loaded?.profiles['salt-bbbbbbbbbbbb']?.name).toBe('Tom');
    expect(Object.keys(loaded?.profiles ?? {})).toHaveLength(2);
  });
});

describe('switchToProfile', () => {
  it('switches active profile by salt', () => {
    const salt = 'target-salt-12345';
    const profile = makeProfile({ salt, name: 'Target' });
    savePetConfigV2(makeV2({ salt: 'old-salt-1234567', profiles: { [salt]: profile } }));

    const result = switchToProfile(salt);
    expect(result.activeProfile).toBe(salt);
    expect(result.salt).toBe(salt);
    expect(result.previousSalt).toBe('old-salt-1234567');
  });

  it('throws on non-existent salt', () => {
    savePetConfigV2(makeV2());
    expect(() => switchToProfile('nonexistent-salt')).toThrow('Buddy not found');
  });

  it('throws when no config exists', () => {
    expect(() => switchToProfile('any-salt-1234567')).toThrow();
  });
});

describe('deleteProfile', () => {
  it('removes a non-active profile by salt', () => {
    const keepSalt = 'keep-salt-123456';
    const rmSalt = 'rm-salt-12345678';
    savePetConfigV2(
      makeV2({
        activeProfile: keepSalt,
        profiles: {
          [keepSalt]: makeProfile({ salt: keepSalt }),
          [rmSalt]: makeProfile({ salt: rmSalt }),
        },
      }),
    );

    deleteProfile(rmSalt);
    const loaded = loadPetConfigV2();
    expect(loaded?.profiles[rmSalt]).toBeUndefined();
    expect(loaded?.profiles[keepSalt]).toBeDefined();
  });

  it('throws when deleting the active profile', () => {
    const activeSalt = 'active-salt-12345';
    savePetConfigV2(
      makeV2({
        salt: activeSalt,
        activeProfile: activeSalt,
        profiles: { [activeSalt]: makeProfile({ salt: activeSalt, name: 'ActiveBud' }) },
      }),
    );

    expect(() => deleteProfile(activeSalt)).toThrow('Cannot delete the active buddy');
  });

  it('silently does nothing for non-existent salt', () => {
    savePetConfigV2(makeV2());
    expect(() => deleteProfile('ghost-salt-12345')).not.toThrow();
  });
});

describe('getProfiles', () => {
  it('returns empty object when no config', () => {
    expect(getProfiles()).toEqual({});
  });

  it('returns all saved profiles keyed by salt', () => {
    savePetConfigV2(
      makeV2({
        profiles: {
          'a-salt-123456789': makeProfile({ salt: 'a-salt-123456789' }),
          'b-salt-123456789': makeProfile({ salt: 'b-salt-123456789' }),
        },
      }),
    );
    const profiles = getProfiles();
    expect(Object.keys(profiles)).toEqual(['a-salt-123456789', 'b-salt-123456789']);
  });
});
