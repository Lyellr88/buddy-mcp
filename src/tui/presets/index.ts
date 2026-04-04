import { ISSUE_URL } from '@/constants.js';
import { BORDER_COLOR, DIM_COLOR, FOCUS_BORDER, RARITY_HEX } from '@/tui/builder/colors.js';
import { createAnimator } from '@/tui/animator.js';
import { PRESETS, type Preset } from '@/presets.js';
import { RARITY_STARS } from '@/constants.js';
import { renderAnimatedSprite, IDLE_SEQUENCE } from '@/sprites/index.js';
import type { Bones } from '@/types.js';

function presetToBones(p: Preset): Bones {
  return {
    species: p.species,
    eye: p.eye,
    rarity: p.rarity,
    hat: p.rarity === 'common' ? 'none' : p.hat,
    shiny: false,
    stats: {},
  };
}

export async function runPresetsTUI(): Promise<Preset | null> {
  const otui = await import('@opentui/core');
  const { createCliRenderer, Box, Text, SelectRenderableEvents } = otui;
  type TextRenderableType = InstanceType<typeof otui.TextRenderable>;
  const { createPresetListPanel } = await import('./preset-list-panel.ts');

  let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;
  let selectedIndex = 0;

  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
      screenMode: 'alternate-screen',
    });

    const r = renderer;

    return await new Promise<Preset | null>((resolve) => {
      let resolved = false;
      const animator = createAnimator(500);
      let unsubAnimation: (() => void) | null = null;
      let confirmMode = false;

      let spriteText: TextRenderableType | null = null;
      let titleText: TextRenderableType | null = null;
      let detailsText: TextRenderableType | null = null;
      let descText: TextRenderableType | null = null;
      let lastRenderedFrame = -1;
      let currentBones: Bones | null = null;

      const handleCtrlC = (key: { ctrl?: boolean; name?: string }) => {
        if (key.ctrl && key.name === 'c') finish(null);
      };

      function finish(result: Preset | null): void {
        if (resolved) return;
        resolved = true;
        unsubAnimation?.();
        animator.stop();
        r.keyInput.removeListener('keypress', handleCtrlC);
        r.keyInput.removeListener('keypress', handleKeyPress);
        r.destroy();
        renderer = null;
        resolve(result);
      }

      function updatePreview(index: number): void {
        const preset = PRESETS[index];
        const bones = presetToBones(preset);
        currentBones = bones;
        lastRenderedFrame = -1;
        const color = RARITY_HEX[preset.rarity];

        if (titleText) {
          titleText.content = `${preset.species} ${RARITY_STARS[preset.rarity]}`;
          titleText.fg = color;
        }
        if (spriteText) {
          spriteText.content = renderAnimatedSprite(bones, 0);
          spriteText.fg = color;
        }
        if (detailsText) {
          detailsText.content = [
            `Rarity:  ${preset.rarity}`,
            `Eyes:    ${preset.eye}`,
            `Hat:     ${preset.hat}`,
          ].join('\n');
          detailsText.fg = color;
        }
        if (descText) {
          descText.content = preset.description;
          descText.fg = DIM_COLOR;
        }
      }

      function tickPreview(frame: number): void {
        if (!currentBones || !spriteText) return;
        const seqEntry = IDLE_SEQUENCE[frame % IDLE_SEQUENCE.length];
        if (seqEntry === lastRenderedFrame) return;
        lastRenderedFrame = seqEntry;
        spriteText.content = renderAnimatedSprite(currentBones, frame);
      }

      // Layout
      const rootBox = Box(
        {
          id: 'root',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          borderStyle: 'rounded',
          border: true,
          borderColor: BORDER_COLOR,
          title: ' any-buddy presets ',
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
          content: '  ↑↓ browse   Enter select   Esc back',
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

      // Left panel — preset list
      const presetList = createPresetListPanel(mainRow, PRESETS);

      // Right panel — preview
      const previewBox = Box(
        {
          id: 'preset-preview',
          borderStyle: 'rounded',
          border: true,
          borderColor: BORDER_COLOR,
          title: ' Preview ',
          titleAlignment: 'center',
          flexDirection: 'column',
          width: 40,
          padding: 1,
          paddingTop: 1,
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0,
        },
        Text({ id: 'pp-title', content: '', height: 1 }),
        Text({ content: '', height: 1 }),
        Text({ id: 'pp-sprite', content: '\n\n\n\n', height: 5 }),
        Text({ content: '', height: 1 }),
        Text({ id: 'pp-details', content: '', height: 3 }),
        Text({ content: '', height: 1 }),
        Text({ id: 'pp-desc', content: '', height: 2 }),
      );

      mainRow.add(previewBox);
      const previewRenderable = mainRow.findDescendantById('preset-preview');
      titleText = previewRenderable?.findDescendantById('pp-title') as TextRenderableType;
      spriteText = previewRenderable?.findDescendantById('pp-sprite') as TextRenderableType;
      detailsText = previewRenderable?.findDescendantById('pp-details') as TextRenderableType;
      descText = previewRenderable?.findDescendantById('pp-desc') as TextRenderableType;

      // Initial render
      updatePreview(0);
      unsubAnimation = animator.subscribe((frame) => tickPreview(frame));

      // Selection changes
      presetList.select?.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
        selectedIndex = index;
        updatePreview(index);
      });

      const HELP_BROWSE = '  ↑↓ browse   Enter select   Esc back';
      const HELP_CONFIRM = '  Enter/Y confirm   Esc/N go back';

      function handleKeyPress(key: { name?: string }): void {
        if (confirmMode) {
          if (key.name === 'return' || key.name === 'y') {
            finish(PRESETS[selectedIndex]);
          } else if (key.name === 'escape' || key.name === 'n') {
            confirmMode = false;
            if (helpBar) {
              helpBar.content = HELP_BROWSE;
              helpBar.fg = DIM_COLOR;
            }
          }
          return;
        }

        if (key.name === 'return') {
          confirmMode = true;
          if (helpBar) {
            helpBar.content = HELP_CONFIRM;
            helpBar.fg = FOCUS_BORDER;
          }
        } else if (key.name === 'escape') {
          finish(null);
        }
      }

      r.keyInput.on('keypress', handleCtrlC);
      r.keyInput.on('keypress', handleKeyPress);
      r.auto();
    });
  } catch (err) {
    if (renderer) {
      try {
        renderer.destroy();
      } catch {
        /* ignore */
      }
    }
    console.error(`  Presets browser error: ${(err as Error).message}`);
    console.error(`  If this persists, please report at: ${ISSUE_URL}`);
    return null;
  }
}
