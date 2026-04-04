import { describe, it, expect } from 'vitest';
import { findAllOccurrences, isNodeRuntime, getMinSaltCount } from '@/patcher/salt-ops.js';

describe('findAllOccurrences', () => {
  it('finds all occurrences of a string in a buffer', () => {
    const buf = Buffer.from('abc-friend-2026-401-xyz-friend-2026-401-end');
    const offsets = findAllOccurrences(buf, 'friend-2026-401');
    expect(offsets).toEqual([4, 24]);
  });

  it('returns empty array when not found', () => {
    const buf = Buffer.from('no match here');
    expect(findAllOccurrences(buf, 'friend-2026-401')).toEqual([]);
  });

  it('handles single occurrence', () => {
    const buf = Buffer.from('prefix-friend-2026-401-suffix');
    const offsets = findAllOccurrences(buf, 'friend-2026-401');
    expect(offsets).toHaveLength(1);
  });

  it('handles adjacent occurrences', () => {
    const buf = Buffer.from('aaaa');
    const offsets = findAllOccurrences(buf, 'aa');
    expect(offsets).toEqual([0, 1, 2]);
  });

  it('handles empty buffer', () => {
    expect(findAllOccurrences(Buffer.alloc(0), 'test')).toEqual([]);
  });
});

describe('isNodeRuntime', () => {
  it('returns true for .js files', () => {
    expect(isNodeRuntime('/path/to/cli.js')).toBe(true);
  });

  it('returns true for .mjs files', () => {
    expect(isNodeRuntime('/path/to/cli.mjs')).toBe(true);
  });

  it('returns false for compiled binaries', () => {
    expect(isNodeRuntime('/path/to/claude')).toBe(false);
    expect(isNodeRuntime('/path/to/claude.exe')).toBe(false);
  });

  it('returns false for .ts files', () => {
    expect(isNodeRuntime('/path/to/cli.ts')).toBe(false);
  });
});

describe('getMinSaltCount', () => {
  it('returns 1 for .js files (Node runtime)', () => {
    expect(getMinSaltCount('/path/to/cli.js')).toBe(1);
  });

  it('returns 1 for .mjs files (Node runtime)', () => {
    expect(getMinSaltCount('/path/to/cli.mjs')).toBe(1);
  });

  it('returns 3 for compiled binaries', () => {
    expect(getMinSaltCount('/path/to/claude')).toBe(3);
  });

  it('returns 3 for .exe files', () => {
    expect(getMinSaltCount('/path/to/claude.exe')).toBe(3);
  });
});
