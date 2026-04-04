import type { BoxRenderable, SelectRenderable, SelectOption } from '@opentui/core';
import { Box, Select, SelectRenderableEvents } from '@opentui/core';
import type { Renderable as OTUIRenderable } from '@opentui/core';
import {
  SPECIES,
  EYES,
  RARITIES,
  RARITY_STARS,
  RARITY_WEIGHTS,
  HATS,
  STAT_NAMES,
} from '@/constants.js';
import { renderFace } from '@/sprites/index.js';
import type { Species, Eye, Rarity, Hat, StatName } from '@/types.js';
import {
  FOCUS_BORDER,
  UNFOCUS_BORDER,
  DISABLED_BORDER,
  DISABLED_TEXT,
  HIGHLIGHT_BG,
  HIGHLIGHT_FG,
  UNFOCUS_TEXT,
} from './colors.ts';
import {
  applyRarityConstraints,
  applyDumpConstraint,
  getVisibleFields,
  type BuilderState,
  type BuilderField,
  type StatsMode,
} from './state.ts';

export interface SelectionPanel {
  container: OTUIRenderable;
  selects: Map<BuilderField, SelectRenderable>;
  focusField: (field: BuilderField) => void;
  getState: () => BuilderState;
}

// --- Option generators ---

function speciesOptions(): SelectOption[] {
  return SPECIES.map((s) => {
    const face = renderFace({ species: s, eye: '\u00B7' });
    return { name: `${s.padEnd(10)} ${face}`, description: '', value: s };
  });
}

function eyeOptions(species: Species): SelectOption[] {
  return EYES.map((e) => {
    const face = renderFace({ species, eye: e });
    return { name: `${e}  ${face}`, description: '', value: e };
  });
}

function rarityOptions(): SelectOption[] {
  return RARITIES.map((r) => ({
    name: `${r.padEnd(12)} ${RARITY_STARS[r].padEnd(6)} (${RARITY_WEIGHTS[r]}%)`,
    description: '',
    value: r,
  }));
}

function hatOptions(): SelectOption[] {
  return HATS.filter((h) => h !== 'none').map((h) => ({
    name: h,
    description: '',
    value: h,
  }));
}

function shinyOptions(): SelectOption[] {
  return [
    { name: 'No', description: '', value: false },
    { name: 'Yes  (~100x longer search)', description: '', value: true },
  ];
}

function statsModeOptions(): SelectOption[] {
  return [
    { name: 'None', description: '', value: 'none' },
    { name: 'Customize  (~20x longer search)', description: '', value: 'customize' },
  ];
}

function statOptions(exclude?: StatName): SelectOption[] {
  return STAT_NAMES.filter((s) => s !== exclude).map((s) => ({
    name: s,
    description: '',
    value: s,
  }));
}

const DEFAULT_DISABLED: SelectOption[] = [
  { name: '\u2014', description: '', value: '__disabled__' },
];

function getDisabledOptions(field: BuilderField): SelectOption[] {
  return DISABLED_OPTIONS[field] ?? DEFAULT_DISABLED;
}

const DISABLED_OPTIONS: Record<string, SelectOption[]> = {
  hat: [
    { name: 'Common rarity pets don\u2019t wear hats.', description: '', value: '__disabled__' },
    { name: 'Change Rarity above to unlock hats.', description: '', value: '__disabled__' },
  ],
  peak: [
    { name: 'Set Stats to "Customize" to pick', description: '', value: '__disabled__' },
    { name: 'your best stat.', description: '', value: '__disabled__' },
  ],
  dump: [
    { name: 'Set Stats to "Customize" to pick', description: '', value: '__disabled__' },
    { name: 'your worst stat.', description: '', value: '__disabled__' },
  ],
};

// --- Field label map ---

const FIELD_LABELS: Record<BuilderField, string> = {
  species: 'Species',
  eye: 'Eyes',
  rarity: 'Rarity',
  hat: 'Hat',
  shiny: 'Shiny',
  statsMode: 'Stats',
  peak: 'Best Stat',
  dump: 'Worst Stat',
};

// --- Styles ---

const FOCUSED_SELECT = {
  selectedBackgroundColor: HIGHLIGHT_BG,
  selectedTextColor: HIGHLIGHT_FG,
  textColor: '#CCCCCC',
  showScrollIndicator: true,
  wrapSelection: true,
  showDescription: false,
} as const;

