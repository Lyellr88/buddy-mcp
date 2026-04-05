import type { BoxRenderable, TextRenderable } from '@opentui/core';
import { Box, Text } from '@opentui/core';
import type { Renderable as OTUIRenderable } from '@opentui/core';
import { renderAnimatedSprite, IDLE_SEQUENCE } from '@/sprites/index.js';
import { RARITY_STARS } from '@/constants.js';
import { RARITY_HEX, BORDER_COLOR } from './colors.ts';
import { stateToBones, type BuilderState } from './state.ts';
import { renderStatBars } from './stat-bars.ts';

export interface PreviewPanel {
  container: OTUIRenderable;
  update: (state: BuilderState) => void;
  tick: (frame: number) => void;
}

export function createPreviewPanel(parent: OTUIRenderable): PreviewPanel {
  let spriteText: TextRenderable | null = null;
  let titleText: TextRenderable | null = null;
  let detailsText: TextRenderable | null = null;
  let statsText: TextRenderable | null = null;
  let currentState: BuilderState | null = null;
  let lastRenderedFrame = -1;

  const container = Box(
    {
      id: 'preview-panel',
      borderStyle: 'rounded',
      border: true,
      borderColor: BORDER_COLOR,
      title: ' Live Preview ',
      titleAlignment: 'center',
      flexDirection: 'column',
      width: 40,
      padding: 1,
      paddingTop: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexShrink: 0,
    },
    // Title line: "dragon ★★★★★"
    Text({ id: 'preview-title', content: '', height: 1 }),
    // Spacer
    Text({ content: '', height: 1 }),
    // Sprite (fixed 5 lines for stability)
    Text({ id: 'preview-sprite', content: '\n\n\n\n', height: 5 }),
    // Spacer
    Text({ content: '', height: 1 }),
    // Details block
    Text({ id: 'preview-details', content: '', height: 4 }),
    // Spacer before stats
    Text({ content: '', height: 1 }),
    // Stats bar chart
    Text({ id: 'preview-stats', content: '', height: 5 }),
  );

  parent.add(container);

  const containerRenderable = parent.findDescendantById('preview-panel') as BoxRenderable;
  spriteText = containerRenderable?.findDescendantById('preview-sprite') as TextRenderable;
  titleText = containerRenderable?.findDescendantById('preview-title') as TextRenderable;
  detailsText = containerRenderable?.findDescendantById('preview-details') as TextRenderable;
  statsText = containerRenderable?.findDescendantById('preview-stats') as TextRenderable;

  function renderSpriteAtFrame(bones: ReturnType<typeof stateToBones>, frame: number): void {
    if (!spriteText) return;
    spriteText.content = renderAnimatedSprite(bones, frame);
  }

  function update(state: BuilderState): void {
    if (!spriteText || !titleText || !detailsText || !statsText) return;

    currentState = state;
    lastRenderedFrame = -1;

    const bones = stateToBones(state);
    const color = RARITY_HEX[state.rarity];

    // Title
    titleText.content = `${state.species} ${RARITY_STARS[state.rarity]}`;
    titleText.fg = color;

    // Sprite — render frame 0, animation will advance via tick()
    renderSpriteAtFrame(bones, 0);
    spriteText.fg = color;

    // Details -- use rarity color for values, dim for labels
    const hatLabel = state.rarity === 'common' ? 'none' : state.hat;
    const detailLines = [
      `Rarity:  ${state.rarity}`,
      `Eyes:    ${state.eye}`,
      `Hat:     ${hatLabel}`,
      `Shiny:   ${state.shiny ? 'YES' : 'no'}`,
    ];
    detailsText.content = detailLines.join('\n');
    detailsText.fg = color;

    // Stats bar chart
    if (state.statsMode === 'customize') {
      statsText.content = renderStatBars(state.peak, state.dump);
      statsText.fg = color;
      statsText.visible = true;
    } else {
      statsText.content = '';
      statsText.visible = false;
    }
  }

  function tick(frame: number): void {
    if (!currentState || !spriteText) return;
    const seqEntry = IDLE_SEQUENCE[frame % IDLE_SEQUENCE.length];
    if (seqEntry === lastRenderedFrame) return;
    lastRenderedFrame = seqEntry;
    renderSpriteAtFrame(stateToBones(currentState), frame);
  }

  return {
    container: containerRenderable ?? (container as unknown as OTUIRenderable),
    update,
    tick,
  };
}
