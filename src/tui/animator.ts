export type TickFn = (frame: number) => void;

export interface Animator {
  subscribe: (fn: TickFn) => () => void;
  stop: () => void;
}

export function createAnimator(intervalMs = 500): Animator {
  const subscribers = new Set<TickFn>();
  let timer: ReturnType<typeof setInterval> | null = null;
  let frame = 0;

  function tick(): void {
    frame++;
    for (const fn of subscribers) fn(frame);
  }

  function subscribe(fn: TickFn): () => void {
    subscribers.add(fn);
    if (subscribers.size === 1 && !timer) {
      timer = setInterval(tick, intervalMs);
      timer.unref();
    }
    return () => {
      subscribers.delete(fn);
      if (subscribers.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    frame = 0;
  }

  return { subscribe, stop };
}