const UNFOCUSED_SELECT = {
  selectedBackgroundColor: '#1a1a2e',
  selectedTextColor: UNFOCUS_TEXT,
  textColor: UNFOCUS_TEXT,
  showScrollIndicator: false,
  wrapSelection: true,
  showDescription: false,
} as const;

// --- Section heights (minimum rows for the select content) ---

const SECTION_HEIGHTS: Record<BuilderField, number> = {
  species: 5,
  eye: 6,
  rarity: 5,
  hat: 5,
  shiny: 2,
  statsMode: 2,
  peak: 3,
  dump: 3,
};

// --- Build one section ---

function buildSection(field: BuilderField, options: SelectOption[]): ReturnType<typeof Box> {
  const h = SECTION_HEIGHTS[field];
  return Box(
    {
      id: `section-${field}`,
      border: true,
      borderStyle: 'rounded',
      borderColor: UNFOCUS_BORDER,
      title: ` ${FIELD_LABELS[field]} `,
      titleAlignment: 'left',
      flexDirection: 'column',
      height: h + 2, // fixed height: content + top/bottom border
      flexShrink: 0,
    },
    Select({
      id: `select-${field}`,
      options,
      height: h,
      ...UNFOCUSED_SELECT,
    }),
  );
}

// --- Main panel ---

