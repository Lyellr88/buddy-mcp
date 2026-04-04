## Version History

### v0.1.0 — Hardcoded Prototype
- Initial MCP server with a single fixed buddy character ("Flumox")
- Hardcoded species, stats, ASCII art, and bio — no generation logic
- Basic `get_buddy_card` and `buddy_speak` tools
- Served as proof-of-concept for the MCP transport pattern

### v0.2.0 — Universal Buddy MCP
- Generalized `Buddy` interface to accept any species, rarity, bio, stats, ASCII
- Added `initialize_buddy` tool — user/LLM can initialize any buddy identity at runtime
- Added `manifest_buddy_tool` — LLM-driven tool creation based on personality + stats
- `get_buddy_card` updated with dynamic padding and box-drawing for any name/bio length
- Dynamic tools stored in `Map<string, { tool, handler, _def }>` and served via `ListToolsRequestSchema`

### v0.3.0 — Auto-Sync & Deterministic Generation
- Reads `userId` from `~/.claude.json` on startup — no manual initialization required
- Implemented **FNV-1a (32-bit)** hash + **Mulberry32** PRNG for deterministic generation
- Official salt: `friend-2026-401` (community-discovered from Claude Code source map)
- 18 species templates
- Rarity system: Common 60% / Uncommon 25% / Rare 10% / Epic 4% / Legendary 1%
- Stat generation: peak/dump/average spread based on rarity floor

### v0.4.0 — Persistence Layer
- Added `loadState()` and `saveState()` functions
- Persists: `lastSaid`, `manifestedTools` (survive restarts)

### v0.5.0 — Hierarchical Persistence + Personality Engine
- **Two-tier persistence**: Global + Local scope, Local wins on collision
- `CORE_TOOL_NAMES` set — prevents dynamic tools from overwriting core handlers
- **`autoManifestTools()`**: Creates 3 tools based on top extreme stats
- Added `vibe_check` mystery tool with 5% cosmic event trigger

### v0.6.0 — Gacha & Dex System
- Added `rotationIndex` to generation seed — making rerolls discoverable
- **1% Shiny chance** per generation
- New tools: `reroll_buddy`, `view_buddy_dex`, `export_buddy_card`, `export_buddy_sprite`
- 5-day lock expiry check
- BuddyDex with ASCII grid

### v0.7.0 — Legendary Edition
- Added Goose, Penguin, Snail, Cactus, Mushroom, Blob, Jellyfish
- Hat system for Rare/Epic/Legendary
- Goose personality: 30% HONK/hiss override

### v0.8.0 — Audit Fix Sprint
- **Fix 1**: `reroll_buddy` enforces 5-day lock (was bypassable)
- **Fix 2**: Lock expiry `saveState` no-op — moved after identity sync
- **Fix 3**: Auto-tools accumulate across rerolls — added `AUTO_TOOL_NAMES` cleanup
- **Fix 4**: Hat system wired up — assigned and rendered on card

### v0.10.0 — Binary Patching Integration (Pivot)
- Merged `any-buddy` binary patching engine
- Salt brute-forcing via multi-worker Bun wyhash / FNV-1a fallback
- 18 species with 3-frame animated sprites in `src/sprites/data.ts`
- `src/mcp/index.ts` replaces monolithic `src/index.ts`
- New tools: `restore_buddy`
- State split: `~/.buddy_mcp_gacha.json` + `~/.claude-code-any-buddy.json`
- Hash consistency fix: `findSalt` and `roll()` use same hash function per platform

### v0.11.0 — Watcher + Auto-Apply
- Detached background watcher spawns when binary is locked (EPERM)
- Polls every 2s until Claude closes, auto-applies patch
- Dynamic instructions: shows watcher path if available, manual `npm run apply` if not
- Relaunch after patch: opens new terminal with `claude` in saved working directory

### v0.12.0 — Rebrand + Test Coverage
- Rebrand: `any-buddy` → `buddy-mcp` (GitHub, config files, backup extensions)
- Comprehensive test coverage: 16 test files, 166 tests
- New tests: `tests/mcp/persistence.test.ts` (19), `tests/mcp/auto.test.ts` (11), `tests/mcp/tools/core.test.ts` (30)
- Personalities module fully tested (`tests/personalities.test.ts`)

### v0.13.0 — Lock Removal + Export Tools
- Removed: `lock_buddy` tool + 5-day lock expiry system (made redundant after analysis)
- Added: `export_buddy_card` — SVG export of full buddy card (dark theme, monospace text)
- Added: `export_buddy_sprite` — SVG export of ASCII sprite only
- Cleaned up lock references from state, persistence, tests, and docs
- Test suite remains passing

### v0.14.0 — Dead Weight Removal + Pet Affection System + Buddy Interact + Stat Personality Tools

#### Dead Weight Removal
- Removed: `initialize_buddy`, `restore_buddy`, `manifest_buddy_tool` — legacy tools with no real use cases
- `registerManifestedTool()` kept for backwards compat (loads old manifested tools from gacha state on startup)
- `CORE_TOOL_NAMES` shrinks 11 → 8 after dead weight removal, then grows to 29 after all stat tools added

#### Pet Affection System
- `petCount` field in `GachaState` — persists across restarts, resets to 0 on successful reroll
- `PET_MILESTONES` + `getAffectionWeights(petCount)` in `constants.ts` — drives both weight logic and footer labels
- Milestone rarity bonuses: 25+ pets (uncommon floor), 50+ pets (rare floor), 75+ pets (epic/legendary weighted)
- `rollRandomDesired` → `rollRandomDesiredWithAffection(petCount)` — applies threshold weights at reroll time
- Every `pet_buddy` response shows affection count + next milestone progress footer

