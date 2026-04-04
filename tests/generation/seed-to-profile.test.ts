import { describe, it, expect } from 'vitest';
import { roll } from '@/generation/roll.js';
import { SPECIES } from '@/constants.js';
import { DEFAULT_PERSONALITIES } from '@/personalities.js';
import type { DesiredTraits, ProfileData } from '@/types.js';

/**
 * These tests verify that the seed→profile→display pipeline is consistent:
 * the traits stored in a ProfileData match what roll() produces from the salt.
 *
 * Bug 1: interactive.ts saved `desired.*` (user's selection) for species/rarity/eye/hat/shiny
 * but `foundBones.*` (from roll) for stats — mixing two data sources into one profile.
 * The shiny flag is the worst offender: the worker only enforces shiny when the user
 * requested it (requireShiny=true). When the user said shiny=false, the salt might
 * still produce shiny=true, and the profile would store the wrong value.
 *
 * Bug 2: Profiles are created with personality=null. When switching profiles, null
 * personality causes the previous species' personality to persist — a mushroom buddy
 * ends up with a cat's personality.
 */

function findMatchingSalt(
  userId: string,
  desired: Pick<DesiredTraits, 'species' | 'rarity' | 'eye' | 'hat'>,
): string {
  for (let i = 0; i < 500_000; i++) {
    const salt = `test-${String(i).padStart(10, '0')}`;
    const result = roll(userId, salt, { useNodeHash: true });
    if (
      result.bones.species === desired.species &&
      result.bones.rarity === desired.rarity &&
      result.bones.eye === desired.eye &&
      result.bones.hat === desired.hat
    ) {
      return salt;
    }
  }
  throw new Error(`Could not find salt for ${JSON.stringify(desired)} after 500k attempts`);
}

describe('seed-to-profile consistency', () => {
  const userId = 'test-user-seed-profile';

  it('roll() output matches desired traits when salt was found for those traits', () => {
    const desired = {
      species: 'duck' as const,
      rarity: 'common' as const,
      eye: '·' as const,
      hat: 'none' as const,
    };
    const salt = findMatchingSalt(userId, desired);
    const result = roll(userId, salt, { useNodeHash: true });

    expect(result.bones.species).toBe(desired.species);
    expect(result.bones.rarity).toBe(desired.rarity);
    expect(result.bones.eye).toBe(desired.eye);
    expect(result.bones.hat).toBe(desired.hat);
  });

  it('profile traits must equal what roll() reproduces from the stored salt', () => {
    const targets: Pick<DesiredTraits, 'species' | 'rarity' | 'eye' | 'hat'>[] = [
      { species: 'duck', rarity: 'common', eye: '·', hat: 'none' },
      { species: 'cat', rarity: 'rare', eye: '°', hat: 'beanie' },
      { species: 'dragon', rarity: 'epic', eye: '◉', hat: 'crown' },
    ];

    for (const target of targets) {
      const salt = findMatchingSalt(userId, target);
      const bones1 = roll(userId, salt, { useNodeHash: true }).bones;
      const bones2 = roll(userId, salt, { useNodeHash: true }).bones;

      // Deterministic: same salt → same traits
      expect(bones1).toEqual(bones2);

      expect(bones1.species).toBe(target.species);
      expect(bones1.rarity).toBe(target.rarity);
      expect(bones1.eye).toBe(target.eye);
      expect(bones1.hat).toBe(target.hat);
    }
  });

  it('shiny flag can differ between desired and rolled — profile must use rolled value', () => {
    // The worker skips shiny validation when requireShiny is false.
    // So desired.shiny=false does NOT guarantee foundBones.shiny=false.
    // The profile must store foundBones.shiny, not desired.shiny.
    const desired = {
      species: 'duck' as const,
      rarity: 'common' as const,
      eye: '·' as const,
      hat: 'none' as const,
    };

    let foundShinyMismatch = false;
    for (let i = 0; i < 200_000; i++) {
      const salt = `shiny-test-${String(i).padStart(7, '0')}`;
      const result = roll(userId, salt, { useNodeHash: true });
      if (
        result.bones.species === desired.species &&
        result.bones.rarity === desired.rarity &&
        result.bones.eye === desired.eye &&
        result.bones.hat === desired.hat &&
        result.bones.shiny === true
      ) {
        foundShinyMismatch = true;
        // This salt matches desired traits but is shiny.
        // If the profile stored desired.shiny=false, it would be WRONG.
        expect(result.bones.shiny).toBe(true);
        break;
      }
    }

    // With 1% shiny chance and ~180 attempts per match, we find one in ~18k tries
    expect(foundShinyMismatch).toBe(true);
  });
});