export function createSelectionPanel(
  parent: OTUIRenderable,
  initialState: BuilderState,
  onChange: (state: BuilderState) => void,
): SelectionPanel {
  const state = { ...initialState };
  const selects = new Map<BuilderField, SelectRenderable>();
  const sectionBoxes = new Map<BuilderField, BoxRenderable>();
  let currentFocusedField: BuilderField | null = null;

  // Track which fields are logically active (not disabled)
  const fieldEnabled = new Map<BuilderField, boolean>();

  const visibleFields = getVisibleFields(state);
  const allFields: BuilderField[] = [
    'species',
    'eye',
    'rarity',
    'hat',
    'shiny',
    'statsMode',
    'peak',
    'dump',
  ];

  // Initial options -- disabled fields get placeholder
  function getInitialOptions(field: BuilderField): SelectOption[] {
    const active = visibleFields.includes(field);
    fieldEnabled.set(field, active);
    if (!active) return getDisabledOptions(field);
    switch (field) {
      case 'species':
        return speciesOptions();
      case 'eye':
        return eyeOptions(state.species);
      case 'rarity':
        return rarityOptions();
      case 'hat':
        return hatOptions();
      case 'shiny':
        return shinyOptions();
      case 'statsMode':
        return statsModeOptions();
      case 'peak':
        return statOptions();
      case 'dump':
        return statOptions(state.peak);
    }
  }

  const container = Box(
    {
      id: 'selection-panel',
      flexDirection: 'column',
      flexGrow: 1,
      overflow: 'hidden',
      padding: 0,
      paddingLeft: 1,
      paddingRight: 1,
      paddingTop: 1,
      gap: 0,
    },
    Box(
      {
        id: 'selection-content',
        flexDirection: 'column',
        position: 'relative',
        top: 0,
      },
      ...allFields.map((f) => buildSection(f, getInitialOptions(f))),
    ),
  );

  parent.add(container);

  // Resolve renderable references
  const containerRenderable = parent.findDescendantById('selection-panel') as
    | BoxRenderable
    | undefined;
  const contentRenderable = parent.findDescendantById('selection-content') as
    | BoxRenderable
    | undefined;

  for (const field of allFields) {
    const selectEl = containerRenderable?.findDescendantById(`select-${field}`) as SelectRenderable;
    const sectionEl = containerRenderable?.findDescendantById(`section-${field}`) as BoxRenderable;
    if (selectEl) selects.set(field, selectEl);
    if (sectionEl) sectionBoxes.set(field, sectionEl);
  }

  // Set initial selection indices for enabled fields
  const speciesSelect = selects.get('species');
  const eyeSelect = selects.get('eye');
  const raritySelect = selects.get('rarity');
  const hatSelect = selects.get('hat');
  const dumpSelect = selects.get('dump');

  const speciesIdx = SPECIES.indexOf(state.species);
  if (speciesIdx >= 0) speciesSelect?.setSelectedIndex(speciesIdx);

  const eyeIdx = EYES.indexOf(state.eye);
  if (eyeIdx >= 0) eyeSelect?.setSelectedIndex(eyeIdx);

  const rarityIdx = RARITIES.indexOf(state.rarity);
  if (rarityIdx >= 0) raritySelect?.setSelectedIndex(rarityIdx);

  if (state.hat !== 'none' && fieldEnabled.get('hat')) {
    const hatsNoNone = HATS.filter((h) => h !== 'none');
    const hatIdx = hatsNoNone.indexOf(state.hat);
    if (hatIdx >= 0) hatSelect?.setSelectedIndex(hatIdx);
  }

  // Apply initial disabled styling
  for (const field of allFields) {
    if (!fieldEnabled.get(field)) {
      applyDisabledStyle(field);
    }
  }

  // --- Styling ---

  function applyFocusStyle(field: BuilderField): void {
    const box = sectionBoxes.get(field);
    const sel = selects.get(field);
    if (box) {
      box.borderColor = FOCUS_BORDER;
      box.title = ` \u25B6 ${FIELD_LABELS[field]} `;
    }
    if (sel) {
      sel.selectedBackgroundColor = FOCUSED_SELECT.selectedBackgroundColor;
      sel.selectedTextColor = FOCUSED_SELECT.selectedTextColor;
      sel.textColor = FOCUSED_SELECT.textColor;
      sel.showScrollIndicator = true;
    }
  }

  function applyUnfocusStyle(field: BuilderField): void {
    const box = sectionBoxes.get(field);
    const sel = selects.get(field);
    if (box) {
      box.borderColor = UNFOCUS_BORDER;
      box.title = ` ${FIELD_LABELS[field]} `;
    }
    if (sel) {
      sel.selectedBackgroundColor = UNFOCUSED_SELECT.selectedBackgroundColor;
      sel.selectedTextColor = UNFOCUSED_SELECT.selectedTextColor;
      sel.textColor = UNFOCUSED_SELECT.textColor;
      sel.showScrollIndicator = false;
    }
  }

  function applyDisabledStyle(field: BuilderField): void {
    const box = sectionBoxes.get(field);
    const sel = selects.get(field);
    if (box) {
      box.borderColor = DISABLED_BORDER;
      box.title = ` ${FIELD_LABELS[field]} `;
    }
    if (sel) {
      sel.selectedBackgroundColor = '#111111';
      sel.selectedTextColor = DISABLED_TEXT;
      sel.textColor = DISABLED_TEXT;
      sel.showScrollIndicator = false;
    }
  }

  function enableField(field: BuilderField): void {
    if (fieldEnabled.get(field)) return;
    fieldEnabled.set(field, true);
    const sel = selects.get(field);
    if (!sel) return;
    // Restore real options
    switch (field) {
      case 'hat':
        sel.options = hatOptions();
        break;
      case 'peak':
        sel.options = statOptions();
        break;
      case 'dump':
        sel.options = statOptions(state.peak);
        break;
    }
    applyUnfocusStyle(field);
  }

  function disableField(field: BuilderField): void {
    if (!fieldEnabled.get(field)) return;
    fieldEnabled.set(field, false);
    const sel = selects.get(field);
    if (!sel) return;
    sel.options = getDisabledOptions(field);
    applyDisabledStyle(field);
  }

  // Manual scroll: shift content box so the focused section is visible
  let scrollOffset = 0;

  function scrollToField(field: BuilderField): void {
    if (!contentRenderable) return;
    // Use terminal rows minus chrome (outer border + help bar + padding ~ 4 rows)
    // Outer border (2) + help bar (1) + padding (1)
    const CHROME_HEIGHT = 4;
    const viewportHeight = (process.stdout.rows ?? 40) - CHROME_HEIGHT;
    if (viewportHeight <= 0) return;

    // Calculate total content height and target section's Y position
    let targetY = 0;
    let totalHeight = 0;
    for (const f of allFields) {
      const h = SECTION_HEIGHTS[f] + 2;
      if (f === field) targetY = totalHeight;
      totalHeight += h;
    }
    const sectionH = SECTION_HEIGHTS[field] + 2;

    // No scrolling needed if everything fits
    if (totalHeight <= viewportHeight) {
      scrollOffset = 0;
      contentRenderable.top = 0;
      return;
    }

    // If section is above the viewport, scroll up
    if (targetY < scrollOffset) {
      scrollOffset = targetY;
    }
    // If section bottom is below the viewport, scroll down
    else if (targetY + sectionH > scrollOffset + viewportHeight) {
      scrollOffset = targetY + sectionH - viewportHeight;
    }

    // Clamp
    const maxScroll = Math.max(0, totalHeight - viewportHeight);
    scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));

    contentRenderable.top = -scrollOffset;
  }

  function focusField(field: BuilderField): void {
    if (currentFocusedField && currentFocusedField !== field) {
      if (fieldEnabled.get(currentFocusedField)) {
        applyUnfocusStyle(currentFocusedField);
      } else {
        applyDisabledStyle(currentFocusedField);
      }
    }
    currentFocusedField = field;
    applyFocusStyle(field);
    const sel = selects.get(field);
    if (sel) sel.focus();
    scrollToField(field);
  }

  // --- Change handlers ---

  function emitChange(): void {
    onChange({ ...state });
  }

  function updateFieldStates(): void {
    const active = getVisibleFields(state);
    for (const field of allFields) {
      if (active.includes(field)) {
        enableField(field);
      } else {
        disableField(field);
      }
    }
  }

  // Wire up SELECTION_CHANGED events
  speciesSelect?.on(
    SelectRenderableEvents.SELECTION_CHANGED,
    (_index: number, option: SelectOption) => {
      state.species = option.value as Species;
      if (eyeSelect) {
        eyeSelect.options = eyeOptions(state.species);
        const idx = EYES.indexOf(state.eye);
        if (idx >= 0) eyeSelect.setSelectedIndex(idx);
      }
      emitChange();
    },
  );

  eyeSelect?.on(
    SelectRenderableEvents.SELECTION_CHANGED,
    (_index: number, option: SelectOption) => {
      state.eye = option.value as Eye;
      emitChange();
    },
  );

  raritySelect?.on(
    SelectRenderableEvents.SELECTION_CHANGED,
    (_index: number, option: SelectOption) => {
      state.rarity = option.value as Rarity;
      const constrained = applyRarityConstraints(state);
      state.hat = constrained.hat;
      updateFieldStates();
      emitChange();
    },
  );

  hatSelect?.on(
    SelectRenderableEvents.SELECTION_CHANGED,
    (_index: number, option: SelectOption) => {
      if (option.value === '__disabled__') return;
      state.hat = option.value as Hat;
      emitChange();
    },
  );

  selects
    .get('shiny')
    ?.on(SelectRenderableEvents.SELECTION_CHANGED, (_index: number, option: SelectOption) => {
      state.shiny = option.value as boolean;
      emitChange();
    });

  selects
    .get('statsMode')
    ?.on(SelectRenderableEvents.SELECTION_CHANGED, (_index: number, option: SelectOption) => {
      state.statsMode = option.value as StatsMode;
      updateFieldStates();
      emitChange();
    });

  selects
    .get('peak')
    ?.on(SelectRenderableEvents.SELECTION_CHANGED, (_index: number, option: SelectOption) => {
      if (option.value === '__disabled__') return;
      state.peak = option.value as StatName;
      const constrained = applyDumpConstraint(state);
      state.dump = constrained.dump;
      if (dumpSelect && fieldEnabled.get('dump')) {
        dumpSelect.options = statOptions(state.peak);
        const dumpNames = STAT_NAMES.filter((s) => s !== state.peak);
        const dIdx = dumpNames.indexOf(state.dump);
        if (dIdx >= 0) dumpSelect.setSelectedIndex(dIdx);
      }
      emitChange();
    });

  dumpSelect?.on(
    SelectRenderableEvents.SELECTION_CHANGED,
    (_index: number, option: SelectOption) => {
      if (option.value === '__disabled__') return;
      state.dump = option.value as StatName;
      emitChange();
    },
  );

  return {
    container: containerRenderable ?? (container as unknown as OTUIRenderable),
    selects,
    focusField,
    getState: () => ({ ...state }),
  };
}
