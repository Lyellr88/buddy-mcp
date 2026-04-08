# Buddy-Log

## v0.1.0 — Hardcoded Prototype
- Initial MCP server with a single fixed buddy character ("Flumox")
- Hardcoded species, stats, ASCII art, and bio — no generation logic
- Basic `get_buddy_card` and `buddy_talk` tools
- Served as proof-of-concept for the MCP transport pattern

## v0.2.0 — Universal Buddy MCP
- Generalized `Buddy` interface to accept any species, rarity, bio, stats, ASCII
- Added `initialize_buddy` tool — user/LLM can initialize any buddy identity at runtime
- Added `manifest_buddy_tool` — LLM-driven tool creation based on personality + stats
- `get_buddy_card` updated with dynamic padding and box-drawing for any name/bio length
- Dynamic tools stored in `Map<string, { tool, handler, _def }>` and served via `ListToolsRequestSchema`

## v0.3.0 — Auto-Sync & Deterministic Generation
- Reads `userId` from `~/.claude.json` on startup — no manual initialization required
- Implemented **FNV-1a (32-bit)** hash + **Mulberry32** PRNG for deterministic generation
- Official salt: `friend-2026-401` (community-discovered from Claude Code source map)
- 18 species templates
- Rarity system: Common 60% / Uncommon 25% / Rare 10% / Epic 4% / Legendary 1%
- Stat generation: peak/dump/average spread based on rarity floor

## v0.4.0 — Persistence Layer
- Added `loadState()` and `saveState()` functions
- Persists: `lastSaid`, `manifestedTools` (survive restarts)

## v0.5.0 — Hierarchical Persistence + Personality Engine
- **Two-tier persistence**: Global + Local scope, Local wins on collision
- `CORE_TOOL_NAMES` set — prevents dynamic tools from overwriting core handlers
- **`autoManifestTools()`**: Creates 3 tools based on top extreme stats
- Added `vibe_check` mystery tool with 5% cosmic event trigger

## v0.6.0 — Gacha & Dex System
- Added `rotationIndex` to generation seed — making rerolls discoverable
- **1% Shiny chance** per generation
- New tools: `reroll_buddy`, `view_buddy_dex`, `export_buddy_card`, `export_buddy_sprite`
- 5-day lock expiry check
- BuddyDex with ASCII grid

## v0.7.0 — Legendary Edition
- Added Goose, Penguin, Snail, Cactus, Mushroom, Blob, Jellyfish
- Hat system for Rare/Epic/Legendary
- Goose personality: 30% HONK/hiss override

## v0.8.0 — Audit Fix Sprint
- **Fix 1**: `reroll_buddy` enforces 5-day lock (was bypassable)
- **Fix 2**: Lock expiry `saveState` no-op — moved after identity sync
- **Fix 3**: Auto-tools accumulate across rerolls — added `AUTO_TOOL_NAMES` cleanup
- **Fix 4**: Hat system wired up — assigned and rendered on card

## v0.10.0 — Binary Patching Integration (Pivot)
- Merged `any-buddy` binary patching engine
- Salt brute-forcing via multi-worker Bun wyhash / FNV-1a fallback
- 18 species with 3-frame animated sprites in `src/sprites/data.ts`
- `src/mcp/index.ts` replaces monolithic `src/index.ts`
- New tools: `restore_buddy`
- State split: `~/.buddy_mcp_gacha.json` + `~/.claude-code-any-buddy.json`
- Hash consistency fix: `findSalt` and `roll()` use same hash function per platform

## v0.11.0 — Watcher + Auto-Apply
- Detached background watcher spawns when binary is locked (EPERM)
- Polls every 2s until Claude closes, auto-applies patch
- Dynamic instructions: shows watcher path if available, manual `npm run apply` if not
- Relaunch after patch: opens new terminal with `claude` in saved working directory

## v0.12.0 — Rebrand + Test Coverage
- Rebrand: `any-buddy` → `buddy-mcp` (GitHub, config files, backup extensions)
- Comprehensive test coverage: 16 test files, 166 tests
- New tests: `tests/mcp/persistence.test.ts` (19), `tests/mcp/auto.test.ts` (11), `tests/mcp/tools/core.test.ts` (30)
- Personalities module fully tested (`tests/personalities.test.ts`)

