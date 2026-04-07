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
            ├─ Try original-salt fallback (usually succeeds)
            ├─ If not, try restore from .buddy-mcp-bak
            ├─ If not, try .anybuddy-bak (legacy fallback)
            └─ Companion loads with correct stats/name even after update
```

**You don't need to do anything.** The hook runs silently and your buddy appears on next launch.

---

## State Files

buddy-mcp stores everything in your home directory:

| File | Purpose |
|------|---------|
| `~/.buddy-mcp.json` | Your buddy profiles (species, rarity, stats, name, salt) |
| `~/.buddy_mcp_gacha.json` | Gacha extras: shiny count, BuddyDex, manifested tools |
| `~/.buddy_mcp_pending.json` | Queued patch waiting for Claude to close |

---

## Manual Apply (Very Rare Edge Case)

**Only if** you rerolled 30+ minutes ago and the watcher timed out without applying:

```bash
npm run apply
```

Then restart Claude Code.

(This fallback is automatic in 99% of cases — only needed if your system kept Claude open for an unusually long time.)