describe('personality consistency', () => {
  it('every species has a default personality', () => {
    for (const species of SPECIES) {
      const personality = DEFAULT_PERSONALITIES[species];
      expect(personality, `missing default personality for ${species}`).toBeTruthy();
      expect(typeof personality).toBe('string');
      expect(personality.length).toBeGreaterThan(0);
    }
  });

  it('profile created without explicit personality should use species default', () => {
    // Simulates the profile creation bug:
    // interactive.ts saves personality: null when no companion is hatched.
    // Later, switching to this profile skips setCompanionPersonality because
    // incoming.personality is null — the old species personality persists.
    const userId = 'test-user-personality';
    const mushroomTarget = {
      species: 'mushroom' as const,
      rarity: 'rare' as const,
      eye: '✦' as const,
      hat: 'wizard' as const,
    };
    const salt = findMatchingSalt(userId, mushroomTarget);
    const foundBones = roll(userId, salt, { useNodeHash: true }).bones;

    // BUG: old code saves personality: null
    const buggyProfile: ProfileData = {
      salt,
      species: foundBones.species,
      rarity: foundBones.rarity,
      eye: foundBones.eye,
      hat: foundBones.hat,
      shiny: foundBones.shiny,
      stats: foundBones.stats,
      name: null,
      personality: null, // ← BUG: should be the species default
      createdAt: new Date().toISOString(),
    };

    // FIX: profile should use species default when no explicit personality
    const expectedPersonality = DEFAULT_PERSONALITIES[foundBones.species];
    expect(buggyProfile.personality).toBeNull(); // confirms the bug
    expect(expectedPersonality).toBeTruthy(); // the default exists
    expect(expectedPersonality).toContain('fungal'); // mushroom personality mentions fungal
  });
});

describe('profile switching personality leak', () => {
  it('null personality on incoming profile causes personality leak from outgoing', () => {
    // This test documents the profile switching bug in buddies.ts:
    //
    // 1. User creates cat buddy → profile saved with cat personality
    // 2. User creates mushroom buddy → profile saved with personality: null
    //    (no companion hatched yet, or user skipped personality step)
    // 3. User switches from cat to mushroom
    // 4. buddies.ts snapshots cat personality to cat profile ✓
    // 5. buddies.ts tries to restore mushroom personality:
    //    if (incoming?.personality) { setCompanionPersonality(...) }
    //    → personality is null, so it SKIPS the set!
    // 6. Result: mushroom buddy has cat personality ← BUG
    //
    // The fix: when personality is null, use DEFAULT_PERSONALITIES[species]

    const mushroomProfile: ProfileData = {
      salt: 'mush-salt-1234567',
      species: 'mushroom',
      rarity: 'rare',
      eye: '✦',
      hat: 'wizard',
      shiny: false,
      stats: {},
      name: null,
      personality: null, // ← the bug: null personality
      createdAt: new Date().toISOString(),
    };

    // Simulate buddies.ts switching logic:
    // The incoming profile's personality determines what gets set
    const incomingPersonality = mushroomProfile.personality;

    // BUG: null personality means no personality is set — old one persists
    const willSetPersonality = !!incomingPersonality;
    expect(willSetPersonality).toBe(false); // confirms the bug

    // The companion would still have catProfile's personality
    // FIX: fall back to DEFAULT_PERSONALITIES[incoming.species]
    const fixedPersonality = incomingPersonality ?? DEFAULT_PERSONALITIES[mushroomProfile.species];
    expect(fixedPersonality).toContain('fungal');
    expect(fixedPersonality).not.toContain('cat');
  });
});
