import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { PetConfig, PetConfigV2, ProfileData } from '@/types.js';
import { ORIGINAL_SALT } from '@/constants.js';
import { getCompanionName, getCompanionPersonality } from './claude-config.ts';

const OUR_CONFIG = join(homedir(), '.buddy-mcp.json');

export function savePetConfig(data: PetConfig): void {
  writeFileSync(OUR_CONFIG, JSON.stringify(data, null, 2) + '\n');
}

export function loadPetConfig(): PetConfig | null {
  if (!existsSync(OUR_CONFIG)) return null;
  try {
    return JSON.parse(readFileSync(OUR_CONFIG, 'utf-8')) as PetConfig;
  } catch {
    return null;
  }
}

function migrateV1(v1: PetConfig): PetConfigV2 {
  const migrated: PetConfigV2 = {
    version: 2,
    activeProfile: null,
    salt: v1.salt,
    previousSalt: v1.previousSalt,
    profiles: {},
    appliedTo: v1.appliedTo,
    appliedAt: v1.appliedAt,
  };

  if (v1.salt && v1.salt !== ORIGINAL_SALT && !v1.restored) {
    migrated.activeProfile = v1.salt;
    migrated.profiles[v1.salt] = {
      salt: v1.salt,
      species: v1.species ?? 'duck',
      rarity: v1.rarity ?? 'common',
      eye: v1.eye ?? '·',
      hat: v1.hat ?? 'none',
      shiny: false,
      stats: {},
      name: getCompanionName(),
      personality: getCompanionPersonality(),
      createdAt: v1.appliedAt ?? new Date().toISOString(),
    };
  }

  return migrated;
}

/**
 * Migrate v2 configs that were keyed by display name to salt-keyed.
 * Detects the old format by checking if any key is NOT a valid salt
 * (salts are exactly 15 chars from the charset [a-zA-Z0-9_-]).
 */
function migrateNameKeyedProfiles(config: PetConfigV2): boolean {
  const saltPattern = /^[a-zA-Z0-9_-]{15}$/;
  const entries = Object.entries(config.profiles);
  if (entries.length === 0) return false;

  if (entries.every(([key]) => saltPattern.test(key))) return false;

  const newProfiles: Record<string, ProfileData> = {};
  for (const [key, profile] of entries) {
    if (saltPattern.test(key)) {
      newProfiles[key] = profile;
    } else {
      // Old name-keyed entry: re-key by salt, store old key as display name
      newProfiles[profile.salt] = {
        ...profile,
        name: profile.name ?? key,
      };
      if (config.activeProfile === key) {
        config.activeProfile = profile.salt;
      }
    }
  }

  config.profiles = newProfiles;
  return true;
}

export function loadPetConfigV2(): PetConfigV2 | null {
  if (!existsSync(OUR_CONFIG)) return null;
  try {
    const raw = JSON.parse(readFileSync(OUR_CONFIG, 'utf-8'));
    if (raw.version === 2) {
      const config = raw as PetConfigV2;
      if (migrateNameKeyedProfiles(config)) {
        savePetConfigV2(config);
      }
      return config;
    }
    const migrated = migrateV1(raw as PetConfig);
    savePetConfigV2(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function savePetConfigV2(data: PetConfigV2): void {
  writeFileSync(OUR_CONFIG, JSON.stringify(data, null, 2) + '\n');
}

export function saveProfile(
  profile: ProfileData,
  { activate = false }: { activate?: boolean } = {},
): void {
  const config = loadPetConfigV2() ?? {
    version: 2 as const,
    activeProfile: null,
    salt: ORIGINAL_SALT,
    profiles: {},
  };

  config.profiles[profile.salt] = profile;

  if (activate) {
    config.activeProfile = profile.salt;
    if (config.salt && config.salt !== profile.salt) {
      config.previousSalt = config.salt;
    }
    config.salt = profile.salt;
  }

  savePetConfigV2(config);
}

export function getProfiles(): Record<string, ProfileData> {
  const config = loadPetConfigV2();
  return config?.profiles ?? {};
}

export function switchToProfile(salt: string): PetConfigV2 {
  const config = loadPetConfigV2();
  if (!config?.profiles[salt]) {
    throw new Error(`Buddy not found (salt: ${salt.slice(0, 6)}...)`);
  }

  config.previousSalt = config.salt;
  config.activeProfile = salt;
  config.salt = config.profiles[salt].salt;
  config.appliedAt = new Date().toISOString();

  savePetConfigV2(config);
  return config;
}

export function deleteProfile(salt: string): void {
  const config = loadPetConfigV2();
  if (!config?.profiles[salt]) return;
  if (config.activeProfile === salt) {
    const name = config.profiles[salt].name ?? salt.slice(0, 6);
    throw new Error(`Cannot delete the active buddy "${name}". Switch to another first.`);
  }
  config.profiles = Object.fromEntries(
    Object.entries(config.profiles).filter(([key]) => key !== salt),
  );
  savePetConfigV2(config);
}
