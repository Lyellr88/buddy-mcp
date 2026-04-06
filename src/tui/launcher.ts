#!/usr/bin/env node
import { spawnSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, 'cli.js');
const args = process.argv.slice(2);

function hasBun(): boolean {
  try {
    execSync('bun --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (hasBun()) {
  const result = spawnSync('bun', [cliPath, ...args], { stdio: 'inherit' });
  process.exit(result.status ?? 0);
} else {
  await import('./cli.js');
}