#### Buddy Interact System
- Added: `activate_buddy_interact` / `deactivate_buddy_interact`
- Standing instruction pattern — activation returns a prompt Claude reads and follows for the session
- `INTERACT_TRIGGERS` in `personalities.ts` — 5 stats × 5 event pools (error, success, stuck, new_task, random)
- `buildInteractInstruction()` — assembles full standing instruction with fire rate, format, and trait triggers
- Species overrides: goose always HONKs, capybara fires very rarely, rabbit fires often on task switches
- `interactMode` persisted in gacha state — survives server restarts
- New file: `src/mcp/tools/interact.ts`

#### Stat Personality Tools (4 per stat, 2 visible)
- **20 baked-in tools** — 4 per stat, registered at startup via `src/mcp/tools/stats.ts` side-effect import
- **Visibility**: top 2 stats by raw value each contribute 1 randomly-picked tool → 2 visible per buddy at runtime (18 always hidden)
- `vibe_check` moved from core tools into PATIENCE stat tools — cosmic event logic (5% chance) preserved
- Replaced `autoManifestTools()` dynamic 3-tool subset with full 20-tool baked-in set; `autoManifestTools()` gutted to no-op
- `STAT_TOOL_RESPONSES` in `personalities.ts` — quip pools per stat with 11 context keys (general, stuck, hunt, dive, vibe, still, spark, entropy, oracle, deep, side_eye, verdict, mistake)
- `STAT_TOOLS_MAP` in `stats.ts` — maps each stat to its 4 tools; drives `visibleStatTools()` in `index.ts`
- All 20 names added to `CORE_TOOL_NAMES` (→ 29 total) — protected from template overwrite
- All tools accept optional `target` string; response always prefixed with buddy name
- `visibleStatTools()` sorts stats by raw value descending, takes top 2, picks 1 random tool from each 4-tool pool — **result cached before filter** (fixes re-randomization bug where tools leaked through)
- Stat → tool groups:
  - DEBUGGING: `deep_trace`, `trace_nightmare`, `null_hunt`, `stack_dive`
  - PATIENCE: `patience_check`, `wait_wisdom`, `vibe_check`, `still_point`
  - CHAOS: `chaos_audit`, `chaos_roulette`, `chaos_spark`, `entropy_roll`
  - WISDOM: `zen_consult`, `zen_mirror`, `oracle_seek`, `deep_thought`
  - SNARK: `snark_roast`, `snark_savage`, `side_eye`, `snark_verdict`

#### Tests
- 192 → 226 tests passing (18 test files)
- New file: `tests/mcp/tools/stats.test.ts` — 40 tests (registration, no-buddy guard, handler responses, vibe_check cosmic logic, STAT_TOOLS_MAP 4-per-stat coverage, top-stat raw-sort visibility logic)
- New file: `tests/mcp/tools/interact.test.ts` — 20 tests
- Updated: `tests/mcp/tools/core.test.ts` — vibe_check suite removed (moved to stats), affection tests added, reroll early-exit + affection weights coverage
- Updated: `tests/mcp/auto.test.ts` — rewrote to document no-op behavior
- Updated: `tests/mcp/persistence.test.ts` — CORE_TOOL_NAMES count 11 → 29, full expected array with all stat tool names


### v0.15.0 — Stat Locking, Salt Detection & Polish

#### Stat Tool Visibility — Locked Per Roll
- isibleStatTools added to GachaState as a persisted string[] field
- pickVisibleStatTools() exported from persistence.ts — picks 1 tool from each top-2-stat pool once at reroll time, writes to state; never re-randomizes mid-session
- isibleStatTools() in index.ts simplified to read cached array (was re-randomizing on every ListTools request, causing tool list to drift)
- On startup: if isibleStatTools is empty (first launch or old state file), auto-picks and persists
- pickVisibleStatTools() called at both reroll save points (direct patch + pending patch paths)

#### Binary Patch Resilience — Unknown Salt Detection
- Added detectActiveSalt(binaryPath) to salt-ops.ts — walks the binary to find any embedded 15-char [a-zA-Z0-9_-] string appearing minCount+ times; returns the active salt even if it was written by another tool
- Reroll fallback chain now: currentSalt → ORIGINAL_SALT → detectActiveSalt() → check if target already present → error
- Fixes first-run failure for users who had a previous patcher's salt in their binary with no ~/.buddy-mcp.json

#### Buddy Interact — Fire Rate Normalized
- Removed species/stat-based fire rate overrides (capybara = almost never, chaos = frequent, rabbit = often)
- All buddies now fire every 4–8 messages — Claude picks a random interval in that range each session
- Dominant stat still shapes *which moments* trigger a reaction within the window (PATIENCE leans toward long sessions, CHAOS fires randomly, etc.)
- Goose unchanged — still always HONKs

#### Card Alignment Fixes (Terminal + SVG)
- All box lines now exactly 40 chars wide (verified via Node.js char-count)
- Terminal card (core.ts): hat padEnd(34)→31, sprite/name padEnd(36)→34, species padStart(14)→16
- SVG card (xport.ts): hat emoji 🎩 replaced with Hat:  text prefix (emoji pixel width unreliable in SVG), same padEnd fixes; species padStart(16)→15 (★★ renders slightly wider in SVG)

#### Tool Display Descriptions Strengthened
- get_buddy_card, pet_buddy, uddy_speak, iew_buddy_dex descriptions updated: "Always show the full result to the user exactly as returned."

#### Reroll Message Cleanup
- Removed 💡 Stat tools may have changed — open /mcp hint from both reroll success messages (stat tools now locked per roll, hint was obsolete)
