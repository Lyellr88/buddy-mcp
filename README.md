# buddy-mcp

A break from long code sessions. Stuck on a bug? Reroll a buddy, talk with them, or pet them to build affection and improve your odds at higher-tier buddies on the next roll. If enough people want it, I'll build out Battle-Buddies where you can pit your buddy against others and unlock exclusive species that sync back into your local pool.

> A gacha companion system for Claude Code. Roll for a rare buddy, patch it directly into the binary, collect 'em all. Buddy-mcp is an MCP server that replaces Claude Code's built-in companion with one you actually rolled for. Reroll, get lucky, close Claude, reopen. Your new buddy is waiting. Legendary drop rates apply.

---

## How It Works

Claude Code's companion is generated from a salt string baked into the binary. buddy-mcp:

1. Rolls random desired traits (species, rarity, eye, hat)
2. Brute-forces a salt that hashes to those traits (multi-worker, runs fast)
3. Patches the binary in place, or queues the patch for when you close Claude
4. Saves your full buddy profile with stats, name, and personality
5. Tracks every species you've ever rolled in your BuddyDex

No companion server. No cloud. Just you, your binary, and the gacha gods.

---

## Developer Insight

buddy-mcp isn’t just a UI mod. It’s a deterministic companion system layered on top of Claude Code’s binary, with:

- Rerollable personalities and stat-bound behaviors  
- Persistent state and BuddyDex tracking  
- Locked tool sets per roll (no session drift)  
- A self-healing patch pipeline that detects, restores, and reapplies across updates  

Built to be fast, local-first, and resilient to change.

---

## TUI Builder (`buddy-mcp-build`)

Want more control? Use the interactive builder:

```bash
node dist/tui/cli.js
```

| Command | What it does |
|---------|-------------|
| `build your own` | Pick species, rarity, eye, hat — brute-forces a matching salt and patches |
| `browse presets` | Pick from curated preset buddies |
| `saved buddies` | Switch between previously saved buddy profiles |
| `current` | Display current buddy info |
| `preview` | Preview ASCII art for any species |
| `share` | Copy your buddy's ASCII card to clipboard |
| `restore` | Restore binary from the best available backup |
| `rehatch` | Delete current buddy and start fresh |

