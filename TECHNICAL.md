# buddy-mcp — Technical Reference

> For the quick start, tool list, and gacha system see [README.md](README.md).

---

## Developer Insight

buddy-mcp isn't just a UI mod. It's a deterministic companion system layered on top of Claude Code's binary, with:

- Rerollable personalities and stat-bound behaviors  
- Persistent state and BuddyDex tracking  
- Locked tool sets per roll (no session drift)  
- A self-healing patch pipeline that detects, restores, and reapplies across updates  

Lightweight by design with minimal token usage and data footprint. Most features operate inline through message augmentation rather than separate invocation flows.

Built to be fast, local-first, and resilient to change.

## Patch Flow

buddy-mcp patches the Claude binary directly with zero manual intervention. Here's the complete automatic pipeline:

### Reroll (you run `reroll_buddy`)

```
reroll_buddy
    │
    ├─ Roll random traits (species, rarity, eye, hat, shiny chance)
    │
    ├─ Multi-worker salt search (up to 8 parallel Bun workers)
    │   └─ Each worker brute-forces salts using wyhash until traits match
    │
    ├─ Try to patch binary immediately
    │   ├─ ✅ Success → Patch applied, restart Claude to see new buddy
    │   └─ ⏳ EPERM (Claude is running)
    │       ├─ Save pending patch to disk
    │       ├─ Spawn background watcher (detached process)
    │       ├─ Watcher polls every 2s for Claude to close
    │       └─ The moment Claude closes → Watcher applies patch automatically
    │
    └─ Profile saved: species, rarity, stats, name, personality
```

**You only need to:** Close Claude when you're ready. Watcher handles the rest.

### Claude Startup (hook runs automatically)

```
Claude Code launches
    │
    └─ SessionStart hook fires (automatic)
        │
        ├─ ✅ Pending patch queued? → Apply it silently
        │
        ├─ ✅ Salt already in binary? → No-op (fast path)
        │
        └─ ⚠️ Salt mismatch (Claude was auto-updated)
            ├─ Try ORIGINAL_SALT (fresh binary from update) → re-patch + restore name/personality
            ├─ If not, restore from .buddy-mcp-bak or .anybuddy-bak → re-patch
            └─ If all fail → "Run buddy-mcp-build restore, or reinstall Claude Code"
```

**You don't need to do anything.** The hook runs silently and your buddy appears on next launch.

---

## State Files

buddy-mcp stores everything in your home directory:

### `~/.buddy-mcp.json`
Your buddy profiles and active session pointer.

| Field | Description |
|-------|-------------|
| `activeProfile` | Salt key of the currently active buddy |
| `salt` | Active salt (legacy top-level field) |
| `profiles` | Dict of all saved buddy profiles keyed by salt |
| `profiles[salt].species` | Species name (duck, dragon, turtle, etc.) |
| `profiles[salt].rarity` | Rarity tier (common → legendary) |
| `profiles[salt].stats` | Stat object: DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK |
| `profiles[salt].name` | Buddy name (set by you or auto-generated) |
| `profiles[salt].personality` | Personality description used by buddy_talk |
| `profiles[salt].shiny` | Whether this buddy is shiny |
| `profiles[salt].createdAt` | ISO timestamp of when this buddy was rolled |

### `~/.buddy_mcp_gacha.json`
Persistent gacha engine state — BuddyDex, tokens, tool locks, and binary tracking.

| Field | Description |
|-------|-------------|
| `discoveredSpecies` | All species ever rolled — your BuddyDex |
| `shinyCount` | Total shiny buddies ever rolled |
| `visibleStatTools` | Locked stat tool names for current buddy (set once at reroll, stable until next roll) |
| `interactMode` | Whether buddy companion mode is active (default: `true`) |
| `sessionAffectionTokens` | Earned tokens from petting — each token guarantees rare+ on next reroll |
| `sessionAffectionAccumulator` | Current petting progress toward next token (0–100) |
| `binaryMtime` | Last known mtime of Claude binary — used to detect Claude updates |
| `manifestedTools` | User-created dynamic tool definitions (persisted across sessions) |

### `~/.buddy_mcp_pending.json`
Queued patch written when Claude is running during a reroll. Consumed by the watcher or startup hook.

| Field | Description |
|-------|-------------|
| `salt` | New salt to write into the binary |
| `currentSalt` | Salt currently in the binary (patch from → to) |
| `binaryPath` | Absolute path to the Claude binary |
| `profile` | Full buddy profile to activate after patching |
| `rolledAt` | ISO timestamp of the reroll |

---

## Manual Apply (Very Rare Edge Case)

**Only if** you rerolled 30+ minutes ago and the watcher timed out without applying:

```bash
npm run apply
```

Then restart Claude Code.

(This fallback is automatic in 99% of cases — only needed if your system kept Claude open for an unusually long time.)