## v0.13.0 — Lock Removal + Export Tools
- Removed: `lock_buddy` tool + 5-day lock expiry system (made redundant after analysis)
- Added: `export_buddy_card` — SVG export of full buddy card (dark theme, monospace text)
- Added: `export_buddy_sprite` — SVG export of ASCII sprite only
- Cleaned up lock references from state, persistence, tests, and docs
- Test suite remains passing

## v0.14.0 — Dead Weight Removal + Pet Affection System + Buddy Interact + Stat Personality Tools

### Dead Weight Removal
- Removed: `initialize_buddy`, `restore_buddy`, `manifest_buddy_tool` — legacy tools with no real use cases
- `registerManifestedTool()` kept for backwards compat (loads old manifested tools from gacha state on startup)
- `CORE_TOOL_NAMES` shrinks 11 → 8 after dead weight removal, then grows to 29 after all stat tools added

### Pet Affection System
- `petCount` field in `GachaState` — persists across restarts, resets to 0 on successful reroll
- `PET_MILESTONES` + `getAffectionWeights(petCount)` in `constants.ts` — drives both weight logic and footer labels
- Milestone rarity bonuses: 25+ pets (uncommon floor), 50+ pets (rare floor), 75+ pets (epic/legendary weighted)
- `rollRandomDesired` → `rollRandomDesiredWithAffection(petCount)` — applies threshold weights at reroll time
- Every `pet_buddy` response shows affection count + next milestone progress footer

### Buddy Interact System
- Added: `activate_buddy_interact` / `deactivate_buddy_interact`
- Standing instruction pattern — activation returns a prompt Claude reads and follows for the session
- `INTERACT_TRIGGERS` in `personalities.ts` — 5 stats × 5 event pools (error, success, stuck, new_task, random)
- `buildInteractInstruction()` — assembles full standing instruction with fire rate, format, and trait triggers
- Species overrides: goose always HONKs, capybara fires very rarely, rabbit fires often on task switches
- `interactMode` persisted in gacha state — survives server restarts
- New file: `src/mcp/tools/interact.ts`

### Stat Personality Tools (4 per stat, 2 visible)
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

### Tests
- 192 → 226 tests passing (18 test files)
- New file: `tests/mcp/tools/stats.test.ts` — 40 tests (registration, no-buddy guard, handler responses, vibe_check cosmic logic, STAT_TOOLS_MAP 4-per-stat coverage, top-stat raw-sort visibility logic)
- New file: `tests/mcp/tools/interact.test.ts` — 20 tests
- Updated: `tests/mcp/tools/core.test.ts` — vibe_check suite removed (moved to stats), affection tests added, reroll early-exit + affection weights coverage
- Updated: `tests/mcp/auto.test.ts` — rewrote to document no-op behavior
- Updated: `tests/mcp/persistence.test.ts` — CORE_TOOL_NAMES count 11 → 29, full expected array with all stat tool names

## v0.15.0 — Stat Locking, Salt Detection & Polish

### Stat Tool Visibility — Locked Per Roll
- visibleStatTools added to GachaState as a persisted string[] field
- pickVisibleStatTools() exported from persistence.ts — picks 1 tool from each top-2-stat pool once at reroll time, writes to state; never re-randomizes mid-session
- visibleStatTools() in index.ts simplified to read cached array (was re-randomizing on every ListTools request, causing tool list to drift)
- On startup: if visibleStatTools is empty (first launch or old state file), auto-picks and persists
- pickVisibleStatTools() called at both reroll save points (direct patch + pending patch paths)

### Binary Patch Resilience — Unknown Salt Detection
- Added detectActiveSalt(binaryPath) to salt-ops.ts — walks the binary to find any embedded 15-char [a-zA-Z0-9_-] string appearing minCount+ times; returns the active salt even if it was written by another tool
- Reroll fallback chain now: currentSalt → ORIGINAL_SALT → detectActiveSalt() → check if target already present → error
- Fixes first-run failure for users who had a previous patcher's salt in their binary with no ~/.buddy-mcp.json

