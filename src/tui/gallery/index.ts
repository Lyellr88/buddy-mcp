import { ISSUE_URL } from '@/constants.js';
import { canUseBuilder } from '@/tui/builder/index.js';
import { BORDER_COLOR, DIM_COLOR, FOCUS_BORDER } from '@/tui/builder/colors.js';
import { createAnimator } from '@/tui/animator.js';
import { type GalleryEntry } from './state.ts';

export type GalleryResult = { action: 'apply'; profileName: string } | { action: 'cancel' };

export type GalleryDeleteHandler = (profileName: string) => GalleryEntry[];

export async function runGalleryTUI(
  initialEntries: GalleryEntry[],
  activeIndex: number,
  onDelete?: GalleryDeleteHandler,
): Promise<GalleryResult> {
  const otui = await import('@opentui/core');
  const { createCliRenderer, Box, Text, SelectRenderableEvents } = otui;
  type TextRenderableType = InstanceType<typeof otui.TextRenderable>;
  const { createProfileListPanel } = await import('./profile-list-panel.ts');
  const { createGalleryPreviewPanel } = await import('./profile-preview-panel.ts');
  const { setupGalleryKeyboard } = await import('./keyboard.ts');

  let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;
  let entries = initialEntries;
  let selectedIndex = activeIndex;

  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
      screenMode: 'alternate-screen',
    });

    const r = renderer;

    return await new Promise<GalleryResult>((resolve) => {
      let resolved = false;
      const animator = createAnimator(500);
      let unsubAnimation: (() => void) | null = null;

      const handleCtrlC = (key: { ctrl?: boolean; name?: string }) => {
        if (key.ctrl && key.name === 'c') {
          finish({ action: 'cancel' });
        }
      };

      const handleSelectionChanged = (index: number) => {
        selectedIndex = index;
        preview.update(entries[index]);
      };

      function finish(result: GalleryResult): void {
        if (resolved) return;
        resolved = true;
        unsubAnimation?.();
        animator.stop();
        profileList.select?.removeListener(
          SelectRenderableEvents.SELECTION_CHANGED,
          handleSelectionChanged,
        );
        r.keyInput.removeListener('keypress', handleCtrlC);
        keyboard.destroy();
        r.destroy();
        renderer = null;
        resolve(result);
      }

      // Root layout
      const rootBox = Box(
        {
          id: 'root',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          borderStyle: 'rounded',
          border: true,
          borderColor: BORDER_COLOR,
          title: ' any-buddy buddies ',
          titleAlignment: 'center',
          padding: 0,
        },
        Box({
          id: 'main-row',
          flexDirection: 'row',
          flexGrow: 1,
          width: '100%',
        }),
        Text({
          id: 'help-bar',
          content: '  ↑↓ navigate   Enter apply   d delete   Esc exit',
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
        finish({ action: 'cancel' });
        return;
      }

      // Buddy list (left) — uses native Select
      const profileList = createProfileListPanel(mainRow, entries, activeIndex);

      // Preview (right)
      const preview = createGalleryPreviewPanel(mainRow);

      // Initial render + start animation
      preview.update(entries[activeIndex]);
      unsubAnimation = animator.subscribe((frame) => preview.tick(frame));

      // Update preview when Select selection changes
      profileList.select?.on(SelectRenderableEvents.SELECTION_CHANGED, handleSelectionChanged);

      const HELP_BROWSE = '  ↑↓ navigate   Enter apply   d delete   Esc exit';
      const HELP_CONFIRM_APPLY = '  Enter/Y confirm   Esc/N go back';
      const helpConfirmDelete = (name: string) =>
        `  Delete "${name}"?   Enter/Y confirm   Esc/N go back`;
      const DELETE_COLOR = '#FF5555';

      function selectedProfileSalt(): string {
        return entries[selectedIndex].salt;
      }

      function selectedDisplayName(): string {
        return entries[selectedIndex].name;
      }

      // Keyboard — handles Enter (confirm), d (delete), Escape, Ctrl+C
      const keyboard = setupGalleryKeyboard(
        r.keyInput,
        () => {
          const entry = entries[selectedIndex];
          return !!onDelete && !entry.isDefault && !entry.isActive;
        },
        {
          onApply: () => {
            finish({ action: 'apply', profileName: selectedProfileSalt() });
          },
          onDelete: () => {
            if (!onDelete) return;
            entries = onDelete(selectedProfileSalt());
            selectedIndex = Math.min(selectedIndex, entries.length - 1);
            profileList.update(entries, selectedIndex);
            preview.update(entries[selectedIndex]);
          },
          onCancel: () => {
            finish({ action: 'cancel' });
          },
          onModeChange: (mode) => {
            if (!helpBar) return;
            if (mode === 'confirmApply') {
              helpBar.content = HELP_CONFIRM_APPLY;
              helpBar.fg = FOCUS_BORDER;
            } else if (mode === 'confirmDelete') {
              helpBar.content = helpConfirmDelete(selectedDisplayName());
              helpBar.fg = DELETE_COLOR;
            } else {
              helpBar.content = HELP_BROWSE;
              helpBar.fg = DIM_COLOR;
            }
          },
        },
      );

      // Ctrl+C fallback
      r.keyInput.on('keypress', handleCtrlC);

      r.auto();
    });
  } catch (err) {
    if (renderer) {
      try {
        renderer.destroy();
      } catch {
        // ignore cleanup errors
      }
    }
    console.error(`  Gallery error: ${(err as Error).message}`);
    console.error(`  If this persists, please report at: ${ISSUE_URL}`);
    return { action: 'cancel' };
  }
}

export { canUseBuilder as canUseGalleryTUI };
