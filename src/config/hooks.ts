import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

function buildHookCommand(scriptPath: string): string {
  return `node "${scriptPath}" apply --silent`;
}

interface HookEntry {
  type: string;
  command: string;
}

interface MatcherEntry {
  matcher: string;
  hooks: HookEntry[];
}

interface ClaudeSettings {
  hooks?: {
    SessionStart?: MatcherEntry[];
    [key: string]: MatcherEntry[] | undefined;
  };
  [key: string]: unknown;
}

export function getClaudeSettings(): ClaudeSettings {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')) as ClaudeSettings;
  } catch {
    return {};
  }
}

export function saveClaudeSettings(settings: ClaudeSettings): void {
  const dir = join(homedir(), '.claude');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', { mode: 0o600 });
}

function findHookEntry(matchers: MatcherEntry[] | undefined): MatcherEntry | null {
  if (!Array.isArray(matchers)) return null;
  return (
    matchers.find(
      (m) => Array.isArray(m.hooks) && m.hooks.some((h) => h.command.includes('apply --silent') && h.command.includes('index.js')),
    ) ?? null
  );
}

export function isHookInstalled(): boolean {
  const settings = getClaudeSettings();
  return findHookEntry(settings.hooks?.SessionStart) !== null;
}

export function installHook(scriptPath: string): void {
  const settings = getClaudeSettings();
  if (!settings.hooks) settings.hooks = {};
  if (!Array.isArray(settings.hooks.SessionStart)) settings.hooks.SessionStart = [];

  if (!findHookEntry(settings.hooks.SessionStart)) {
    settings.hooks.SessionStart.push({
      matcher: '',
      hooks: [{ type: 'command', command: buildHookCommand(scriptPath) }],
    });
  }

  saveClaudeSettings(settings);
}

export function removeHook(): void {
  const settings = getClaudeSettings();
  if (!settings.hooks?.SessionStart) return;
  settings.hooks.SessionStart = settings.hooks.SessionStart.filter(
    (m) => !Array.isArray(m.hooks) || !m.hooks.some((h) => h.command.includes('apply --silent') && h.command.includes('index.js')),
  );
  if (settings.hooks.SessionStart.length === 0) delete settings.hooks.SessionStart;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;
  saveClaudeSettings(settings);
}
