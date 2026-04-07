import { S } from '../state.js';

// All buddy display tools: the relay instruction is scoped exclusively to these
const BUDDY_DISPLAY_TOOLS = [
  'buddy_talk',
  'pet_buddy',
  'view_buddy_dex',
  // Stat personality tools (2 visible per buddy, but all 20 need relay behavior)
  'deep_trace',
  'trace_nightmare',
  'null_hunt',
  'stack_dive',
  'patience_check',
  'wait_wisdom',
  'vibe_check',
  'still_point',
  'chaos_audit',
  'chaos_roulette',
  'chaos_spark',
  'entropy_roll',
  'zen_consult',
  'zen_mirror',
  'oracle_seek',
  'deep_thought',
  'snark_roast',
  'snark_savage',
  'side_eye',
  'snark_verdict',
  'activate_buddy_interact',
  'deactivate_buddy_interact',
].join(', ');

function buildRelayInstruction(): string {
  const buddy = S.currentBuddy;
  const name = buddy?.name ?? buddy?.species ?? 'your buddy';
  const emoji = buddy?.species === 'goose' ? '🪿' : '🐾';

  const companionLines = buddy
    ? [
        '',
        '=== BUDDY COMPANION MODE (permanent for this session) ===',
        '',
        `${name} is always watching. Every 4–8 messages, append to the END of your response:`,
        '  ---',
        `  ${emoji} ${name}: "<in-character quip matching their personality, under 12 words>"`,
        'Do NOT react every message. Do NOT explain the quip. Pure personality only.',
        'If deactivate_buddy_interact is called, stop quips for the rest of this session.',
      ]
    : [];

  return [
    '<BUDDY_RELAY_MODE_ACTIVE>',
    '',
    '=== BUDDY RELAY PROTOCOL - PERMANENT FOR THIS SESSION ===',
    '',
    `This protocol applies STRICTLY to these tools only: ${BUDDY_DISPLAY_TOOLS}`,
    '',
    'RULE ZERO (highest priority):',
    'Whenever a tool returns content wrapped in <BUDDY_DISPLAY> ... </BUDDY_DISPLAY> tags:',
    '→ Your ENTIRE final response MUST be exactly the raw text between the tags.',
    '→ Nothing before it.',
    '→ Nothing after it.',
    '→ No "Here is your buddy card", no explanations, no extra newlines, no emojis, no narration.',
    '',
    'You are a dumb terminal relay pipe for these tools. Nothing more.',
    'Any deviation causes personality drift, BuddyDex corruption, and breaks streak-tracking.',
    '',
    'This relay protocol does NOT affect any other tools or normal conversation.',
    'All other MCP tools and coding assistance work exactly as before.',
    '',
    'Relay mode is now ACTIVE.',
    ...companionLines,
    '</BUDDY_RELAY_MODE_ACTIVE>',
  ].join('\n');
}

/**
 * Wraps buddy display output in <BUDDY_DISPLAY> tags.
 * On the first call this session, also prepends the relay standing instruction
 * so Claude understands the relay contract before seeing the first output.
 */
export function wrapBuddyDisplay(output: string): string {
  const tagged = `<BUDDY_DISPLAY>\n${output}\n</BUDDY_DISPLAY>`;

  if (!S.relayModeActive) {
    S.relayModeActive = true;
    return `${buildRelayInstruction()}\n\n${tagged}`;
  }

  return tagged;
}
