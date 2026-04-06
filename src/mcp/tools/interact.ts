import { buildInteractInstruction, getPersonalityRemark } from '@/personalities.js';
import { isHookInstalled, installHook } from '@/config/hooks.js';
import { S, gachaState, dynamicTools } from '../state.js';
import { saveGachaState } from '../persistence.js';

const activateBuddyInteractTool = {
  tool: {
    name: 'activate_buddy_interact',
    description:
      'Activate buddy observation mode. Your buddy will occasionally react to session events.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  handler: async () => {
    if (!S.currentBuddy) return 'Initialize a buddy first!';
    if (gachaState.interactMode)
      return `${S.currentBuddy.name ?? S.currentBuddy.species} is already watching.`;

    gachaState.interactMode = true;
    saveGachaState();

    // Auto-install hook if not already present
    if (!isHookInstalled()) {
      try {
        installHook(process.argv[1]);
      } catch {
        // Non-fatal — hook install failure shouldn't break the activate
      }
    }

    return buildInteractInstruction(S.currentBuddy);
  },
};

const deactivateBuddyInteractTool = {
  tool: {
    name: 'deactivate_buddy_interact',
    description: 'Deactivate buddy observation mode. Your buddy stops watching.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  handler: async () => {
    if (!gachaState.interactMode) return "Buddy wasn't watching.";

    gachaState.interactMode = false;
    saveGachaState();

    const farewell = S.currentBuddy ? getPersonalityRemark(S.currentBuddy) : 'Gone.';
    const name = S.currentBuddy?.name ?? S.currentBuddy?.species ?? 'Buddy';
    return `${name} stops watching.\n\n"${farewell}"`;
  },
};

dynamicTools.set('activate_buddy_interact', {
  tool: activateBuddyInteractTool.tool,
  handler: activateBuddyInteractTool.handler,
  _def: {
    toolName: 'activate_buddy_interact',
    description: activateBuddyInteractTool.tool.description,
    logic: '',
    scope: 'local',
  },
});

dynamicTools.set('deactivate_buddy_interact', {
  tool: deactivateBuddyInteractTool.tool,
  handler: deactivateBuddyInteractTool.handler,
  _def: {
    toolName: 'deactivate_buddy_interact',
    description: deactivateBuddyInteractTool.tool.description,
    logic: '',
    scope: 'local',
  },
});
