import chalk from 'chalk';
import type { CliFlags, DesiredTraits } from '@/types.js';
import type { Preset } from '@/presets.js';
import { getProfiles } from '@/config/index.js';
import { selectStartAction, selectPreset } from '../prompts.ts';
import { banner } from '../display.ts';
import { runBuddies } from './buddies.ts';
import { runInteractive, runInteractiveWithTraits } from './interactive.ts';

function hasTraitFlags(flags: CliFlags): boolean {
  return !!(
    flags.species ||
    flags.rarity ||
    flags.eye ||
    flags.hat ||
    flags.preset ||
    flags.shiny ||
    flags.peak ||
    flags.dump
  );
}

function presetToTraits(preset: Preset): DesiredTraits {
  return {
    species: preset.species,
    eye: preset.eye,
    rarity: preset.rarity,
    hat: preset.hat,
    shiny: false,
    peak: null,
    dump: null,
  };
}

type StartAction = 'build' | 'presets' | 'buddies';

export async function runStartScreen(flags: CliFlags = {}): Promise<void> {
  if (hasTraitFlags(flags)) {
    return runInteractive(flags);
  }

  const profiles = getProfiles();
  const buddyCount = Object.keys(profiles).length;

  // Try OpenTUI start screen, fall back to inquirer
  let action: StartAction | null = null;
  try {
    const { canUseBuilder } = await import('../builder/index.ts');
    if (await canUseBuilder()) {
      const { runStartTUI } = await import('../start/index.ts');
      action = await runStartTUI(buddyCount);
      if (action === null) return; // Esc / Ctrl+C
    }
  } catch {
    // OpenTUI unavailable — fall through to inquirer
  }

  if (action === null) {
    banner();
    if (typeof globalThis.Bun === 'undefined') {
      console.log(
        chalk.yellow(
          '  ⚠  Bun is not installed — using basic prompts.\n' +
            '     Install Bun (https://bun.sh) for the full interactive TUI.\n',
        ),
      );
    } else {
      const cols = process.stdout.columns ?? 0;
      const rows = process.stdout.rows ?? 0;
      if (cols < 70 || rows < 18) {
        console.log(
          chalk.yellow(
            `  ⚠  Terminal too small (${cols}x${rows}) — need at least 70x18 for the TUI.\n` +
              '     Resize your terminal for the full interactive experience.\n',
          ),
        );
      }
    }
    action = await selectStartAction(buddyCount);
  }

  switch (action) {
    case 'build':
      return runInteractive(flags, { skipBanner: true });

    case 'presets': {
      // Try OpenTUI presets browser, fall back to inquirer
      let preset: Preset | null = null;
      try {
        const { canUseBuilder } = await import('../builder/index.ts');
        if (await canUseBuilder()) {
          const { runPresetsTUI } = await import('../presets/index.ts');
          preset = await runPresetsTUI();
          if (preset === null) {
            // User pressed Esc — go back to start screen
            return runStartScreen(flags);
          }
        }
      } catch {
        // fall through to inquirer
      }

      if (!preset) {
        preset = await selectPreset();
      }

      return runInteractiveWithTraits(presetToTraits(preset), flags);
    }

    case 'buddies':
      return runBuddies();
  }
}
