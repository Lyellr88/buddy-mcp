import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const tempDir = mkdtempSync(join(tmpdir(), 'buddy-mcp-hooks-'));
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>();
  return { ...actual, homedir: () => tempDir };
});

const { isHookInstalled, installHook, removeHook, getClaudeSettings } =
  await import('@/config/hooks.js');

afterEach(() => {
  try {
    rmSync(join(tempDir, '.claude'), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('hooks', () => {
  it('isHookInstalled returns false when no settings exist', () => {
    expect(isHookInstalled()).toBe(false);
  });

  it('installHook creates settings with hook entry', () => {
    installHook('/path/to/dist/mcp/index.js');
    expect(isHookInstalled()).toBe(true);

    const settings = getClaudeSettings();
    expect(settings.hooks?.SessionStart).toHaveLength(1);
    expect(settings.hooks?.SessionStart?.[0].hooks[0].command).toContain('apply --silent');
    expect(settings.hooks?.SessionStart?.[0].hooks[0].command).toContain('index.js');
  });

  it('installHook is idempotent', () => {
    installHook('/path/to/dist/mcp/index.js');
    installHook('/path/to/dist/mcp/index.js');
    const settings = getClaudeSettings();
    expect(settings.hooks?.SessionStart).toHaveLength(1);
  });

  it('removeHook removes the hook entry', () => {
    installHook('/path/to/dist/mcp/index.js');
    expect(isHookInstalled()).toBe(true);
    removeHook();
    expect(isHookInstalled()).toBe(false);
  });

  it('removeHook cleans up empty hooks object', () => {
    installHook('/path/to/dist/mcp/index.js');
    removeHook();
    const settings = getClaudeSettings();
    expect(settings.hooks).toBeUndefined();
  });

  it('removeHook is safe when no hook exists', () => {
    expect(() => removeHook()).not.toThrow();
  });

  it('creates ~/.claude directory if missing', () => {
    installHook('/path/to/dist/mcp/index.js');
    const raw = readFileSync(join(tempDir, '.claude', 'settings.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.hooks.SessionStart).toBeDefined();
  });

  it('preserves other settings when installing hook', () => {
    // Create settings with existing data
    mkdirSync(join(tempDir, '.claude'), { recursive: true });
    const existing = { someOtherSetting: true };
    writeFileSync(
      join(tempDir, '.claude', 'settings.json'),
      JSON.stringify(existing, null, 2) + '\n',
    );

    installHook('/path/to/dist/mcp/index.js');
    const settings = getClaudeSettings();
    expect((settings as Record<string, unknown>).someOtherSetting).toBe(true);
    expect(isHookInstalled()).toBe(true);
  });
});