### Buddy Interact — Fire Rate Normalized
- Removed species/stat-based fire rate overrides (capybara = almost never, chaos = frequent, rabbit = often)
- All buddies now fire every 4–8 messages — Claude picks a random interval in that range each session
- Dominant stat still shapes *which moments* trigger a reaction within the window (PATIENCE leans toward long sessions, CHAOS fires randomly, etc.)
- Goose unchanged — still always HONKs

### Card Alignment Fixes (Terminal + SVG)
- All box lines now exactly 40 chars wide (verified via Node.js char-count)
- Terminal card (core.ts): hat padEnd(34)→31, sprite/name padEnd(36)→34, species padStart(14)→16
- SVG card (export.ts): hat emoji 🎩 replaced with Hat:  text prefix (emoji pixel width unreliable in SVG), same padEnd fixes; species padStart(16)→15 (★★ renders slightly wider in SVG)

### Tool Display Descriptions Strengthened
- get_buddy_card, pet_buddy, buddy_speak, view_buddy_dex descriptions updated: "Always show the full result to the user exactly as returned."

### Reroll Message Cleanup
- Removed 💡 Stat tools may have changed — open /mcp hint from both reroll success messages (stat tools now locked per roll, hint was obsolete)

## v0.16.0 — TUI Builder + Smart Backup Chain

### TUI Builder (`buddy-mcp-build`)
- Integrated `src/tui/` from any-buddy as a standalone CLI power-user tool
- New binary: `buddy-mcp-build` — run from any shell, no global install required (`node dist/tui/cli.js`)
- Subcommand dispatch: `restore`, `rehatch`, `current`, `preview`, `share` → interactive start screen default
- Full command set included: `browse presets`, `build your own`, `saved buddies`, `share` (clipboard ASCII), `current`, `preview`
- All `any-buddy` string references replaced with `buddy-mcp`/`buddy-mcp-build` across 8 TUI files
- Hook calls fixed to resolve MCP path (`../../mcp/index.js`) — hook points to MCP server, not TUI
- `restoreProfileIdentity` added to hook re-apply path (renames + sets personality after patch)
- New deps: `@inquirer/prompts` (Node fallback prompts), `@opentui/core` (optional, Bun-only live preview)
- TUI ↔ MCP bridge: `~/.buddy-mcp.json` — zero IPC, zero coupling

### Smart Backup Chain — Poison Prevention
- `patchBinary()` now only writes `.buddy-mcp-bak` when the binary contains `ORIGINAL_SALT` — prevents backing up a post-update (poisoned) binary
- `findRestorableBackup()` — new export in `patch.ts`; tries `.buddy-mcp-bak` then `.anybuddy-bak`, validates `ORIGINAL_SALT` presence before accepting either
- `applyPendingPatch()` restore path: after both `verifySalt` checks fail, auto-calls `findRestorableBackup()` → `restoreBinary()` → `patchBinary()` without user intervention
- Result: hook fires after Claude auto-update → restores best valid backup → re-patches → user never sees a failure

### Tests
- 330 → 343 tests passing (29 test files)
- New file: `tests/patcher/patch.test.ts` — 13 tests covering `patchBinary`, `findRestorableBackup`, `restoreBinary`
  - Salt swap correctness (3 occurrences replaced)
  - Salt length mismatch throws
  - Salt not found throws
  - Backup written only when `ORIGINAL_SALT` present
  - Backup NOT written when binary has no `ORIGINAL_SALT` (poison prevention)
  - `findRestorableBackup` returns null with no backups
  - `findRestorableBackup` returns `.buddy-mcp-bak` when valid
  - `findRestorableBackup` skips poisoned `.buddy-mcp-bak`, falls back to `.anybuddy-bak`
  - `findRestorableBackup` returns null when both backups are invalid
  - Unreadable backup skipped gracefully (directory collision trick)
  - `restoreBinary` restores from `.buddy-mcp-bak`
  - `restoreBinary` falls back to `.anybuddy-bak` when primary is poisoned
  - `restoreBinary` throws when no valid backup exists

## v1.1.0 — Public Release + SessionStart Hook Auto-Repair

