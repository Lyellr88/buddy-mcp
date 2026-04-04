import type { BoxRenderable, SelectRenderable, SelectOption } from '@opentui/core';
import { Box, Select } from '@opentui/core';
import type { Renderable as OTUIRenderable } from '@opentui/core';
import { RARITY_STARS } from '@/constants.js';
import { renderFace } from '@/sprites/index.js';
import { BORDER_COLOR, HIGHLIGHT_BG, HIGHLIGHT_FG, TEXT_COLOR } from '@/tui/builder/colors.js';
import type { Preset } from '@/presets.js';

function presetsToOptions(presets: readonly Preset[]): SelectOption[] {
  const nameWidth = Math.max(...presets.map((p) => p.name.length));

  return presets.map((p) => {
    const stars = RARITY_STARS[p.rarity] ?? '';
    const face = renderFace({ species: p.species, eye: p.eye });
    const label = `${p.name.padEnd(nameWidth)}  ${stars.padEnd(6)} ${face}`;
    return {
      name: label,
      description: '',
      value: p.name,
    };
  });
}

export interface PresetListPanel {
  container: OTUIRenderable;
  select: SelectRenderable | null;
}

export function createPresetListPanel(
  parent: OTUIRenderable,
  presets: readonly Preset[],
): PresetListPanel {
  const options = presetsToOptions(presets);

  const container = Box(
    {
      id: 'preset-list',
      borderStyle: 'rounded',
      border: true,
      borderColor: BORDER_COLOR,
      title: ' Presets ',
      titleAlignment: 'center',
      flexDirection: 'column',
      width: '50%',
      padding: 0,
      paddingLeft: 1,
      paddingRight: 1,
    },
    Select({
      id: 'preset-select',
      options,
      flexGrow: 1,
      selectedBackgroundColor: HIGHLIGHT_BG,
      selectedTextColor: HIGHLIGHT_FG,
      textColor: TEXT_COLOR,
      showScrollIndicator: true,
      wrapSelection: true,
      showDescription: false,
    }),
  );

  parent.add(container);

  const containerRenderable = parent.findDescendantById('preset-list') as BoxRenderable;
  const select = containerRenderable?.findDescendantById(
    'preset-select',
  ) as SelectRenderable | null;

  select?.focus();

  return {
    container: containerRenderable ?? (container as unknown as OTUIRenderable),
    select,
  };
}
