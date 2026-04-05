import { describe, it, expect } from 'vitest';
import {
  RARITY_HEX,
  BORDER_COLOR,
  FOCUS_BORDER,
  UNFOCUS_BORDER,
  HIGHLIGHT_BG,
  HIGHLIGHT_FG,
  UNFOCUS_TEXT,
  DISABLED_BORDER,
  DISABLED_TEXT,
  DIM_COLOR,
  TITLE_COLOR,
  LABEL_COLOR,
} from '@/tui/builder/colors.js';
import { RARITIES } from '@/constants.js';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

describe('RARITY_HEX', () => {
  it('has an entry for every rarity', () => {
    for (const rarity of RARITIES) {
      expect(RARITY_HEX[rarity]).toBeDefined();
    }
  });

  it('all values are valid hex color strings', () => {
    for (const rarity of RARITIES) {
      expect(RARITY_HEX[rarity]).toMatch(HEX_PATTERN);
    }
  });
});

describe('theme constants', () => {
  const colors = {
    BORDER_COLOR,
    FOCUS_BORDER,
    UNFOCUS_BORDER,
    DISABLED_BORDER,
    DISABLED_TEXT,
    HIGHLIGHT_BG,
    HIGHLIGHT_FG,
    UNFOCUS_TEXT,
    DIM_COLOR,
    TITLE_COLOR,
    LABEL_COLOR,
  };

  for (const [name, value] of Object.entries(colors)) {
    it(`${name} is valid hex`, () => {
      expect(value).toMatch(HEX_PATTERN);
    });
  }

  it('FOCUS_BORDER is visually distinct from UNFOCUS_BORDER', () => {
    expect(FOCUS_BORDER).not.toBe(UNFOCUS_BORDER);
  });
});
