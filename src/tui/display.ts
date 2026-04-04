import chalk from 'chalk';
import type { Bones, PatchResult } from '@/types.js';
import { RARITY_STARS } from '@/constants.js';
import { renderSprite } from '@/sprites/index.js';
import { RARITY_CHALK } from './format.ts';

export function banner(): void {
  console.log(chalk.bold('\n  any-buddy'));
  console.log(chalk.dim('  Pick any Claude Code companion pet\n'));
}

export function showPet(bones: Bones, label = 'Your pet'): void {
  const rarityColor = RARITY_CHALK[bones.rarity] || chalk.white;
  console.log(rarityColor(`\n  ${label}: ${bones.species} ${RARITY_STARS[bones.rarity]}`));
  let info = `  Rarity: ${bones.rarity}  Eyes: ${bones.eye}  Hat: ${bones.hat}  Shiny: ${bones.shiny ? 'YES' : 'no'}`;
  if (bones.stats && Object.keys(bones.stats).length) {
    const sorted = Object.entries(bones.stats).sort((a, b) => b[1] - a[1]);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    info += `\n  Best: ${best[0]} ${best[1]}  Worst: ${worst[0]} ${worst[1]}`;
  }
  console.log(rarityColor(info));
  const lines = renderSprite(bones, 0);
  console.log();
  for (const line of lines) {
    console.log(rarityColor('    ' + line));
  }
  console.log();
}

export function warnCodesign(result: PatchResult, binaryPath: string): void {
  if (result.codesignError) {
    console.log(chalk.yellow(`  Warning: codesign failed: ${result.codesignError}`));
    console.log(chalk.yellow(`  Run manually: codesign --force --sign - "${binaryPath}"`));
  }
}