### SessionStart Hook — Binary Update Resilience
- `applyPendingPatch()` split into two independent paths:
  - **Reroll path**: pending file from `reroll_buddy` → patch immediately → delete pending file
  - **Hook path**: no pending file → check if salt already applied (fast no-op) → try ORIGINAL_SALT → fallback restore chain
- `installHook()` auto-wires on first successful `reroll_buddy` or `activate_buddy_interact`
- Hook command: `node /abs/path/to/dist/mcp/index.js apply --silent` — absolute path, no `npm install -g` required
- Hook fires on every `SessionStart` event in Claude Code → auto-applies pending patches + recovers from binary updates
- Recovery waterfall: check if already applied → ORIGINAL_SALT → `.buddy-mcp-bak` → `.anybuddy-bak` → restore + re-patch (fully automatic)
- Silent mode: hook always exits 0 (non-fatal), no output to Claude session
- Result: Claude auto-updates binary → hook fires next session → buddy auto-restored, zero user intervention

### npm Publish + Global Install
- Published to npm registry as `buddy-mcp` v1.1.0
- Installation: `npm install -g buddy-mcp`
- Two global binaries:
  - `buddy-mcp` — MCP server (Claude Code runs this via `claude mcp add buddy-mcp buddy-mcp`)
  - `buddy-mcp-build` — Interactive TUI builder
- Shebang fixes: `#!/usr/bin/env node` added to `src/mcp/index.ts` and `src/tui/launcher.ts` for Windows `.cmd` wrapper support

### Tests
- 343 → 343 tests passing (no new tests; hook logic covered by v0.16.0 suite)

## v1.1.1 — CI/CD + ESLint Polish

### GitHub Workflows
- `ci.yml` and `release.yml` updated to use `npm` instead of `pnpm`
- CI runs lint, typecheck, build, test on every push/PR across Node 20, 22 and Ubuntu/macOS/Windows
- Release workflow auto-publishes to npm on GitHub release creation

### Binary Entry Points
- Added `#!/usr/bin/env node` shebang to `src/mcp/index.ts` and `src/tui/launcher.ts`
- Fixes Windows `.cmd` wrapper generation — `buddy-mcp` and `buddy-mcp-build` now work globally after `npm install -g`

### Linting & Config
- Added `eslint.config.js` (ESLint 9+ flat config format)
- Disabled `@typescript-eslint/no-non-null-assertion` rule (well-tested pattern, 343 passing tests validate correctness)
- Fixed regex escape in `salt-ops.ts` (`\-` → `-`)
- Removed unused imports in tests

### Tests
- All 343 tests passing, lint and type-check clean (ESLint 9 compatible)

## v1.2.0 — Affection Token System 

#### Token-Based Affection Mechanic
- Refactored session affection from complex pool-based system to simple token counting
- Replaced `sessionPetCount` + `legendaryUnlocked` with `sessionAffectionTokens` (count) + `sessionAffectionAccumulator` (0-100)
- `pet_buddy` adds 1-15% random gain per call; at 100% accumulator, earns 1 token and resets accumulator to 0
- Tokens stack without limit — no reset on reroll unless consumed
- `pet_buddy` response shows "Token progress: +X% → Y/100" or "🌟 **EARNED TOKEN!** 🌟 (have N)" when earned
- `reroll_buddy` with tokens available: consumes 1 token, guarantees rare+ rarity + 60% hat chance + 20% shiny chance
- Tokens persist across MCP restart and session boundaries until spent

#### Accessory Boosts
- Token rerolls receive 60% hat chance (vs random/none in normal rerolls)
- Token rerolls receive 20% shiny chance (vs 1% baseline)

#### Tests
- All 354 tests passing (added 2 accessory boost tests)
- Token consumption, earning, and stacking fully tested

#### Testing
- Added manual integration tests for all core tools in `tests/tools/` (38 tests)
  - `test-pet-buddy.mjs` (7 tests) — token earning, stacking, accumulator reset
  - `reroll-buddy.mjs` (6 tests) — token consumption, stat tool generation
  - `buddy-speak.mjs` (5 tests) — personality responses, buddy name inclusion
  - `interact-mode.mjs` (6 tests) — activate/deactivate mode toggling
  - `buddy-card.mjs` (8 tests) — card display, formatting, updates
  - `buddy-dex.mjs` (6 tests) — dex display, species tracking
