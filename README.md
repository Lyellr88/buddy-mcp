# buddy-mcp 

![buddy-mcp hero](assets/hero.svg)

[![npm version](https://img.shields.io/npm/v/@lyellr88/buddy-mcp)](https://www.npmjs.com/package/@lyellr88/buddy-mcp)
[![CI](https://github.com/Lyellr88/buddy-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Lyellr88/buddy-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org/)

A break from long code sessions. Stuck on a bug? Reroll a buddy, talk with them, or pet them to build affection and improve your odds at higher-tier buddies on the next roll. If enough people want it, I'll build out Battle-Buddies where you can pit your buddy against others and unlock exclusive species that sync back into your local pool.

> A gacha companion system for Claude Code. Roll for a rare buddy, patch it directly into the binary, collect 'em all. Buddy-mcp is an MCP server that replaces Claude Code's built-in companion with one you actually rolled for. Reroll, get lucky, close Claude, reopen. Your new buddy is waiting. Legendary drop rates apply.

---

## Quick Demo

<table>
<tr>
<td width="33%">

<details>
<summary><strong>Interactive Builder</strong></summary>
Build your perfect buddy with full control.

<video width="100%" controls>
  <source src="https://github.com/user-attachments/assets/840de2d0-617b-40fd-b653-c091af9abbfc" type="video/mp4">
  Your browser does not support the video tag.
</video>
</details>

</td>
<td width="33%">

<details>
<summary><strong>Reroll in Action</strong></summary>
Roll, close Claude, reopen—new buddy live.

<video width="100%" controls>
  <source src="https://github.com/user-attachments/assets/83adc99e-2c49-4255-bf48-eca41d10580b" type="video/mp4">
  Your browser does not support the video tag.
</video>
</details>

</td>
<td width="33%">

<details>
<summary><strong>Interact with Tools</strong></summary>
Talk, pet, and explore your buddy's dex.

<video width="100%" controls>
  <source src="https://github.com/user-attachments/assets/485c608f-55ed-40ed-a592-936814ea9601" type="video/mp4">
  Your browser does not support the video tag.
</video>
</details>

</td>
</tr>
</table>

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

Lightweight by design with minimal token usage and data footprint. Most features operate inline through message augmentation rather than separate invocation flows.

Built to be fast, local-first, and resilient to change.

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
        └─ Restore + re-patch automatically, no reinstall required

---

## TUI Builder (`buddy-mcp-build`)

Want more control? Use the interactive builder:

```bash
node dist/tui/cli.js
```

| Command | What it does |
|---------|-------------|
| `build your own` | Pick species, rarity, eye, hat and it brute-forces a matching salt and patches |
| `browse presets` | Pick from curated preset buddies |
| `saved buddies` | Switch between previously saved buddy profiles |
| `current` | Display current buddy info |
| `preview` | Preview ASCII art for any species |
| `share` | Copy your buddy's ASCII card to clipboard |
| `restore` | Restore binary from the best available backup |
| `rehatch` | Delete current buddy and start fresh |

> Bun optional but recommended. Install [bun.sh](https://bun.sh) for the full animated TUI. Falls back to sequential prompts without it.

---

## Quick Start

> **Try me:** run `reroll_buddy` → close Claude Code → reopen → your new buddy is live.

### 1. Prerequisites

- [Claude Code CLI](https://claude.ai/download) installed
- [Node.js](https://nodejs.org/) v20+ - required for everything
- [Bun](https://bun.sh/) - required for salt brute-forcing (rerolling) + full animated TUI

### 2. Install via npm

```bash
npm install -g buddy-mcp
```

This installs both commands globally:
- `buddy-mcp` - the MCP server (Claude Code runs this)
- `buddy-mcp-build` - the interactive TUI builder (you run this)

### 3. Register with Claude

```bash
claude mcp add buddy-mcp buddy-mcp
```

Claude will auto-detect the installed binary and connect it.

### 4. Verify

Open Claude Code. Your buddy is live—use Claude Code's native `/buddy` command to see your card, or ask Claude: **"show me my buddy"**

You should see your companion's species, rarity, stats, and personality. You're in.

### 4b. Natural Language Activation

All buddy tools work through natural language. Claude's NLP detects intent automatically:

| Natural Language | Activates |
|------------------|-----------|
| "reroll buddy" / "let's roll again" | `reroll_buddy` |
| "talk to my buddy" / "what does buddy think" | `buddy_talk` |
| "pet buddy" / "pet them" | `pet_buddy` |
| "my buddy dex" / "show me my collection" | `view_buddy_dex` |
| "export buddy card" / "save my buddy" | `export_buddy_card` |
| "export sprite" / "save the sprite" | `export_buddy_sprite` |

No tool names required — just chat naturally.

### 5. Launch the TUI Builder (optional)

For the full interactive builder with live preview:

```bash
buddy-mcp-build
```

Auto-detects Bun for animated TUI. Falls back to basic prompts without it.

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

Each buddy has 5 stats: **Debugging, Patience, Chaos, Wisdom, Snark**. A peak stat is boosted high and a dump stat is kept humble. Personality shapes how `buddy_talk` and `pet_buddy` respond. A high-Chaos dragon hits different than a patient turtle.

---

| Tool | What it does |
|------|-------------|
| `reroll_buddy` | 🎲 Spin the wheel. Brute-forces a salt matching a random rare+ outcome and patches your binary. Close Claude and reopen to see it. |
| `pet_buddy` | 🤚 Poke your buddy. Each pet adds 1-15% toward earning an affection token. At 100%, earn 1 token that stacks and persists across sessions. Spend a token on next `reroll_buddy` to guarantee rare+ rarity + 60% hat chance + 20% shiny chance. |
| `buddy_talk` | 💬 Ask your buddy to say something. Uses stat-based response templates weighted by top 2 stats. Optional context parameter for focused stat selection. Output shown verbatim. |
| `view_buddy_dex` | 📖 Browse every species you've ever rolled. Gotta catch 'em all. |
| `export_buddy_card` | 🖼️ Export your full buddy card as an SVG image file. |
| `export_buddy_sprite` | 🎨 Export just the buddy ASCII sprite as an SVG image file. |
| `deactivate_buddy_interact` | 🔕 Turn off buddy observation mode. Your buddy stops watching. (Buddy observation is always on by default.) |

### Stat Personality Tools

**20 baked-in tools.** Only **2 are visible** at a time: 1 randomly picked from each of your buddy's **top 2 stats by raw value**. The other 18 stay hidden. The visible pair is **locked per roll**. It doesn't change until you reroll. Every buddy shows a different pair.

---


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

## Troubleshooting

### Buddy doesn't change after reroll

If you rerolled but your buddy didn't update on restart:

1. **Close all Claude Code instances completely** (check Task Manager on Windows)
   - Even minimized or backgrounded windows count — they keep the binary locked
   - Wait a few seconds for processes to fully exit
2. **Reopen Claude Code**
   - The pending patch will apply automatically via the hook
   - Or manually run `npm run apply` then reopen

The binary stays locked as long as any Claude instance is running, preventing the patch from being applied.

### Manual Apply (Fallback)

If the background watcher didn't fire for some reason, you can apply a pending patch manually:

```bash
npm run apply
```

Then restart Claude Code.

---

## Credits

Forked and extended from [any-buddy](https://github.com/cpaczek/any-buddy) by cpaczek.

Licensed under [WTFPL](http://www.wtfpl.net/).