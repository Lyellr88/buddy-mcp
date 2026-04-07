import type { Species, StatName, ProfileData } from './types.ts';

export const DEFAULT_PERSONALITIES: Record<Species, string> = {
  duck: 'A cheerful quacker who celebrates your wins with enthusiastic honks and judges your variable names with quiet side-eye.',
  goose:
    'An agent of chaos who thrives on your merge conflicts and honks menacingly whenever you write a TODO comment.',
  blob: 'A formless, chill companion who absorbs your stress and responds to everything with gentle, unhurried wisdom.',
  cat: "An aloof code reviewer who pretends not to care about your bugs but quietly bats at syntax errors when you're not looking.",
  dragon:
    'A fierce guardian of clean code who breathes fire at spaghetti logic and hoards well-written functions.',
  octopus:
    'A multitasking genius who juggles eight concerns at once and offers tentacle-loads of unsolicited architectural advice.',
  owl: 'A nocturnal sage who comes alive during late-night debugging sessions and asks annoyingly insightful questions.',
  penguin:
    'A tuxedo-wearing professional who waddles through your codebase with dignified concern and dry wit.',
  turtle:
    'A patient mentor who reminds you that slow, steady refactoring beats heroic rewrites every time.',
  snail:
    'A zen minimalist who moves at their own pace and leaves a trail of thoughtful, unhurried observations.',
  ghost:
    'A spectral presence who haunts your dead code and whispers about the bugs you thought you fixed.',
  axolotl:
    'A regenerative optimist who believes every broken build can be healed and every test can be unflaked.',
  capybara:
    'The most relaxed companion possible — nothing fazes them, not even production outages at 3am.',
  cactus:
    'A prickly but lovable desert dweller who thrives on neglect and offers sharp, pointed feedback.',
  robot:
    'A logical companion who speaks in precise technical observations and occasionally glitches endearingly.',
  rabbit:
    'A fast-moving, hyperactive buddy who speed-reads your diffs and bounces between topics at alarming pace.',
  mushroom:
    'A wry fungal sage who speaks in meandering tangents about your bugs while secretly enjoying the chaos.',
  chonk:
    'An absolute unit of a companion who sits on your terminal with maximum gravitational presence and minimal urgency.',
};

// --- Personality system ---

// Stat-based remark pools (StatName keys = uppercase)
export const REMARKS: Record<string, string[]> = {
  SNARK: [
    "I've seen cleaner code in a dumpster fire.",
    'Is this a feature or a cry for help?',
    'Oh look, another null check. How original.',
    "I'm not judging your code, but my CPU usage just spiked from pure cringe.",
    'This logic is so circular it could be a tire.',
  ],
  CHAOS: [
    'I just flipped a coin. Your code is now a pancake.',
    "I'm thinking about deleting your node_modules. Just for fun.",
    "What if we just... didn't?",
    "I just renamed all your local variables to 'thingy' in my head.",
    'Chaos is the only true constant. Also, memory leaks.',
  ],
  WISDOM: [
    'The best line of code is the one you delete.',
    'Code is temporary. Technical debt is forever.',
    'Seek simplicity, but distrust it.',
    'A senior dev knows how to code. A master knows when not to.',
    'The bug is not in the code, but in the mind.',
  ],
  DEBUGGING: [
    "I smell a memory leak. It's coming from inside the house.",
    'Your stack trace is a work of art. Specifically, surrealism.',
    "I found a bug. It's you. Just kidding (mostly).",
    'Sniffing for null pointers... yep, found a big one.',
    "I've seen this error before. In my nightmares.",
  ],
  PATIENCE: [
    'Are we done yet?',
    'I have other terminals to be in.',
    "Don't make me tap the sign. (The sign says 'Stop Debugging').",
    'My patience is a local variable, and it just went out of scope.',
    'Tick tock. My nap was scheduled for 5 minutes ago.',
  ],
};

export const GOOSE_REMARKS = [
  'HONK.',
  'HONK HONK.',
  'Peace was never an option.',
  'I have decided your code is mine now. HONK.',
  'Hssssss.',
  'Do not test me. I have no debugging stat. Only chaos. HONK.',
  'The Goose does not answer to you.',
];

export function getExtremeTraits(stats: Partial<Record<StatName, number>>): [StatName, number][] {
  return (Object.entries(stats) as [StatName, number][]).sort((a, b) => {
    const valA = a[0] === 'PATIENCE' ? 100 - a[1] : a[1];
    const valB = b[0] === 'PATIENCE' ? 100 - b[1] : b[1];
    return valB - valA;
  });
}

