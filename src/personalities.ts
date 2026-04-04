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
