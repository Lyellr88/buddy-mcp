import type { CliFlags, DesiredTraits } from '@/types.js';
import { ISSUE_URL } from '@/constants.js';
import { createAnimator } from '@/tui/animator.js';
import {
  createInitialState,
  stateToDesiredTraits,
  firstUnfilledField,
  type BuilderState,
} from './state.ts';

const MIN_COLS = 70;
const MIN_ROWS = 18;

export async function canUseBuilder(): Promise<boolean> {
  // Must be a TTY
  if (!process.stdout.isTTY || !process.stdin.isTTY) return false;

  // Respect accessibility / dumb terminal
  if (process.env.TERM === 'dumb' || process.env.NO_COLOR !== undefined) return false;

  // Must be running under Bun (OpenTUI requires it)
  if (typeof globalThis.Bun === 'undefined') return false;

  // Terminal must be large enough
  const cols = process.stdout.columns ?? 0;
  const rows = process.stdout.rows ?? 0;
  if (cols < MIN_COLS || rows < MIN_ROWS) return false;

  // Try to load OpenTUI
  try {
    await import('@opentui/core');
    return true;
  } catch {
    return false;
  }
}

export async function runBuilder(
  flags: CliFlags = {},
  browseOnly = false,
): Promise<DesiredTraits | null> {
  // Dynamic imports to avoid crashing on Node
  const otui = await import('@opentui/core');
  const { createCliRenderer, Box, Text } = otui;
  type TextRenderableType = InstanceType<typeof otui.TextRenderable>;
  const { createPreviewPanel } = await import('./preview-panel.ts');
  const { createSelectionPanel } = await import('./selection-panel.ts');
  const { setupKeyboard } = await import('./keyboard.ts');
  const { BORDER_COLOR, DIM_COLOR, FOCUS_BORDER } = await import('./colors.ts');

  const initialState = createInitialState(flags);
  let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;

  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
      screenMode: 'alternate-screen',
    });

    const r = renderer;

    return await new Promise<DesiredTraits | null>((resolve) => {
      let resolved = false;
      const animator = createAnimator(500);
      let unsubAnimation: (() => void) | null = null;

      const handleCtrlC = (key: { ctrl?: boolean; name?: string }) => {
        if (key.ctrl && key.name === 'c') {
          finish(null);
        }
      };

      function finish(result: DesiredTraits | null): void {
        if (resolved) return;
        resolved = true;
        unsubAnimation?.();
        animator.stop();
        r.keyInput.removeListener('keypress', handleCtrlC);
        keyboard.destroy();
        r.destroy();
        renderer = null;
        resolve(result);
      }

      // Root layout: column with main content row + pinned help bar
      const title = browseOnly ? ' any-buddy preview ' : ' any-buddy ';
      const rootBox = Box(
        {
          id: 'root',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          borderStyle: 'rounded',
          border: true,
          borderColor: BORDER_COLOR,
          title,
          titleAlignment: 'center',
          padding: 0,
        },
        // Main content row (selection + preview)
        Box({
          id: 'main-row',
          flexDirection: 'row',
          flexGrow: 1,
          width: '100%',
        }),
        // Pinned help bar at bottom -- always visible
        Text({
          id: 'help-bar',
          content: '  \u2191\u2193 select   Tab/Enter next   Shift+Tab prev   Esc cancel',
          fg: DIM_COLOR,
          height: 1,
          flexShrink: 0,
          paddingLeft: 1,
        }),
      );

      r.root.add(rootBox);
      const mainRow = r.root.findDescendantById('main-row');
      const helpBar = r.root.findDescendantById('help-bar') as TextRenderableType | null;
      if (!mainRow) {
        finish(null);
        return;
      }

      // Selection panel (left) — added first so it's on the left
      const selection = createSelectionPanel(mainRow, initialState, (state: BuilderState) => {
        preview.update(state);
      });

      // Preview panel (right)
      const preview = createPreviewPanel(mainRow);

      // Initial preview render + start animation
      preview.update(initialState);
      unsubAnimation = animator.subscribe((frame) => preview.tick(frame));

      const HELP_DEFAULT = '  \u2191\u2193 select   Tab/Enter next   Shift+Tab prev   Esc cancel';
      const HELP_CONFIRM = browseOnly
        ? '  Enter/Y exit   Esc/N go back'
        : '  Enter/Y confirm & apply   Esc/N go back and edit';

      // Keyboard navigation
      const startField = firstUnfilledField(flags);
      const keyboard = setupKeyboard(r.keyInput, {
        getState: selection.getState,
        focusField: selection.focusField,
        onConfirm: () => {
          if (browseOnly) {
            finish(null);
          } else {
            finish(stateToDesiredTraits(selection.getState()));
          }
        },
        onCancel: () => {
          finish(null);
        },
        onEnterConfirmMode: () => {
          if (helpBar) {
            helpBar.content = HELP_CONFIRM;
            helpBar.fg = FOCUS_BORDER;
          }
        },
        onExitConfirmMode: () => {
          if (helpBar) {
            helpBar.content = HELP_DEFAULT;
            helpBar.fg = DIM_COLOR;
          }
        },
      });

      // Focus the first unfilled field
      selection.focusField(startField);

      // Handle Ctrl+C
      r.keyInput.on('keypress', handleCtrlC);

      // Start rendering
      r.auto();
    });
  } catch (err) {
    // Clean up on error
    if (renderer) {
      try {
        renderer.destroy();
      } catch {
        // ignore cleanup errors
      }
    }
    // Log the error and return null so the caller can fall back
    console.error(`  Builder error: ${(err as Error).message}`);
    console.error(`  If this persists, please report at: ${ISSUE_URL}`);
    return null;
  }
}

export { createInitialState, stateToDesiredTraits, type BuilderState } from './state.ts';
export { canUseBuilder as canUseOpenTUI };
