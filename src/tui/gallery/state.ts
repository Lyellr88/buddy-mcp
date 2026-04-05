import type { Bones, ProfileData } from '@/types.js';
import { ORIGINAL_SALT } from '@/constants.js';
import { roll } from '@/generation/index.js';
import { getProfiles, loadPetConfigV2 } from '@/config/index.js';
import { isNodeRuntime } from '@/patcher/salt-ops.js';

export const DEFAULT_PROFILE = '__default__';

export interface GalleryEntry {
  name: string; // display name
  salt: string; // unique identifier (salt or DEFAULT_PROFILE)
  isDefault: boolean;
  isActive: boolean;
  bones: Bones;
  profile: ProfileData | null;
}

export function buildGalleryEntries(userId: string, binaryPath: string): GalleryEntry[] {
  const useNodeHash = isNodeRuntime(binaryPath);
  const profiles = getProfiles();
  const currentSalt = loadPetConfigV2()?.salt ?? ORIGINAL_SALT;

  const defaultBones = roll(userId, ORIGINAL_SALT, { useNodeHash }).bones;
  const defaultEntry: GalleryEntry = {
    name: 'Original',
    salt: DEFAULT_PROFILE,
    isDefault: true,
    isActive: currentSalt === ORIGINAL_SALT,
    bones: defaultBones,
    profile: null,
  };

  const profileEntries: GalleryEntry[] = Object.entries(profiles).map(([salt, profile]) => ({
    name: profile.name ?? salt.slice(0, 8),
    salt,
    isDefault: false,
    isActive: profile.salt === currentSalt,
    bones: roll(userId, profile.salt, { useNodeHash }).bones,
    profile,
  }));

  return [defaultEntry, ...profileEntries];
}

export function activeEntryIndex(entries: GalleryEntry[]): number {
  const idx = entries.findIndex((e) => e.isActive);
  return idx >= 0 ? idx : 0;
}
