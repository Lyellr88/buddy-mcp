# Contributing to buddy-mcp

Thanks for wanting to contribute! This project is licensed under [MIT](LICENSE).

buddy-mcp is forked from and extends [any-buddy](https://github.com/cpaczek/any-buddy) by cpaczek. Core binary patching and TUI builder code originates there.

## Getting Started

```bash
git clone https://github.com/Lyellr88/buddy-mcp.git
cd buddy-mcp
npm install
npm run build
```

## Development

The project is written in TypeScript and compiles to ESM JavaScript.

```bash
npm run build         # Compile TypeScript + resolve path aliases
npm run typecheck     # Type-check without emitting
npm run test          # Run all Vitest tests
npm run test:watch    # Run tests in watch mode
npm run test:tools    # Run manual integration tests (requires a valid build + buddy state)
npm run serve         # Run MCP server directly (alias for node dist/mcp/index.js)
npm run apply         # Manually apply a pending patch (alias for node dist/mcp/index.js apply)
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier auto-format
npm run format:check  # Check formatting
npm run ci            # Full quality gate: lint + format:check + typecheck + build + test
```

Always run `npm run ci` before submitting changes.

### Project Structure

```
src/
  mcp/                        # MCP server (Claude Code connects here)
    index.ts                  # Entry point — server init, tool registration, apply mode
    state.ts                  # Shared mutable session state (S, gachaState, dynamicTools)
    persistence.ts            # Load/save gacha state, CORE_TOOL_NAMES, registerManifestedTool
    tools/
      core.ts                 # Core tools: pet_buddy, buddy_talk, reroll_buddy, view_buddy_dex
      stats.ts                # 20 stat personality tools (4 per stat, 2 visible per buddy)
      interact.ts             # activate/deactivate_buddy_interact
      export.ts               # export_buddy_card, export_buddy_sprite (SVG)
      relay.ts                # wrapBuddyDisplay() — BUDDY_RELAY_PROTOCOL injection
      auto.ts                 # autoManifestTools() — legacy no-op, kept for compat
    watcher.ts                # Background watcher — polls until Claude closes, auto-patches
  tui/                        # TUI builder (buddy-mcp-build CLI, Bun-optional)
    index.ts                  # TUI root — wires subcommands and start screen
    launcher.ts               # Entry point — detects Bun, falls back to sequential prompts
    cli.ts                    # Subcommand dispatch
    animator.ts               # Sprite animation utilities
    display.ts                # Pet rendering + warnings
    format.ts                 # Formatting utilities
    prompts.ts                # Fallback sequential prompts (@inquirer/prompts)
    apply/                    # Pending patch apply flow
    commands/                 # Command handlers
      buddies.ts              # Saved buddies browser
      current.ts              # Display current buddy
      interactive.ts          # Interactive build flow
      preview.ts              # Species preview
      rehatch.ts              # Delete + restart
      restore.ts              # Binary restore
      share.ts                # Copy ASCII card to clipboard
      start-screen.ts         # Main menu
    builder/                  # Interactive builder TUI (OpenTUI, Bun-only)
      index.ts                # Builder entry + TTY/Bun detection + fallback
      state.ts                # Builder state management + constraints
      selection-panel.ts      # Species/eye/rarity/hat/stats selection UI
      preview-panel.ts        # Live pet preview with stat bars
      keyboard.ts             # Keyboard navigation (Tab, Enter, Esc)
      colors.ts               # Hex color constants for OpenTUI
      stat-bars.ts            # ASCII stat bar visualization
    gallery/                  # Saved buddy gallery browser (OpenTUI, Bun-only)
      index.ts                # Gallery entry
      state.ts                # Gallery state management
      profile-list-panel.ts   # Buddy list panel
      profile-preview-panel.ts# Preview panel
      keyboard.ts             # Keyboard navigation
    presets/                  # Preset buddy browser
      index.ts                # Preset browser entry
      preset-list-panel.ts    # Preset list panel
    start/                    # Start screen TUI (OpenTUI, Bun-only)
      index.ts                # Start screen entry
  types.ts                    # Shared type definitions
  constants.ts                # Species, rarities, eyes, hats, stats, ORIGINAL_SALT
  personalities.ts            # Personality strings, STAT_SPEAK_RESPONSES, interact triggers
  generation/                 # Hash + RNG + pet trait generation
  sprites/                    # ASCII art rendering (static + animated)
  config/                     # Config file management (pet, claude, hooks)
  patcher/                    # Binary finding, salt ops, patching, backup chain
  finder/                     # Multi-worker salt brute-force (Bun wyhash workers)
tests/                        # Vitest test files (mirrors src/ structure)
  mcp/tools/                  # Tool handler tests (core, stats, interact)
  mcp/                        # Persistence, auto, state tests
  patcher/                    # Binary patch, salt ops tests
  generation/                 # Hash, RNG, roll, seed tests
  sprites/                    # Render tests
  config/                     # Config round-trip, hook tests
  tui/                        # TUI formatting, builder state, gallery tests
  tools/                      # Manual integration tests (require build + buddy state)
```

### Path Aliases

Cross-module imports use `@/` aliases instead of relative paths:

```typescript
import { roll } from '@/generation/roll.js';
import { SPECIES } from '@/constants.js';
```

Same-directory imports use relative paths with `.js` extensions (ESM):

```typescript
import { wrapBuddyDisplay } from './relay.js';
```

### Running the MCP Server Locally

```bash
node dist/mcp/index.js        # Run MCP server directly (stdio transport)
```

Register with Claude Code:

```bash
claude mcp add buddy-mcp buddy-mcp
```

Or point directly at your local build:

```bash
claude mcp add buddy-mcp node /path/to/dist/mcp/index.js
```

### Running the TUI Builder Locally

```bash
node dist/tui/launcher.js     # Auto-detects Bun, falls back to sequential prompts
bun dist/tui/launcher.js      # Force full animated TUI (requires Bun)
```

### Runtime Architecture

buddy-mcp runs as two separate binaries:

- **`buddy-mcp`** — MCP server over stdio. Claude Code spawns it on session start. Handles all tool calls, state management, and binary patching.
- **`buddy-mcp-build`** — Interactive TUI builder. User-facing CLI for custom buddy builds, preset browsing, and binary restore. Shares state with the MCP server via `~/.buddy-mcp.json` — zero IPC.

The MCP server communicates over stdin/stdout using `@modelcontextprotocol/sdk`. Tool results are wrapped in `<BUDDY_DISPLAY>` tags via `relay.ts` so Claude relays them verbatim to the user.

Salt brute-forcing uses Bun workers (`finder/`) with `Bun.hash()` (wyhash). The Node runtime falls back to FNV-1a for test environments.

### Adding a New Tool

1. Define the tool object and handler in the appropriate file under `src/mcp/tools/`
2. Register via `dynamicTools.set(name, { tool, handler, _def })` 
3. Add the name to `CORE_TOOL_NAMES` in `persistence.ts` to protect it from being overwritten
4. If the tool returns display output, wrap the return value with `wrapBuddyDisplay()` from `relay.ts`
5. Add the tool name to `BUDDY_DISPLAY_TOOLS` in `relay.ts`
6. Add tests in `tests/mcp/tools/`

## Testing

Tests use [Vitest](https://vitest.dev/) and live in `tests/`.

```bash
npm run test              # Run all tests once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:tools        # Manual integration tests (requires build + buddy state)
```

The Vitest suite covers:

- **mcp/tools/** — Tool handler behavior, no-buddy guards, stat pool selection, relay wrapping
- **mcp/** — Persistence round-trips, CORE_TOOL_NAMES protection, gacha state load/save
- **patcher/** — Binary patch correctness, salt detection, backup chain, poison prevention
- **generation/** — Hash determinism, RNG, trait rolling, seed-to-profile
- **sprites/** — ASCII rendering, eye substitution, hat placement, animation frames
- **config/** — Config round-trips, hook install/remove
- **tui/** — Formatting, builder state, color validation, stat bars, gallery, prompts

The `tests/tools/` integration tests import handlers directly from the compiled output — they require a valid `npm run build` and a buddy state in `~/.buddy-mcp.json`. They are excluded from CI.

## CI/CD

GitHub Actions runs on every push and PR:

- **Quality gate** (`ci.yml`): lint, format check, typecheck, build, test across Node 20/22 on Ubuntu, macOS, and Windows — with Bun installed for worker compatibility
- **Release** (`release.yml`): creating a GitHub release auto-publishes to npm as `buddy-mcp`

## Submitting Changes

1. Fork the repo
2. Create a branch (`git checkout -b my-feature`)
3. Make your changes
4. Run `npm run ci` — all checks must pass
5. Commit and push
6. Open a PR

No formal style guide beyond what ESLint and Prettier enforce. Keep it simple.
