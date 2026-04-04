import { ISSUE_URL } from '@/constants.js';
import { BORDER_COLOR, DIM_COLOR, FOCUS_BORDER } from '@/tui/builder/colors.js';

export type StartAction = 'build' | 'presets' | 'buddies';

interface MenuEntry {
  value: StartAction;
  icon: string;
  title: string;
  desc: string;
}

// figlet-style block letters (hand-made, compact)
const LOGO = [
  '  __ _ _ __  _   _      _               _     _       ',
  " / _` | '_ \\| | | |    | |__  _   _  __| | __| |_   _ ",
  "| (_| | | | | |_| |____| '_ \\| | | |/ _` |/ _` | | | |",
  ' \\__,_|_| |_|\\__, |____|_.__/|_|_|_|\\__,_|\\__,_|\\__, |',
  '             |___/                               |___/ ',
].join('\n');

export async function runStartTUI(buddyCount: number): Promise<StartAction | null> {
  const otui = await import('@opentui/core');
  const { createCliRenderer, Box, Text } = otui;
  type TextRenderableType = InstanceType<typeof otui.TextRenderable>;

  let renderer: Awaited<ReturnType<typeof createCliRenderer>> | null = null;

  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: false,
      screenMode: 'alternate-screen',
    });

    const r = renderer;

    return await new Promise<StartAction | null>((resolve) => {
      let resolved = false;
      let selected = 0;

      const entries: MenuEntry[] = [
        {
          value: 'build',
          icon: '⚡',
          title: 'Build your own',
          desc: 'Customize species, rarity, eyes, hat, and stats',
        },
        {
          value: 'presets',
          icon: '★',
          title: 'Browse presets',
          desc: 'Pick from curated themed builds with live preview',
        },
      ];

      if (buddyCount > 0) {
        entries.push({
          value: 'buddies',
          icon: '♥',
          title: `Saved buddies (${buddyCount})`,
          desc: 'Switch between your saved pets',
        });
      }

      const handleCtrlC = (key: { ctrl?: boolean; name?: string }) => {
        if (key.ctrl && key.name === 'c') finish(null);
      };

      function finish(result: StartAction | null): void {
        if (resolved) return;
        resolved = true;
        r.keyInput.removeListener('keypress', handleCtrlC);
        r.keyInput.removeListener('keypress', handleKeyPress);
        r.destroy();
        renderer = null;
        resolve(result);
      }

      const cardTexts: { title: TextRenderableType; desc: TextRenderableType }[] = [];

      function renderCards(): void {
        for (let i = 0; i < entries.length; i++) {
          const isSelected = i === selected;
          const card = cardTexts[i];
          if (!card) continue;

          const entry = entries[i];
          const pointer = isSelected ? '▸' : ' ';

          card.title.content = `${pointer}  ${entry.icon}  ${entry.title}`;
          card.title.fg = isSelected ? '#ffffff' : '#555555';

          card.desc.content = `      ${entry.desc}`;
          card.desc.fg = isSelected ? '#888888' : '#333333';
        }
      }

      const rootBox = Box(
        {
          id: 'root',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          borderStyle: 'rounded',
          border: true,
          borderColor: BORDER_COLOR,
          padding: 0,
          justifyContent: 'center',
          alignItems: 'center',
        },

        // Large ASCII logo
        Text({
          content: LOGO,
          fg: FOCUS_BORDER,
          height: 5,
        }),
        Text({
          content: 'Hack Claude Code to get any buddy you want',
          fg: DIM_COLOR,
          height: 1,
        }),

        Text({ content: '', height: 2 }),

        // Menu cards — inside a fixed-width box for alignment
        Box(
          {
            id: 'menu-container',
            flexDirection: 'column',
            width: 56,
            padding: 0,
          },
          ...entries.flatMap((_entry, i) => {
            const titleWidget = Text({
              id: `card-title-${i}`,
              content: '',
              height: 1,
            });
            const descWidget = Text({
              id: `card-desc-${i}`,
              content: '',
              height: 1,
            });
            const widgets = [titleWidget, descWidget];
            if (i < entries.length - 1) {
              widgets.push(Text({ content: '', height: 1 }));
            }
            return widgets;
          }),
        ),

        Text({ content: '', height: 2 }),

        // Help bar
        Text({
          content: '↑↓ navigate    Enter select    Esc quit',
          fg: DIM_COLOR,
          height: 1,
        }),
      );

      r.root.add(rootBox);

      for (let i = 0; i < entries.length; i++) {
        const title = r.root.findDescendantById(`card-title-${i}`) as TextRenderableType | null;
        const desc = r.root.findDescendantById(`card-desc-${i}`) as TextRenderableType | null;
        if (title && desc) {
          cardTexts.push({ title, desc });
        }
      }

      renderCards();

      function handleKeyPress(key: { name?: string }): void {
        if (key.name === 'up') {
          selected = (selected - 1 + entries.length) % entries.length;
          renderCards();
        } else if (key.name === 'down') {
          selected = (selected + 1) % entries.length;
          renderCards();
        } else if (key.name === 'return') {
          finish(entries[selected].value);
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
    console.error(`  Start screen error: ${(err as Error).message}`);
    console.error(`  If this persists, please report at: ${ISSUE_URL}`);
    return null;
  }
}