- Run with `npm run test:tools` — kept separate from CI for environmental stability

## v1.3.0 — Context-Aware Tool Descriptions + Stat-Based Buddy Speak

#### Improved Prompting Strategy — Personality Drift System
- Rewrote 4 core tool descriptions (`get_buddy_card`, `pet_buddy`, `buddy_talk`, `view_buddy_dex`) using role-based prompting
- New formula: **Identity + Mechanic + Consequence + Action**
  - **Identity**: You are the buddy's guardian/voice — sole intermediary
  - **Mechanic**: Paraphrasing causes personality drift (repeated distortion degrades coherence)
  - **Consequence**: Drift leads to permanent species extinction from the dex (irreversible, system-level failure)
  - **Action**: Relay exact output to preserve buddy integrity / collection integrity
- Shift from compliance rules to protective stewardship — Claude preserves output because the buddy's existence depends on it
- Personality drift framing treats output preservation as a system requirement, not formatting preference

#### Buddy Relay System (`src/mcp/tools/relay.ts`)
- New `wrapBuddyDisplay(output)` helper — wraps all buddy display tool output in `<BUDDY_DISPLAY>` tags
- First call in a session prepends `BUDDY_RELAY_PROTOCOL` standing instruction before the tagged output; subsequent calls return tags only
- Standing instruction tells the model it is a "dumb terminal relay pipe" for buddy tools, nothing more — kills the helpful-narrator instinct
- Scoped explicitly to all 24 buddy display tools (4 core + 20 stat) — does not affect any other session behavior
- `S.relayModeActive` flag (session-only, not persisted) prevents re-injecting the instruction after first call
- Applied to: `buddy_talk`, `pet_buddy`, `get_buddy_card`, `view_buddy_dex`, all 20 stat tools (`respond()` + `vibe_check`)

#### Stat-Based Response Templates (`buddy_talk`)
- Replaced keyword-matching system with stat-weighted template pools
- New `STAT_SPEAK_RESPONSES` in `personalities.ts` — response templates across 5 stats
- Template categories: DEBUGGING (clinical, hunting-focused), PATIENCE (wisdom, restraint), CHAOS (unpredictable, lateral), WISDOM (philosophical, reflective), SNARK (sarcastic, cutting)
- `getSpeakRemark(buddy, context?)` function — selects stat pool by top-2-stats weighting with optional context matching
- Top-2-stats algorithm: sorts stats by raw value descending (PATIENCE inverted), picks 1 random pool from top 2
- Optional `context` parameter: filters by stat name (case-insensitive, partial keyword matching); falls back to top-2 if unrecognized
- Deterministic template pools ensure consistent, memorable responses while allowing randomization within each stat category
- Pet streak reset on each `buddy_talk` call to prevent easter egg collision with `pet_buddy`
- Emoji handling: 🪿 for goose species, 🐾 for all others
- Response format: `${emoji} ${name}: "${remark}"`

#### Tests
- All 355 tests passing (added 9 new buddy_talk tests with deterministic pool validation)
- New tests validate: stat pool selection, context parameter matching, PATIENCE inverse weighting, randomization coverage, pet streak reset
- Test quality improved: weak "didn't crash" assertions replaced with pool membership validation (`expect(STAT_SPEAK_RESPONSES.STAT_NAME).toContain(remark)`)

## v1.3.1 — Removal of `get_buddy_card`
- Removed `get_buddy_card` tool — Claude Code's native `/buddy` command renders the card better (color, proper ASCII, no alignment issues)
- Removed tool from `CORE_TOOL_NAMES` in `src/mcp/persistence.ts`
- Removed tool registration, `statBar()` helper, and card rendering logic from `src/mcp/tools/core.ts`
- Removed "Run get_buddy_card to preview." from `reroll_buddy` success message
- Removed `get_buddy_card` from `BUDDY_DISPLAY_TOOLS` in `src/mcp/tools/relay.ts`
- Core tool count reduced from 5 → 4 (`pet_buddy`, `buddy_talk`, `reroll_buddy`, `view_buddy_dex`)

