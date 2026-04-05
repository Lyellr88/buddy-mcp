import type { BoxRenderable, SelectRenderable, SelectOption } from '@opentui/core';
import { Box, Select } from '@opentui/core';
import type { Renderable as OTUIRenderable } from '@opentui/core';
import { RARITY_STARS } from '@/constants.js';
import { BORDER_COLOR, HIGHLIGHT_BG, HIGHLIGHT_FG, TEXT_COLOR } from '@/tui/builder/colors.js';
import type { GalleryEntry } from './state.ts';

const MAX_NAME_WIDTH = 20;

function entriesToOptions(entries: GalleryEntry[]): SelectOption[] {
  const names = entries.map((e) => e.name);
  const species = entries.map((e) => e.bones.species);
  const nameWidth = Math.min(Math.max(...names.map((n) => n.length)), MAX_NAME_WIDTH);
  const speciesWidth = Math.max(...species.map((s) => s.length));

  return entries.map((entry, i) => {
    const dot = entry.isActive ? '●' : '○';
    const stars = RARITY_STARS[entry.bones.rarity];
    let name = names[i];
    if (name.length > nameWidth) name = name.slice(0, nameWidth - 1) + '…';
    const label = `${dot} ${name.padEnd(nameWidth)}  ${species[i].padEnd(speciesWidth)}  ${stars}`;
    return {
      name: label,
      description: '',
      value: entry.salt,
    };
  });
}

export interface ProfileListPanel {
  container: OTUIRenderable;
  select: SelectRenderable | null;
  update: (entries: GalleryEntry[], selectedIndex: number) => void;
}

export function createProfileListPanel(
  parent: OTUIRenderable,
  entries: GalleryEntry[],
  activeIndex: number,
): ProfileListPanel {
  const options = entriesToOptions(entries);

  const container = Box(
    {
      id: 'profile-list',
      borderStyle: 'rounded',
      border: true,
      borderColor: BORDER_COLOR,
      title: ' Buddies ',
      titleAlignment: 'center',
      flexDirection: 'column',
      width: '50%',
      padding: 0,
      paddingLeft: 1,
      paddingRight: 1,
    },
    Select({
      id: 'buddy-select',
      options,
      flexGrow: 1,
      selectedBackgroundColor: HIGHLIGHT_BG,
      selectedTextColor: HIGHLIGHT_FG,
      textColor: TEXT_COLOR,
      showScrollIndicator: true,
      wrapSelection: true,
      showDescription: false,
      selectedIndex: activeIndex,
    }),
  );

  parent.add(container);

  const containerRenderable = parent.findDescendantById('profile-list') as BoxRenderable;
  const select = containerRenderable?.findDescendantById('buddy-select') as SelectRenderable | null;

  // Focus the Select so it receives keyboard events immediately
  select?.focus();

  return {
    container: containerRenderable ?? (container as unknown as OTUIRenderable),
    select,
    update(newEntries: GalleryEntry[], newSelectedIndex: number) {
      if (!select) return;
      select.options = entriesToOptions(newEntries);
      select.selectedIndex = newSelectedIndex;
    },
  };
}
