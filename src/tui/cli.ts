#!/usr/bin/env node
import { runStartScreen } from './commands/start-screen.js';
import { runRestore } from './commands/restore.js';
import { runRehatch } from './commands/rehatch.js';
import { runCurrent } from './commands/current.js';
import { runPreview } from './commands/preview.js';
import { runShare } from './commands/share.js';

const cmd = process.argv[2];

const dispatch: Record<string, () => Promise<void>> = {
  restore: runRestore,
  rehatch: runRehatch,
  current: runCurrent,
  preview: () => runPreview({}),
  share: runShare,
};

const handler = cmd ? dispatch[cmd] : null;

if (cmd && !handler) {
  console.error(`Unknown command: ${cmd}`);
  console.error('Available commands: restore, rehatch, current, preview, share');
  process.exit(1);
}

(handler ?? runStartScreen)().catch((err: unknown) => {
  console.error((err as Error).message);
  process.exit(1);
});
