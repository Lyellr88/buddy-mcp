import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';
import type { DesiredTraits, FinderResult, FinderProgress } from '@/types.js';
import { diagnostics } from '@/constants.js';
import { findBunBinary } from '@/patcher/binary-finder.js';
import { isNodeRuntime } from '@/patcher/salt-ops.js';
import { estimateAttempts } from './estimator.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Support both source (.ts via bun) and compiled (.js via node) paths
const WORKER_PATH = existsSync(join(__dirname, 'worker.ts'))
  ? join(__dirname, 'worker.ts')
  : join(__dirname, 'worker.js');

function getCoreCount(): number {
  if (typeof os.availableParallelism === 'function') return os.availableParallelism();
  return os.cpus().length || 4;
}

interface FindSaltOptions {
  onProgress?: (progress: FinderProgress) => void;
  binaryPath?: string;
}

export function findSalt(
  userId: string,
  desired: DesiredTraits,
  { onProgress, binaryPath }: FindSaltOptions = {},
): Promise<FinderResult> {
  const expected = estimateAttempts(desired);

  const useNodeHash = binaryPath ? isNodeRuntime(binaryPath) : false;
  const runtime = useNodeHash ? process.execPath : findBunBinary();
  const numWorkers = Math.max(1, Math.min(getCoreCount(), 8));

  return new Promise((resolve, reject) => {
    const args = [
      WORKER_PATH,
      userId,
      desired.species,
      desired.rarity,
      desired.eye,
      desired.hat,
      String(desired.shiny ?? false),
      desired.peak ?? 'any',
      desired.dump ?? 'any',
    ];

    if (useNodeHash) {
      args.push('--fnv1a');
    }

    const effectiveExpected = Math.ceil(expected / numWorkers);
    const timeout = Math.max(600000, Math.ceil(effectiveExpected / 50_000_000) * 60_000 + 600_000);

    const children: ReturnType<typeof spawn>[] = [];
    const workerAttempts = new Array<number>(numWorkers).fill(0);
    const workerStdout = new Array<string>(numWorkers).fill('');
    const workerStderr = new Array<string>(numWorkers).fill('');
    let resolved = false;
    let exited = 0;

    function killAll(): void {
      for (const child of children) {
        try {
          child.kill();
        } catch {
          /* already dead */
        }
      }
    }

    for (let i = 0; i < numWorkers; i++) {
      const child = spawn(runtime, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout,
      });

      child.stdout?.on('data', (chunk: Buffer) => {
        workerStdout[i] += chunk.toString();
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        workerStderr[i] += text;
        if (!onProgress || resolved) return;

        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const progress = JSON.parse(line) as {
              info?: string;
              attempts?: number;
              elapsed?: number;
            };
            if (progress.info) return;
            workerAttempts[i] = progress.attempts ?? 0;
            const totalAttempts = workerAttempts.reduce((a, b) => a + b, 0);
            const elapsed = progress.elapsed ?? 0;
            const rate = totalAttempts / (elapsed / 1000);
            const pct = Math.min(100, (totalAttempts / expected) * 100);
            const remaining = Math.max(0, expected - totalAttempts);
            const eta = rate > 0 ? remaining / rate : Infinity;
            onProgress({
              attempts: totalAttempts,
              elapsed,
              rate,
              expected,
              pct,
              eta,
              workers: numWorkers,
            });
          } catch {
            // Not JSON — error message, captured in stderr
          }
        }
      });

      child.on('close', (code, signal) => {
        exited++;
        if (resolved) return;

        if (code === 0 && workerStdout[i].trim()) {
          resolved = true;
          killAll();
          try {
            const result = JSON.parse(workerStdout[i].trim()) as FinderResult;
            workerAttempts[i] = result.attempts;
            const totalAttempts = workerAttempts.reduce((a, b) => a + b, 0);
            result.totalAttempts = Math.max(totalAttempts, result.attempts);
            result.workers = numWorkers;
            resolve(result);
          } catch {
            reject(new Error(`Failed to parse finder result: ${workerStdout[i].trim()}`));
          }
          return;
        }

        if (exited === numWorkers) {
          const reason = signal ? `killed by ${signal}` : `exited with code ${code}`;
          const allStderr = workerStderr
            .join('\n')
            .split('\n')
            .filter((l) => {
              try {
                JSON.parse(l);
                return false;
              } catch {
                return true;
              }
            })
            .join('\n')
            .trim();
          const totalAttempts = workerAttempts.reduce((a, b) => a + b, 0);
          const extra: Record<string, string> = {
            Runtime: `${runtime} (${useNodeHash ? 'FNV-1a' : 'wyhash'})`,
            Workers: String(numWorkers),
            'Total attempts': `~${totalAttempts.toLocaleString()}`,
            Expected: `~${expected.toLocaleString()} attempts`,
            Timeout: `${(timeout / 1000).toFixed(0)}s`,
            Args: `[${args
              .slice(1)
              .map((a) => `"${a}"`)
              .join(', ')}]`,
          };
          if (allStderr) extra['Worker stderr'] = allStderr;
          reject(new Error(`Salt finder ${reason}\n\n${diagnostics(extra)}`));
        }
      });

      child.on('error', (err) => {
        if (resolved) return;
        resolved = true;
        killAll();
        reject(
          new Error(
            `Failed to spawn salt finder: ${err.message}\n\n${diagnostics({ Runtime: runtime })}`,
          ),
        );
      });

      children.push(child);
    }
  });
}