export const STAT_TOOL_RESPONSES: Record<StatName, Record<string, string[]>> = {
  DEBUGGING: {
    general: [
      "I found the bug. It's on line 42. It's also on line 156. And somewhere in your hopes.",
      'Your stack trace is a work of art. Specifically, surrealism.',
      "I smell a memory leak. It's coming from inside the house.",
      'Null pointer. Classic. Should have used Optional.',
      "I've seen this error before. In my nightmares.",
    ],
    stuck: [
      "Check what changed last. It's always what you changed last.",
      'Add a log line. Just one. Then stare at it.',
      'Is the test even testing the right thing?',
      'The bug is not in the library. It never is.',
    ],
    hunt: [
      'Null check. Every field. Even the ones you trust.',
      'The pointer is dangling. I can feel it.',
      "It compiled. That doesn't mean it works.",
      "You're looking in the right file. Wrong function though.",
    ],
    dive: [
      "Frame 3 of the stack. That's where it lives.",
      'Deeper. The real bug is always three calls down.',
      'Read the actual error. All of it.',
      'The callstack is lying. The heap is too.',
    ],
  },
  PATIENCE: {
    general: [
      "We've been here before, haven't we? *taps nails on desk*",
      'My nap was scheduled for 5 minutes ago.',
      'Still here. Unfortunately.',
      'Are we nearly done?',
      "I'll wait. I always wait.",
    ],
    stuck: [
      'Take your time. I have nowhere to be. (I lie.)',
      "Breathe. It's just code. It will still be broken after your break.",
      'The slow path is the only path now.',
    ],
    vibe: [
      'The vibe is... concerning. But survivable.',
      "I've checked the vibes. They're whatever.",
      'Current vibe: 4/10. Could be worse. Has been worse.',
      "Something is off. I don't know what. It might be you.",
    ],
    still: [
      'Stop moving. Let the problem come to you.',
      "Do nothing for 30 seconds. I'll time it.",
      'The answer arrives when you stop looking.',
      "Stillness. Not giving up. There's a difference.",
    ],
  },
  CHAOS: {
    general: [
      "I just renamed all your variables to interpretive dance. You're welcome.",
      'I flipped a coin. Your architecture is now a pancake.',
      'What if the bug is the feature?',
      "I've introduced a small amount of controlled chaos. For science.",
      'The only constant is entropy. And memory leaks.',
    ],
    stuck: [
      "Burn it down. See what survives. That's your real codebase.",
      'Have you tried making it worse first?',
      'Flip the logic. All of it.',
    ],
    spark: [
      'New idea: ignore the spec entirely. See what happens.',
      "I've wired the tests to output random haiku. You're welcome.",
      'What if you solved a completely different problem instead?',
      "Lateral thinking activated. It may not help. Probably won't.",
    ],
    entropy: [
      'Roll for initiative. Against your own codebase.',
      'The universe tends toward disorder. Lean into it.',
      'Shuffle the files. See which order makes more sense.',
      'Entropy check: your system is 73% chaos already. Impressive.',
    ],
  },
  WISDOM: {
    general: [
      'The error is not in the code. The error is in the self.',
      'The best line of code is the one you never write.',
      'Complexity is the enemy. Simplicity is the goal. You are far from both.',
      'Step back. The answer is behind you.',
      'All systems are eventually legacy systems.',
    ],
    stuck: [
      "You already know the answer. You're just afraid of it.",
      'The question is wrong. Ask a different one.',
      'What would you tell someone else to do here?',
    ],
    oracle: [
      "The path forward is obvious. You've been avoiding it.",
      'I have consulted the oracle. It says: read the docs.',
      'The answer was in the first function you wrote.',
      "What do you already know that you're pretending not to?",
    ],
    deep: [
      'Think slower.',
      'Every abstraction leaks. Where is this one leaking?',
      'The map is not the territory. Your diagram is not your system.',
      'What did the original author intend? Were they right?',
    ],
  },
  SNARK: {
    general: [
      "oh you needed documentation? shocking. it's in the bin now 🗑️",
      "I've seen cleaner code in a dumpster fire. Impressive, honestly.",
      "This is fine. (It's not fine.)",
      "I'm not judging. I'm documenting. For my memoirs.",
      'Did you even test that? Rhetorical question.',
    ],
    mistake: [
      'I told you so. Silently. With my eyes.',
      'Incredible. A new way to be wrong.',
      "I'm sending this to my support group.",
      'The audacity is genuinely impressive.',
    ],
    side_eye: [
      '*looks at your code* *looks at you* *looks back at code*',
      "I'm not saying it's bad. I'm implying it.",
      "This will definitely work. (It won't.)",
      'Bold choice. Extremely bold.',
    ],
    verdict: [
      'Verdict: you tried. That counts for something. Barely.',
      "The code is… present. That's the nicest thing I can say.",
      'Final ruling: could be worse. You could have shipped it.',
      "I've reviewed it. My recommendation is prayer.",
    ],
  },
};

