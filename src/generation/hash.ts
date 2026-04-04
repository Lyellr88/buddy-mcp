import { execFileSync } from 'child_process';
import { findBunBinary } from '@/patcher/binary-finder.js';

export function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const hashCache = new Map<string, number>();

export function hashString(s: string, { useNodeHash = false } = {}): number {
  const cacheKey = `${useNodeHash ? 'fnv' : 'bun'}:${s}`;
  const cached = hashCache.get(cacheKey);
  if (cached !== undefined) return cached;

  if (useNodeHash) {
    const result = fnv1a(s);
    hashCache.set(cacheKey, result);
    return result;
  }

  try {
    const output = execFileSync(
      findBunBinary(),
      [
        '-e',
        'const s=await Bun.stdin.text();process.stdout.write(String(Number(BigInt(Bun.hash(s))&0xffffffffn)))',
      ],
      { encoding: 'utf-8', input: s, timeout: 5000 },
    );
    const h = parseInt(output.trim(), 10);
    hashCache.set(cacheKey, h);
    return h;
  } catch {
    const result = fnv1a(s);
    hashCache.set(cacheKey, result);
    return result;
  }
}
