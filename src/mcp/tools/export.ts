import { writeFileSync } from 'fs';
import { resolve } from 'path';

import type { Bones, ProfileData } from '@/types.js';
import { renderSprite } from '@/sprites/render.js';
import { S, dynamicTools } from '../state.js';

// SVG rendering constants
const FONT_SIZE = 14;
const CHAR_WIDTH = 8.43; // monospace character width at font-size 14
const LINE_HEIGHT = 20;
const PAD_X = 24;
const PAD_Y = 16;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statBar(v: number): string {
  return '█'.repeat(Math.floor(v / 10)) + '░'.repeat(10 - Math.floor(v / 10));
}

function sanitizeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'buddy'
  );
}

function buildSvg(lines: string[]): string {
  const maxLen = Math.max(...lines.map((l) => l.length), 1);
  const width = Math.ceil(maxLen * CHAR_WIDTH) + PAD_X * 2;
  const height = Math.ceil(lines.length * LINE_HEIGHT) + PAD_Y * 2;

  const tspans = lines
    .map((line, i) => {
      const y = PAD_Y + (i + 1) * LINE_HEIGHT;
      return `    <tspan x="${PAD_X}" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `  <rect width="${width}" height="${height}" fill="#1e1e2e" rx="10"/>`,
    `  <text font-family="'Cascadia Code','Fira Code','Courier New',monospace" font-size="${FONT_SIZE}" fill="#cdd6f4" xml:space="preserve">`,
    tspans,
    `  </text>`,
    `</svg>`,
  ].join('\n');
}

function buildCardLines(b: ProfileData): string[] {
  const dg = b.stats['DEBUGGING'] ?? 0;
  const pt = b.stats['PATIENCE'] ?? 0;
  const ch = b.stats['CHAOS'] ?? 0;
  const ws = b.stats['WISDOM'] ?? 0;
  const sn = b.stats['SNARK'] ?? 0;
  const shinyTag = b.shiny ? ' ✨ SHINY ✨' : '';
  const hatLine = b.hat && b.hat !== 'none' ? `│  ${('Hat: ' + b.hat).padEnd(34)}  │` : null;

  const bones: Bones = {
    species: b.species,
    rarity: b.rarity,
    eye: b.eye,
    hat: b.hat,
    shiny: b.shiny,
    stats: b.stats,
  };
  const spriteLines = renderSprite(bones, 0, false).map((line) => `│  ${line.padEnd(34)}  │`);

  const bio =
    b.personality ??
    `A ${b.rarity.charAt(0).toUpperCase() + b.rarity.slice(1)} ${b.species} companion.`;
  const bioLines = bio.match(/.{1,32}(\s|$)/g)?.map((l) => `│  "${l.trim().padEnd(32)}"  │`) ?? [];

  return [
    '╭──────────────────────────────────────╮',
    `│ ${shinyTag.padEnd(36)} │`,
    `│  ★★ ${b.rarity.toUpperCase().padEnd(14)} ${b.species.toUpperCase().padStart(15)}  │`,
    '│                                      │',
    ...(hatLine ? [hatLine] : []),
    ...spriteLines,
    '│                                      │',
    `│  ${(b.name ?? 'Buddy').padEnd(34)}  │`,
    '│                                      │',
    ...bioLines,
    '│                                      │',
    `│  DEBUGGING  ${statBar(dg)}  ${String(dg).padStart(2)}           │`,
    `│  PATIENCE   ${statBar(pt)}  ${String(pt).padStart(2)}           │`,
    `│  CHAOS      ${statBar(ch)}  ${String(ch).padStart(2)}           │`,
    `│  WISDOM     ${statBar(ws)}  ${String(ws).padStart(2)}           │`,
    `│  SNARK      ${statBar(sn)}  ${String(sn).padStart(2)}           │`,
    '│                                      │',
    '╰──────────────────────────────────────╯',
  ];
}

const exportBuddyCardTool = {
  tool: {
    name: 'export_buddy_card',
    description: 'Export your full buddy card as an SVG image file.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Output file path (default: ./buddy-{name}-card.svg in current directory)',
        },
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    S.petBuddyStreak = 0; // Reset pet streak on non-pet-buddy tool
    S.lastToolCalled = 'export_buddy_card';
    if (!S.currentBuddy) return 'Initialize a buddy first!';
    const b = S.currentBuddy;
    const outputPath = args['path']
      ? resolve(String(args['path']))
      : resolve(`buddy-${sanitizeName(b.name ?? 'buddy')}-card.svg`);
    try {
      writeFileSync(outputPath, buildSvg(buildCardLines(b)));
      return `✅ Card exported to: ${outputPath}`;
    } catch (err: unknown) {
      return `❌ Export failed: ${(err as Error).message}`;
    }
  },
};

const exportBuddySpriteTool = {
  tool: {
    name: 'export_buddy_sprite',
    description: 'Export just the buddy ASCII sprite as an SVG image file.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Output file path (default: ./buddy-{name}-sprite.svg in current directory)',
        },
      },
    },
  },
  handler: async (args: Record<string, unknown>) => {
    S.petBuddyStreak = 0; // Reset pet streak on non-pet-buddy tool
    S.lastToolCalled = 'export_buddy_sprite';
    if (!S.currentBuddy) return 'Initialize a buddy first!';
    const b = S.currentBuddy;
    const bones: Bones = {
      species: b.species,
      rarity: b.rarity,
      eye: b.eye,
      hat: b.hat,
      shiny: b.shiny,
      stats: b.stats,
    };
    const lines = renderSprite(bones, 0, false);
    const outputPath = args['path']
      ? resolve(String(args['path']))
      : resolve(`buddy-${sanitizeName(b.name ?? 'buddy')}-sprite.svg`);
    try {
      writeFileSync(outputPath, buildSvg(lines));
      return `✅ Sprite exported to: ${outputPath}`;
    } catch (err: unknown) {
      return `❌ Export failed: ${(err as Error).message}`;
    }
  },
};

// --- Register export tools ---

dynamicTools.set('export_buddy_card', {
  ...exportBuddyCardTool,
  _def: {
    toolName: 'export_buddy_card',
    description: 'Core: Export Card SVG',
    logic: 'N/A',
    scope: 'global',
  },
});
dynamicTools.set('export_buddy_sprite', {
  ...exportBuddySpriteTool,
  _def: {
    toolName: 'export_buddy_sprite',
    description: 'Core: Export Sprite SVG',
    logic: 'N/A',
    scope: 'global',
  },
});
