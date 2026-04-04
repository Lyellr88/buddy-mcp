import type { BoxRenderable, TextRenderable } from '@opentui/core';
import { Box, Text } from '@opentui/core';
import type { Renderable as OTUIRenderable } from '@opentui/core';
import { renderAnimatedSprite, IDLE_SEQUENCE } from '@/sprites/index.js';
import { RARITY_STARS } from '@/constants.js';
import { RARITY_HEX, BORDER_COLOR } from '@/tui/builder/colors.js';
import { renderStatBarsFromStats } from '@/tui/builder/stat-bars.js';
import type { GalleryEntry } from './state.ts';

export interface GalleryPreviewPanel {
  container: OTUIRenderable;
  update: (entry: GalleryEntry) => void;
  tick: (frame: number) => void;
}

export function createGalleryPreviewPanel(parent: OTUIRenderable): GalleryPreviewPanel {
  let nameText: TextRenderable | null = null;
  let spriteText: TextRenderable | null = null;
  let titleText: TextRenderable | null = null;
  let detailsText: TextRenderable | null = null;
  let statsText: TextRenderable | null = null;
  let personalityText: TextRenderable | null = null;
  let currentEntry: GalleryEntry | null = null;
  let lastRenderedFrame = -1;

  const container = Box(
    {
      id: 'gallery-preview',
      borderStyle: 'rounded',
      border: true,
      borderColor: BORDER_COLOR,
      title: ' Preview ',
      titleAlignment: 'center',
      flexDirection: 'column',
      width: '50%',
      overflow: 'hidden',
      padding: 1,
      paddingTop: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    // Name (centered nameplate)
    Text({ id: 'gp-name', content: '', height: 1 }),
    Text({ content: '', height: 1 }),
    // Title: "dragon ★★★★★"
    Text({ id: 'gp-title', content: '', height: 1 }),
    Text({ content: '', height: 1 }),
    // Sprite (5 lines)
    Text({ id: 'gp-sprite', content: '\n\n\n\n', height: 5 }),
    Text({ content: '', height: 1 }),
    // Details
    Text({ id: 'gp-details', content: '', height: 4 }),
    Text({ content: '', height: 1 }),
    // Stats
    Text({ id: 'gp-stats', content: '', height: 5 }),
    Text({ content: '', height: 1 }),
    // Personality (bottom, left-aligned, clips naturally via overflow)
    Text({ id: 'gp-personality', content: '', width: '100%' }),
  );

  parent.add(container);

  const containerRenderable = parent.findDescendantById('gallery-preview') as BoxRenderable;
  nameText = containerRenderable?.findDescendantById('gp-name') as TextRenderable;
  spriteText = containerRenderable?.findDescendantById('gp-sprite') as TextRenderable;
  titleText = containerRenderable?.findDescendantById('gp-title') as TextRenderable;
  detailsText = containerRenderable?.findDescendantById('gp-details') as TextRenderable;
  statsText = containerRenderable?.findDescendantById('gp-stats') as TextRenderable;
  personalityText = containerRenderable?.findDescendantById('gp-personality') as TextRenderable;

  function renderSpriteAtFrame(bones: GalleryEntry['bones'], frame: number): void {
    if (!spriteText) return;
    spriteText.content = renderAnimatedSprite(bones, frame);
  }

  function update(entry: GalleryEntry): void {
    if (!nameText || !spriteText || !titleText || !detailsText || !statsText || !personalityText)
      return;
    if (currentEntry === entry) return;

    currentEntry = entry;
    lastRenderedFrame = -1;

    const { bones, profile } = entry;
    const color = RARITY_HEX[bones.rarity];

    // Name (centered nameplate)
    const name = profile?.name ?? (entry.isDefault ? 'Original Pet' : entry.name);
    nameText.content = name;
    nameText.fg = color;

    // Title
    titleText.content = `${bones.species} ${RARITY_STARS[bones.rarity]}`;
    titleText.fg = color;

    // Sprite (render frame 0 on entry change)
    renderSpriteAtFrame(bones, 0);
    spriteText.fg = color;

    // Details
    const detailLines = [
      `Rarity:  ${bones.rarity}`,
      `Eyes:    ${bones.eye}`,
      `Hat:     ${bones.hat}`,
      `Shiny:   ${bones.shiny ? 'YES' : 'no'}`,
    ];
    detailsText.content = detailLines.join('\n');
    detailsText.fg = color;

    // Stats
    const statContent = renderStatBarsFromStats(bones.stats);
    if (statContent) {
      statsText.content = statContent;
      statsText.fg = color;
      statsText.visible = true;
    } else {
      statsText.content = '';
      statsText.visible = false;
    }

    // Personality (bottom, clips via overflow: hidden)
    const personality = profile?.personality;
    if (personality) {
      personalityText.content = `"${personality}"`;
      personalityText.fg = color;
      personalityText.visible = true;
    } else {
      personalityText.content = '';
      personalityText.visible = false;
    }
  }

  function tick(frame: number): void {
    if (!currentEntry || !spriteText) return;
    const step = IDLE_SEQUENCE[frame % IDLE_SEQUENCE.length];
    if (step === lastRenderedFrame) return;
    lastRenderedFrame = step;
    renderSpriteAtFrame(currentEntry.bones, frame);
  }

  return {
    container: containerRenderable ?? (container as unknown as OTUIRenderable),
    update,
    tick,
  };
}
