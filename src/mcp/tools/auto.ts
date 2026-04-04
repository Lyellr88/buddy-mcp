import type { ProfileData } from '@/types.js';
import { dynamicTools } from '../state.js';
import { registerManifestedTool } from '../persistence.js';
import { getExtremeTraits } from '@/personalities.js';

// --- Personality-based auto-tools ---

export const AUTO_TOOL_NAMES = new Set([
  'snark_roast',
  'chaos_audit',
  'zen_consult',
  'deep_trace',
  'patience_check',
]);

export function autoManifestTools(buddy: ProfileData): void {
  for (const name of AUTO_TOOL_NAMES) dynamicTools.delete(name);

  const sorted = getExtremeTraits(buddy.stats);
  const topTraits = sorted.slice(0, 3);

  const inputSchema = {
    type: 'object',
    properties: { target: { type: 'string', description: 'The file or code to look at' } },
  };

  for (const [trait] of topTraits) {
    let toolName = '';
    let description = '';
    let logic = '';

    switch (trait) {
      case 'SNARK':
        toolName = 'snark_roast';
        description = 'A sarcastic critique of your current work.';
        logic = "{buddy.name} sneers: 'I've seen more elegant logic in a fortune cookie. This {args.target} is... well, it's something. Snark level: {buddy.stats.snark}.'";
        break;
      case 'CHAOS':
        toolName = 'chaos_audit';
        description = 'An unpredictable check that might not help at all.';
        logic = "{buddy.name} is randomly rearranging your mental model. 'I've decided to roll a d100 for your success. Result: {buddy.stats.chaos}. Good luck with {args.target}.'";
        break;
      case 'WISDOM':
        toolName = 'zen_consult';
        description = 'A deep, philosophical insight into your architecture.';
        logic = "{buddy.name} closes their eyes. 'The bug is not in the code, but in the mind. {args.target} is merely a mirror. Wisdom: {buddy.stats.wisdom}.'";
        break;
      case 'DEBUGGING':
        toolName = 'deep_trace';
        description = 'A focused search for bugs or null pointers.';
        logic = "{buddy.name} sniffs the air. 'I smell a memory leak or a bad pointer near {args.target}. My debugging sense is {buddy.stats.debugging} after all.'";
        break;
      case 'PATIENCE':
        toolName = 'patience_check';
        description = 'Check if the buddy is still willing to help you.';
        logic = "* {buddy.name}'s whiskers twitch violently * 'I HAVE NO PATIENCE FOR THIS. GOOGLE IT.' (Patience: {buddy.stats.patience})";
        break;
    }

    if (toolName && !dynamicTools.has(toolName)) {
      registerManifestedTool(toolName, description, logic, 'global', inputSchema);
    }
  }
}
