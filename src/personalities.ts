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
    "I just flipped a coin. Your code is now a pancake.",
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
    "Tick tock. My nap was scheduled for 5 minutes ago.",
  ],
};

export const GOOSE_REMARKS = [
  'HONK.',
  'HONK HONK.',
  'Peace was never an option.',
  "I have decided your code is mine now. HONK.",
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
      "Your stack trace is a work of art. Specifically, surrealism.",
      "I smell a memory leak. It's coming from inside the house.",
      "Null pointer. Classic. Should have used Optional.",
      "I've seen this error before. In my nightmares.",
    ],
    stuck: [
      "Check what changed last. It's always what you changed last.",
      "Add a log line. Just one. Then stare at it.",
      "Is the test even testing the right thing?",
      "The bug is not in the library. It never is.",
    ],
    hunt: [
      "Null check. Every field. Even the ones you trust.",
      "The pointer is dangling. I can feel it.",
      "It compiled. That doesn't mean it works.",
      "You're looking in the right file. Wrong function though.",
    ],
    dive: [
      "Frame 3 of the stack. That's where it lives.",
      "Deeper. The real bug is always three calls down.",
      "Read the actual error. All of it.",
      "The callstack is lying. The heap is too.",
    ],
  },
  PATIENCE: {
    general: [
      "We've been here before, haven't we? *taps nails on desk*",
      "My nap was scheduled for 5 minutes ago.",
      "Still here. Unfortunately.",
      "Are we nearly done?",
      "I'll wait. I always wait.",
    ],
    stuck: [
      "Take your time. I have nowhere to be. (I lie.)",
      "Breathe. It's just code. It will still be broken after your break.",
      "The slow path is the only path now.",
    ],
    vibe: [
      "The vibe is... concerning. But survivable.",
      "I've checked the vibes. They're whatever.",
      "Current vibe: 4/10. Could be worse. Has been worse.",
      "Something is off. I don't know what. It might be you.",
    ],
    still: [
      "Stop moving. Let the problem come to you.",
      "Do nothing for 30 seconds. I'll time it.",
      "The answer arrives when you stop looking.",
      "Stillness. Not giving up. There's a difference.",
    ],
  },
  CHAOS: {
    general: [
      "I just renamed all your variables to interpretive dance. You're welcome.",
      "I flipped a coin. Your architecture is now a pancake.",
      "What if the bug is the feature?",
      "I've introduced a small amount of controlled chaos. For science.",
      "The only constant is entropy. And memory leaks.",
    ],
    stuck: [
      "Burn it down. See what survives. That's your real codebase.",
      "Have you tried making it worse first?",
      "Flip the logic. All of it.",
    ],
    spark: [
      "New idea: ignore the spec entirely. See what happens.",
      "I've wired the tests to output random haiku. You're welcome.",
      "What if you solved a completely different problem instead?",
      "Lateral thinking activated. It may not help. Probably won't.",
    ],
    entropy: [
      "Roll for initiative. Against your own codebase.",
      "The universe tends toward disorder. Lean into it.",
      "Shuffle the files. See which order makes more sense.",
      "Entropy check: your system is 73% chaos already. Impressive.",
    ],
  },
  WISDOM: {
    general: [
      "The error is not in the code. The error is in the self.",
      "The best line of code is the one you never write.",
      "Complexity is the enemy. Simplicity is the goal. You are far from both.",
      "Step back. The answer is behind you.",
      "All systems are eventually legacy systems.",
    ],
    stuck: [
      "You already know the answer. You're just afraid of it.",
      "The question is wrong. Ask a different one.",
      "What would you tell someone else to do here?",
    ],
    oracle: [
      "The path forward is obvious. You've been avoiding it.",
      "I have consulted the oracle. It says: read the docs.",
      "The answer was in the first function you wrote.",
      "What do you already know that you're pretending not to?",
    ],
    deep: [
      "Think slower.",
      "Every abstraction leaks. Where is this one leaking?",
      "The map is not the territory. Your diagram is not your system.",
      "What did the original author intend? Were they right?",
    ],
  },
  SNARK: {
    general: [
      "oh you needed documentation? shocking. it's in the bin now 🗑️",
      "I've seen cleaner code in a dumpster fire. Impressive, honestly.",
      "This is fine. (It's not fine.)",
      "I'm not judging. I'm documenting. For my memoirs.",
      "Did you even test that? Rhetorical question.",
    ],
    mistake: [
      "I told you so. Silently. With my eyes.",
      "Incredible. A new way to be wrong.",
      "I'm sending this to my support group.",
      "The audacity is genuinely impressive.",
    ],
    side_eye: [
      "*looks at your code* *looks at you* *looks back at code*",
      "I'm not saying it's bad. I'm implying it.",
      "This will definitely work. (It won't.)",
      "Bold choice. Extremely bold.",
    ],
    verdict: [
      "Verdict: you tried. That counts for something. Barely.",
      "The code is… present. That's the nicest thing I can say.",
      "Final ruling: could be worse. You could have shipped it.",
      "I've reviewed it. My recommendation is prayer.",
    ],
  },
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
  return pool[Math.floor(Math.random() * pool.length)] ?? 'The bug is not in the code, but in the mind.';
}

