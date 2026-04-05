import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAnimator } from '@/tui/animator.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createAnimator', () => {
  it('calls subscriber with incrementing frame numbers', () => {
    vi.useFakeTimers();
    const animator = createAnimator(100);
    const frames: number[] = [];

    animator.subscribe((f: number) => frames.push(f));
    vi.advanceTimersByTime(300);
    animator.stop();

    expect(frames).toEqual([1, 2, 3]);
  });

  it('does not start timer until first subscriber', () => {
    vi.useFakeTimers();
    const animator = createAnimator(100);
    const spy = vi.fn();

    vi.advanceTimersByTime(500);
    // No subscribers yet — spy should not be called
    expect(spy).not.toHaveBeenCalled();

    animator.subscribe(spy);
    vi.advanceTimersByTime(200);
    animator.stop();

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('stops timer when last subscriber unsubscribes', () => {
    vi.useFakeTimers();
    const animator = createAnimator(100);
    const spy = vi.fn();

    const unsub = animator.subscribe(spy);
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);

    unsub();
    vi.advanceTimersByTime(500);
    // Should not receive more ticks after unsubscribe
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('supports multiple subscribers', () => {
    vi.useFakeTimers();
    const animator = createAnimator(100);
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    animator.subscribe(spy1);
    animator.subscribe(spy2);
    vi.advanceTimersByTime(100);
    animator.stop();

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
    // Both receive the same frame
    expect(spy1).toHaveBeenCalledWith(1);
    expect(spy2).toHaveBeenCalledWith(1);
  });

  it('keeps timer running if one of two subscribers unsubscribes', () => {
    vi.useFakeTimers();
    const animator = createAnimator(100);
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    const unsub1 = animator.subscribe(spy1);
    animator.subscribe(spy2);
    vi.advanceTimersByTime(100);

    unsub1();
    vi.advanceTimersByTime(100);
    animator.stop();

    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(2);
  });

  it('stop() resets frame counter', () => {
    vi.useFakeTimers();
    const animator = createAnimator(100);
    const frames: number[] = [];

    const unsub = animator.subscribe((f: number) => frames.push(f));
    vi.advanceTimersByTime(200);
    unsub();
    animator.stop();

    // Re-subscribe after stop — frame should restart from 0
    const frames2: number[] = [];
    animator.subscribe((f: number) => frames2.push(f));
    vi.advanceTimersByTime(100);
    animator.stop();

    expect(frames).toEqual([1, 2]);
    expect(frames2).toEqual([1]);
  });
});