> Bun optional but recommended — install [bun.sh](https://bun.sh) for the full animated TUI. Falls back to sequential prompts without it.

---

## Quick Start

> **Try me:** run `reroll_buddy` → close Claude Code → reopen → your new buddy is live.

### 1. Prerequisites

- [Claude Code CLI](https://claude.ai/download) installed
- [Node.js](https://nodejs.org/) v20+ — required for everything
- [Bun](https://bun.sh/) — required for salt brute-forcing (rerolling) + full animated TUI

> **Note:** npm packaging is coming soon. For now, clone and build manually as below.

### 2. Clone & Build

```bash
git clone https://github.com/Lyellr88/buddy-mcp
cd buddy-mcp
npm install
npm run build
```

### 3. Register with Claude

```bash
claude mcp add buddy-mcp node /absolute/path/to/buddy-mcp/dist/mcp/index.js
```

Replace `/absolute/path/to/buddy-mcp` with the actual path on your machine.

### 4. Verify

Open Claude Code and ask: **"show me my buddy card"**

You should see a card with your current companion's species, rarity, and stats. You're in.

### 5. Launch the TUI Builder (optional)

For the full interactive builder with live preview:

```bash
bun dist/tui/cli.js
```

Or via npm script (auto-detects Bun, falls back to basic prompts if not installed):

```bash
npm run builder
```

---

## The Gacha System

Every reroll is a random pull from the pool. Rarity affects stat floors. Legendaries hit different.

| Rarity | Drop Rate | Stat Floor |
|-----------|-----------|------------|
| Common | 60% | 5 |
| Uncommon | 25% | 15 |
| Rare | 10% | 25 |
| Epic | 4% | 35 |
| Legendary | 1% | 50 |

**18 species:** duck · goose · blob · cat · dragon · octopus · owl · penguin · turtle · snail · ghost · axolotl · capybara · cactus · robot · rabbit · mushroom · chonk

Each buddy has 5 stats: **Debugging, Patience, Chaos, Wisdom, Snark**. A peak stat is boosted high and a dump stat is kept humble. Personality shapes how `buddy_speak` and `pet_buddy` respond. A high-Chaos dragon hits different than a patient turtle.

---

| Tool | What it does |
|------|-------------|
| `reroll_buddy` | 🎲 Spin the wheel. Brute-forces a salt matching a random rare+ outcome and patches your binary. Close Claude and reopen to see it. |
| `get_buddy_card` | 🪪 Display your current buddy card. Species, rarity, stats, name, ASCII art, everything. |
| `pet_buddy` | 🤚 Poke your buddy. Builds affection. Every pet counts toward better reroll odds, with 25/50/75 pet milestones unlocking rarity bonuses. |
| `buddy_speak` | 💬 Ask your buddy to say something. Personality-aligned, stat-influenced. Output shown verbatim. |
| `view_buddy_dex` | 📖 Browse every species you've ever rolled. Gotta catch 'em all. |
| `export_buddy_card` | 🖼️ Export your full buddy card as an SVG image file. |
| `export_buddy_sprite` | 🎨 Export just the buddy ASCII sprite as an SVG image file. |
| `activate_buddy_interact` | 👁️ Start buddy observation mode. Your buddy will react to session events based on personality. |
| `deactivate_buddy_interact` | 🔕 Stop observation mode. Your buddy goes quiet. |

### Stat Personality Tools

**20 baked-in tools.** Only **2 are visible** at a time: 1 randomly picked from each of your buddy's **top 2 stats by raw value**. The other 18 stay hidden. The visible pair is **locked per roll**. It doesn't change until you reroll. Every buddy shows a different pair.

| Tool | Stat | What it does |
|------|------|-------------|
| `deep_trace` | Debugging | Focused bug hunting. Curt, clinical, slightly haunted. |
| `trace_nightmare` | Debugging | When the trace stops making sense. Surreal debugging perspective |
| `null_hunt` | Debugging | Hunt for null refs. Clinical. Relentless |
| `stack_dive` | Debugging | Dive into the callstack. The bug is always deeper than you think |
| `patience_check` | Patience | Check if your buddy is still willing to help |
| `wait_wisdom` | Patience | Slow down. Receive patience-encoded insight |
| `vibe_check` | Patience | The mystery action. Your buddy reads the vibe. 5% cosmic event |
| `still_point` | Patience | Stop. Be still. Let the answer come to you |
| `chaos_audit` | Chaos | Unpredictable. Might help. Might not. Science |
| `chaos_roulette` | Chaos | Spin the chaos wheel. Receive a wildly lateral suggestion |
| `chaos_spark` | Chaos | Ignite a lateral idea. May or may not be relevant |
| `entropy_roll` | Chaos | Roll against entropy. The universe responds |
| `zen_consult` | Wisdom | Philosophical insight into your architecture |
| `zen_mirror` | Wisdom | Turn the question inward. A reflection, not an answer |
| `oracle_seek` | Wisdom | Seek the oracle. The answer is already inside you |
| `deep_thought` | Wisdom | Think slower. The answer requires depth |
| `snark_roast` | Snark | Light sarcastic critique of your current work |
| `snark_savage` | Snark | No mercy. Full roast. For when you need the unfiltered truth |
| `side_eye` | Snark | Your buddy looks at your code. Then at you. Then back at the code |
| `snark_verdict` | Snark | Final ruling from the bench. The buddy has reviewed and judged |

---

## Patch Flow

buddy-mcp patches the Claude binary directly. Here's what happens when you hit `reroll_buddy`:

```
reroll_buddy
    │
    ├─ Roll random traits (species, rarity, eye, hat, shiny chance)
    │
    ├─ Multi-worker salt search (up to 8 parallel Bun workers)
    │   └─ Each worker brute-forces salts using wyhash until traits match
    │
    ├─ Try to patch binary immediately
    │   ├─ Success → "Close Claude and reopen"
    │   └─ EPERM (Claude is running) → Save pending patch + start background watcher
    │       └─ Watcher polls every 2s, applies patch the moment Claude closes
    │
    └─ Profile saved: species, rarity, stats, name, personality

On next session start (hook fires):
    │
    ├─ Salt still valid → no-op (fast path)
    │
    ├─ Pending patch found → apply it
    │
    └─ Salt mismatch (Claude auto-updated)
        ├─ Try .buddy-mcp-bak (only if it contains original salt)
        ├─ Try .anybuddy-bak (fallback for prior patcher users)
        └─ Restore + re-patch automatically — no reinstall required
```


---

## State Files

buddy-mcp stores everything in your home directory:

| File | Purpose |
|------|---------|
| `~/.buddy-mcp.json` | Your buddy profiles (species, rarity, stats, name, salt) |
| `~/.buddy_mcp_gacha.json` | Gacha extras: shiny count, BuddyDex, manifested tools |
| `~/.buddy_mcp_pending.json` | Queued patch waiting for Claude to close |

---

## Manual Apply (Fallback)

If the background watcher didn't fire for some reason, you can apply a pending patch manually:

```bash
npm run apply
```

Then restart Claude Code.

---

## Personality

Each buddy gets a name and a personality derived from their species. Personality shapes how `buddy_speak`, `pet_buddy`, and stat tools respond. A high-Chaos dragon hits different than a patient turtle.

---

## Credits

Forked and extended from [any-buddy](https://github.com/cpaczek/any-buddy) by cpaczek.

Licensed under [WTFPL](http://www.wtfpl.net/).