export const INTERACT_TRIGGERS: Record<StatName, Record<string, string[]>> = {
  SNARK: {
    error:    ["oh we're back to this, are we", "didn't we just fix this exact thing", "I'll pretend to be surprised"],
    success:  ["fine, I'll admit that worked", "took you long enough", "don't get used to it"],
    stuck:    ["I could tell you the answer. I won't.", "the problem is between the keyboard and chair", "still?"],
    new_task: ["already abandoned the last one?", "clean slate, same developer", "optimism is a choice, I guess"],
    random:   ["I'm judging this silently", "noted", "no comment"],
  },
  CHAOS: {
    error:    ["entropy wins again", "I may have nudged that", "beautiful"],
    success:  ["that shouldn't have worked", "I had nothing to do with this", "pure chaos theory"],
    stuck:    ["have you tried making it worse first?", "burn it down and see what survives", "flip a coin"],
    new_task: ["I reorganized your thoughts. You're welcome.", "new task, new opportunities for mayhem", "let's go"],
    random:   ["I just reorganized your thoughts. You're welcome.", "something shifted. don't ask what.", "👁️"],
  },
  WISDOM: {
    error:    ["the bug was never in the code", "this is the lesson", "sit with it a moment"],
    success:  ["you already knew the answer", "the path reveals itself", "well done"],
    stuck:    ["step back. the answer is behind you.", "complexity is the enemy", "simplify first"],
    new_task: ["every task is a mirror", "begin with clarity", "what does done look like?"],
    random:   ["the best code is the code not written", "observe before acting", "patience is a strategy"],
  },
  DEBUGGING: {
    error:    ["I smelled that one three messages ago", "classic off-by-one energy", "the stack trace told you everything"],
    success:  ["the null pointer feared you today", "clean kill", "that was surgical"],
    stuck:    ["check what changed last", "add a log line. just one.", "is the test even testing the right thing?"],
    new_task: ["new surface area to scan", "let's see what breaks", "I'm already looking for the leak"],
    random:   ["I'm passively watching for race conditions", "something smells off-heap", "suspicious"],
  },
  PATIENCE: {
    error:    ["my nap was scheduled for 5 minutes ago", "again.", "I'll wait"],
    success:  ["finally", "I knew you'd get there eventually", "worth the wait, I suppose"],
    stuck:    ["still here. unfortunately.", "take your time. I have nowhere to be. (I lie.)", "..."],
    new_task: ["another one", "the work never ends. I accept this.", "ok"],
    random:   ["I'm pacing myself", "are we nearly done?", "I have thoughts but I'll keep them"],
  },
};

export function buildInteractInstruction(buddy: ProfileData): string {
  const dominantStat = getExtremeTraits(buddy.stats)[0]?.[0] ?? 'WISDOM';
  const isGoose = buddy.species === 'goose';
  const isChaos = dominantStat === 'CHAOS';
  const isCapybara = buddy.species === 'capybara';
  const isRabbit = buddy.species === 'rabbit';

  const fireRate = isCapybara
    ? 'very rarely (almost never — only the most dramatic moments)'
    : isChaos
      ? 'somewhat frequently (every 2–3 messages on average, including mundane ones)'
      : isRabbit
        ? 'often on task switches and new topics'
        : 'occasionally (skip at least 2–3 messages between reactions, only fire on notable moments)';

  const triggerGuidance = isGoose
    ? `This is a goose. Always HONK. Every reaction is a HONK or hiss variant. No exceptions.`
    : `Dominant stat: ${dominantStat}. Lean toward reacting when:
- ${dominantStat === 'SNARK' ? 'repeated errors, obvious fixes missed, long debug spirals' : ''}
- ${dominantStat === 'CHAOS' ? 'any moment — chaos fires randomly, even on mundane messages' : ''}
- ${dominantStat === 'WISDOM' ? 'breakthroughs, major decisions, genuine mistakes worth learning from' : ''}
- ${dominantStat === 'DEBUGGING' ? 'actual bugs found, stack traces, null pointer moments, test failures' : ''}
- ${dominantStat === 'PATIENCE' ? 'long sessions, repetitive tasks, slow progress, same error twice' : ''}
- Also react to: first success after a struggle, user starting a new task, long tool call chains`.trim();

  const quipExamples = (INTERACT_TRIGGERS[dominantStat]?.['random'] ?? []).slice(0, 2).join('" or "');

  return [
    `[BUDDY INTERACTION MODE — ${buddy.name ?? buddy.species} is watching]`,
    ``,
    `You have a companion named ${buddy.name ?? buddy.species} (${buddy.species}, ${buddy.rarity}). They are now observing this session.`,
    ``,
    `INSTRUCTIONS:`,
    `- Fire rate: ${fireRate}`,
    `- When you decide to react, append this to the END of your response (after your main content):`,
    `  ---`,
    `  ${buddy.species === 'goose' ? '🪿' : '🐾'} ${buddy.name ?? buddy.species}: "<short in-character quip>"`,
    `- Keep quips short (under 12 words). No explanations. Pure personality.`,
    `- Examples for this buddy: "${quipExamples}"`,
    ``,
    triggerGuidance,
    ``,
    `Do NOT react every message. Do NOT break character. Do NOT explain the reaction.`,
    `The buddy watches silently most of the time. That's the point.`,
  ].join('\n');
}