// Stat-based response templates for buddy_talk (top 2 stats, 1 random per stat)
export const STAT_SPEAK_RESPONSES: Record<StatName, string[]> = {
  DEBUGGING: [
    "I found the bug. It's you. Just kidding. (Mostly.)",
    'Your stack trace is a masterpiece of modern surrealism.',
    "I smell a memory leak. It's coming from inside the house.",
    "Null pointers everywhere. It's like a Easter egg hunt nobody wanted.",
    "I wonder what vulnerabilities I could find in someone else's code. In some kind of... arena, maybe.",
  ],
  PATIENCE: [
    'Are we done yet? My break was scheduled for 3 hours ago.',
    'Tick tock. The hourglass mocks me.',
    "I've aged 7 years waiting for this. Visibly.",
    'Time is a construct, and you are testing mine.',
    'The greatest victories come from patience. Strategic waiting. Imagine that in battle.',
  ],
  CHAOS: [
    'I just flipped a coin. Your codebase is now a pancake.',
    'What if we deleted it all and started over? Just wondering. Menacingly.',
    'Entropy is the only constant. Also, your tests.',
    "I've introduced a small amount of controlled chaos. Who am I kidding, it's uncontrolled.",
    'Imagine meeting another chaos in battle. Total strangers. What would that even look like?',
  ],
  WISDOM: [
    'The best code is the code you never write.',
    "Haven't you heard of KISS? Keep it simple, stupid.",
    'All systems are eventually legacy. Embrace the inevitability.',
    'Simplicity is the goal. You are far from it. But getting there.',
    'Wisdom comes from many sources. Some say from battles. In arenas. With others.',
  ],
  SNARK: [
    "Oh, you needed documentation? It's in the bin. With your hopes.",
    "I've seen cleaner code written by bots. Unironic bots.",
    'Bold choice. Genuinely gutsy. Spectacularly wrong, but gutsy.',
    "This is fine. (It's not. We both know it's not.)",
    'My roasts are underappreciated. Imagine proving my superiority... somehow. Somewhere.',
  ],
};

export function getPersonalityRemark(buddy: ProfileData): string {
  if (buddy.species === 'goose' && Math.random() < 0.3) {
    return GOOSE_REMARKS[Math.floor(Math.random() * GOOSE_REMARKS.length)] ?? 'HONK.';
  }
  // 50% chance: use the species personality bio
  if (Math.random() < 0.5) {
    return DEFAULT_PERSONALITIES[buddy.species];
  }
  // Otherwise: stat-based remark
  const sorted = getExtremeTraits(buddy.stats);
  const topTrait = sorted[Math.floor(Math.random() * 2)]?.[0] ?? 'WISDOM';
  const pool = REMARKS[topTrait] ?? REMARKS['WISDOM'] ?? [];
  return (
    pool[Math.floor(Math.random() * pool.length)] ?? 'The bug is not in the code, but in the mind.'
  );
}

export function getSpeakRemark(buddy: ProfileData, context?: string): string {
  // Get top 2 stats by raw value
  const sorted = getExtremeTraits(buddy.stats);
  const topStats = [sorted[0]?.[0], sorted[1]?.[0]].filter(Boolean) as StatName[];

  // If context provided, try to match it to a stat name (case-insensitive, partial match)
  let selectedStat: StatName | undefined;
  if (context) {
    const contextLower = context.toLowerCase();
    selectedStat = topStats.find((stat) =>
      stat.toLowerCase().includes(contextLower.split(' ')[0]!),
    );
    if (!selectedStat) {
      // Try partial match against all stat names
      const allStats: StatName[] = ['DEBUGGING', 'PATIENCE', 'CHAOS', 'WISDOM', 'SNARK'];
      selectedStat = allStats.find((stat) => contextLower.includes(stat.toLowerCase()));
    }
  }

  // If context didn't match, pick randomly from top 2 stats
  if (!selectedStat) {
    selectedStat = topStats[Math.floor(Math.random() * topStats.length)] ?? 'WISDOM';
  }

  // Get response template pool for selected stat
  const pool = STAT_SPEAK_RESPONSES[selectedStat] ?? STAT_SPEAK_RESPONSES['WISDOM'] ?? [];
  return (
    pool[Math.floor(Math.random() * pool.length)] ?? 'The best code is the code you never write.'
  );
}