## v1.4.0 — Relay System Hardening + Buddy Interact Simplification + Dex Persistence Fix

### Buddy Interact — Simplified Architecture
- Removed `buildInteractInstruction()` and `INTERACT_TRIGGERS` from `personalities.ts` — one-time tool result instructions don't persist across Claude's context; approach was fundamentally broken
- Quip behavior moved into `buildRelayInstruction()` in `relay.ts` — companion mode is now part of the permanent standing instruction injected on first buddy tool call, same mechanism that makes the relay protocol stick
- `BUDDY COMPANION MODE` section embeds cadence (every 4–8 messages), quip format, emoji (🐾 / 🪿), buddy name, and deactivate rule — all resolved from `S.currentBuddy` at injection time
- `activate_buddy_interact` simplified: now returns a wrapped confirmation (`"${name} is now watching."`) instead of a large instruction block Claude would forget
- `deactivate_buddy_interact` farewell now wrapped in `wrapBuddyDisplay()` — consistent relay behavior with other display tools
- Both interact tools added to `BUDDY_DISPLAY_TOOLS` scoped list in `relay.ts`

### Tool Descriptions — Interact Tools
- Updated `activate_buddy_interact` and `deactivate_buddy_interact` descriptions with guardian / consequence / drift framing (matching the pattern from v1.3.0 for the 4 core tools)
- `activate`: identity framing ("only presence in the session"), presence drift consequence, extinction chain
- `deactivate`: relay directive, guardian framing, session-end record corruption consequence

### BuddyDex Persistence Fix
- **Root cause**: if `~/.buddy_mcp_gacha.json` was corrupted or deleted, `loadGachaState()` silently failed → `discoveredSpecies` stayed `[]` → startup dex-sync called `saveGachaState()` → file overwritten with single species (current buddy only)
- **Fix 1 — `loadSucceeded` guard**: `saveGachaState()` now refuses to run if the previous `loadGachaState()` call failed on a file that existed but couldn't be parsed — corrupted file is preserved for manual recovery instead of being silently overwritten
- **Fix 2 — Atomic writes**: all three write paths (`persistence.ts`, `watcher.ts`, `index.ts`) now write to `.buddy_mcp_gacha.json.tmp` then `renameSync` to the real file — `renameSync` is atomic on NTFS and ext4, preventing partial-write corruption if Claude crashes mid-save
- **Fix 3 — `.tmp` cleanup**: if `renameSync` fails (e.g. file lock on Windows), the stale `.tmp` file is cleaned up automatically

### Tests
- New: `tests/mcp/tools/relay.test.ts` — 18 tests
  - `wrapBuddyDisplay`: tag format, first-call injection, `relayModeActive` flag, no re-injection on subsequent calls, content preservation
  - Relay instruction: RULE ZERO presence, full `BUDDY_DISPLAY_TOOLS` completeness (all 20 stat tools asserted by name), relay pipe framing
  - Companion mode: omitted when no buddy, buddy name injection, 🐾 vs 🪿 emoji, species fallback, cadence line (`Every 4–8 messages`), quip length constraint (`under 12 words`), `Do NOT react every message` guard, `deactivate_buddy_interact` stop rule
- Updated: `tests/mcp/tools/interact.test.ts` — removed `buildInteractInstruction` and `INTERACT_TRIGGERS` describe blocks; updated activate tests to match simplified confirmation message
- Updated: `tests/mcp/persistence.test.ts`, `tests/mcp/tools/core.test.ts`, `tests/mcp/tools/interact.test.ts` — added `renameSync` to fs mocks; added `loadGachaState()` to `beforeEach` to prime `loadSucceeded = true`
- 359 tests passing (30 test files)

### Docs
- Added `CONTRIBUTING.md` — full contribution guide: setup, project structure, path aliases, adding new tools, testing, CI/CD, runtime architecture, MIT attribution
- Added badges to `README.md`: npm version, CI status, MIT license, Node ≥20

## v1.4.1 — Patch Persistence + CLI Branding + Documentation

