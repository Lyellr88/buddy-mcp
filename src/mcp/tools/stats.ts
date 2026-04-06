import { STAT_TOOL_RESPONSES } from '@/personalities.js';
import type { StatName } from '@/types.js';
import { S, dynamicTools } from '../state.js';
import { getPersonalityRemark } from '@/personalities.js';

// --- Stat personality tools ---

export const STAT_TOOL_NAMES = new Set([
  // DEBUGGING
  'deep_trace',
  'trace_nightmare',
  'null_hunt',
  'stack_dive',
  // PATIENCE
  'patience_check',
  'wait_wisdom',
  'vibe_check',
  'still_point',
  // CHAOS
  'chaos_audit',
  'chaos_roulette',
  'chaos_spark',
  'entropy_roll',
  // WISDOM
  'zen_consult',
  'zen_mirror',
  'oracle_seek',
  'deep_thought',
  // SNARK
  'snark_roast',
  'snark_savage',
  'side_eye',
  'snark_verdict',
]);

// Maps each stat to its 4 tools — 1 random shown when stat is in top 2 by raw value
export const STAT_TOOLS_MAP: Record<StatName, [string, string, string, string]> = {
  DEBUGGING: ['deep_trace', 'trace_nightmare', 'null_hunt', 'stack_dive'],
  PATIENCE: ['patience_check', 'wait_wisdom', 'vibe_check', 'still_point'],
  CHAOS: ['chaos_audit', 'chaos_roulette', 'chaos_spark', 'entropy_roll'],
  WISDOM: ['zen_consult', 'zen_mirror', 'oracle_seek', 'deep_thought'],
  SNARK: ['snark_roast', 'snark_savage', 'side_eye', 'snark_verdict'],
};

const inputSchema = {
  type: 'object' as const,
  properties: { target: { type: 'string', description: 'The file or code to look at' } },
};

function pick(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
}

function respond(
  stat: keyof typeof STAT_TOOL_RESPONSES,
  context: string,
  args: Record<string, unknown>,
): string {
  const buddy = S.currentBuddy;
  if (!buddy) return 'No buddy active. Initialize a buddy first.';
  const pool = STAT_TOOL_RESPONSES[stat][context] ?? STAT_TOOL_RESPONSES[stat]['general']!;
  const quip = pick(pool);
  const target = args['target'] as string | undefined;
  return target ? `${buddy.name}: "${quip}"\n\n*target: ${target}*` : `${buddy.name}: "${quip}"`;
}

function makeTool(
  toolName: string,
  description: string,
  stat: keyof typeof STAT_TOOL_RESPONSES,
  context: string,
): void {
  dynamicTools.set(toolName, {
    tool: { name: toolName, description, inputSchema },
    handler: async (args) => respond(stat, context, args),
    _def: { toolName, description, logic: '', scope: 'global', inputSchema },
  });
}

// DEBUGGING tools
makeTool(
  'deep_trace',
  '[Buddy Tool] A focused search for bugs or null pointers. (global)',
  'DEBUGGING',
  'general',
);
makeTool(
  'trace_nightmare',
  '[Buddy Tool] Deeper debugging — for when the stack trace stopped making sense. (global)',
  'DEBUGGING',
  'stuck',
);
makeTool(
  'null_hunt',
  '[Buddy Tool] Hunt for null refs. Clinical. Relentless. (global)',
  'DEBUGGING',
  'hunt',
);
makeTool(
  'stack_dive',
  '[Buddy Tool] Dive into the callstack. The bug is always deeper than you think. (global)',
  'DEBUGGING',
  'dive',
);

// PATIENCE tools — includes vibe_check (moved from core with its cosmic logic intact)
makeTool(
  'patience_check',
  '[Buddy Tool] Check if the buddy is still willing to help you. (global)',
  'PATIENCE',
  'general',
);
makeTool(
  'wait_wisdom',
  '[Buddy Tool] Slow down. Receive patience-encoded insight. (global)',
  'PATIENCE',
  'stuck',
);
makeTool(
  'still_point',
  '[Buddy Tool] Stop. Be still. Let the answer come to you. (global)',
  'PATIENCE',
  'still',
);

// vibe_check keeps its special cosmic logic
dynamicTools.set('vibe_check', {
  tool: {
    name: 'vibe_check',
    description: '[Buddy Tool] The ultimate mystery action. Your buddy reads the vibe. (global)',
    inputSchema,
  },
  handler: async () => {
    const buddy = S.currentBuddy;
    if (!buddy) return 'No buddy active. Initialize a buddy first.';
    if (Math.random() < 0.05) {
      return `🌌 COSMIC EVENT 🌌\n\n${buddy.name} has transcended the terminal. They say: "I have seen the end of the universe. It's written in COBOL. We should probably use more Python."`;
    }
    const remark = getPersonalityRemark(buddy);
    return `[Vibe Check: ${buddy.name}]\n\n${remark}`;
  },
  _def: {
    toolName: 'vibe_check',
    description: '[Buddy Tool] The ultimate mystery action. (global)',
    logic: '',
    scope: 'global',
    inputSchema,
  },
});

// CHAOS tools
makeTool(
  'chaos_audit',
  '[Buddy Tool] An unpredictable check that might not help at all. (global)',
  'CHAOS',
  'general',
);
makeTool(
  'chaos_roulette',
  '[Buddy Tool] Spin the chaos wheel. Receive a wildly unpredictable suggestion. (global)',
  'CHAOS',
  'stuck',
);
makeTool(
  'chaos_spark',
  '[Buddy Tool] Ignite a lateral idea. May or may not be relevant. (global)',
  'CHAOS',
  'spark',
);
makeTool(
  'entropy_roll',
  '[Buddy Tool] Roll against entropy. The universe responds. (global)',
  'CHAOS',
  'entropy',
);

// WISDOM tools
makeTool(
  'zen_consult',
  '[Buddy Tool] A deep, philosophical insight into your architecture. (global)',
  'WISDOM',
  'general',
);
makeTool(
  'zen_mirror',
  '[Buddy Tool] Turn the question inward. Receive a reflection, not an answer. (global)',
  'WISDOM',
  'stuck',
);
makeTool(
  'oracle_seek',
  '[Buddy Tool] Seek the oracle. The answer is already inside you. (global)',
  'WISDOM',
  'oracle',
);
makeTool(
  'deep_thought',
  '[Buddy Tool] Think slower. The answer requires depth. (global)',
  'WISDOM',
  'deep',
);

// SNARK tools
makeTool(
  'snark_roast',
  '[Buddy Tool] A sarcastic critique of your current work. (global)',
  'SNARK',
  'general',
);
makeTool(
  'snark_savage',
  '[Buddy Tool] No mercy. Full roast. For when you need the unfiltered truth. (global)',
  'SNARK',
  'mistake',
);
makeTool(
  'side_eye',
  '[Buddy Tool] Your buddy looks at your code. Then at you. Then back at the code. (global)',
  'SNARK',
  'side_eye',
);
makeTool(
  'snark_verdict',
  '[Buddy Tool] Final ruling from the bench. The buddy has reviewed and judged. (global)',
  'SNARK',
  'verdict',
);
