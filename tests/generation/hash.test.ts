import { describe, it, expect } from 'vitest';
import { fnv1a, hashString } from '@/generation/hash.js';

describe('fnv1a', () => {
  it('returns a 32-bit unsigned integer', () => {
    const h = fnv1a('hello');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it('produces deterministic output', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'));
    expect(fnv1a('test-user-id')).toBe(fnv1a('test-user-id'));
  });

  it('produces different hashes for different inputs', () => {
    expect(fnv1a('hello')).not.toBe(fnv1a('world'));
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'));
  });

  it('handles empty string', () => {
    const h = fnv1a('');
    expect(h).toBe(2166136261); // FNV offset basis
  });

  it('handles special characters', () => {
    const h = fnv1a('user-123-αβγ');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('hashString', () => {
  it('uses FNV-1a when useNodeHash is true', () => {
    const result = hashString('test-key', { useNodeHash: true });
    expect(result).toBe(fnv1a('test-key'));
  });

  it('caches results', () => {
    const a = hashString('cache-test-key', { useNodeHash: true });
    const b = hashString('cache-test-key', { useNodeHash: true });
    expect(a).toBe(b);
  });

  it('different keys produce different hashes', () => {
    const a = hashString('key-a', { useNodeHash: true });
    const b = hashString('key-b', { useNodeHash: true });
    expect(a).not.toBe(b);
  });
});