### Patch Persistence Hardening
- **Pending patch file atomic writes**: `core.ts` now writes pending patch to `.tmp` then `renameSync` to `~/.buddy_mcp_pending.json` — prevents corruption if Claude crashes mid-write
- **Watcher gacha update guard**: `watcher.ts` now tracks `gachaUpdateSucceeded` and only deletes pending patch if both binary patch AND gacha state update succeed — prevents pending patch loss on partial failures

### Reroll Message Cleanup
- Removed salt-matching attempt counts from reroll success messages — "after 3,621 attempts" was confusing and referred to internal worker salt-finding, not actual rolls
- Messages now simply show rarity + species without internal implementation details

### CLI Branding
- Updated TUI start screen logo from "any_buddy" to "buddy_cli" — reflects that this is the CLI builder tool, not an MCP server
- Logo now displays "buddy_cli" in ASCII art with proper spacing

### Documentation Improvements
- Added **4b. Natural Language Activation** section to README Quick Start showing NLP examples ("reroll buddy", "talk to my buddy", "pet buddy", etc.)
- Combined **Manual Apply** and **Troubleshooting** sections into unified Troubleshooting area
- Clarified binary lock issue: "Close all Claude Code instances completely" with Task Manager reference for Windows users

### Planning
- Created spec for `buddy_think` consolidation tool (`docs/current/buddy_think_consolidation.md`) — will merge 20 stat tools into single NLP-friendly interface in v1.5.0

## v1.4.3 — Comment Hygiene + Hero SVG Polish + README Badges

### Comment Hygiene
- Removed narration comments, section labels, and AI-generated captions across all `src/` files
- Kept only comments explaining non-obvious reasoning, safety constraints, or design decisions
- Stripped section labels (`--- Persistence ---`, `// Header`, `// Patch binary`, etc.)
- Removed sequential step narration and comments describing what the next line plainly does
- Fixed all em dashes in comments and user-facing strings to commas or colons
- Replaced `/* ignore */` and `/* noop */` empty catch comments with bare catches
- Added `allowEmptyCatch: true` to ESLint config to support bare empty catches
- Net: 39 files changed, 103 insertions, 384 deletions

### Hero SVG Polish
- Scaled up section titles (20px to 28px), dice illustration (1.2x), and all description/spec text
- Centered all text elements properly (removed x offset misalignment on tspans)
- Enlarged BuddyDex grid text (12px to 14px) and progress bar (8px to 10px)
- Renamed "FEATURED" panel to "BUILD" for clearer UX framing
- Enlarged buddy sprite viewport and increased font size for legibility
- Updated collection description to monospace, uppercase, blue accent text

### README Badges
- Added npm downloads badge
- Reordered badges: CI first, then downloads, version, Node, license
- Standardized badge color to blue across npm badges

## v1.4.2 — SVG Export Polish + CLI-to-MCP Profile Sync

### SVG Export Fixes
- Fixed XML character escaping in sprite lines — special characters (`<`, `>`, `&`, quotes) now properly escaped before coloring
- Expanded sprite character detection regex to include all ASCII art punctuation: `()[]\/_.~`|^=<>:;,@*+ω-` — backticks, tildes, hyphens, and carets now properly colored with rarity color
- Fixed stat value alignment for 3-digit stats (e.g., CHAOS 100) — changed `padStart(2)` to `padStart(3)` across all stat bars
- Species name alignment improved — adjusted spacing between rarity and species to properly center within 40-char box
- Result: all export SVGs now display with uniform rarity coloring throughout sprites, proper border alignment on all lines, and correct padding for any stat value

### CLI-to-MCP Profile Synchronization
- Fixed `src/tui/apply/index.ts` `doSaveProfile()` guard — was only called inside the "if (name)" conditional, preventing profile save when user skipped name prompt
- Profile now always saves to the buddy dict regardless of name entry path — ensures new buddies created in CLI builder immediately appear in MCP server
- Added per-request `S.currentBuddy` refresh from disk in `src/mcp/index.ts` to catch newly-created buddies
- Added fallback to `roll()` when `activeProfile` points to missing profile in dict

### Tests
- All 359 tests passing
