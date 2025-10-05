import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { useActionCountdown } from '../src/hooks/useActionCountdown';

afterEach(() => {
  vi.useRealTimers();
});

describe('useActionCountdown', () => {
  it('handles remaining time and expiry state', () => {
    const now = Date.now();
    const targetDate = new Date(now + 60 * 60 * 1000); // 1 hour later

    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useActionCountdown({
        targetDate,
        goal: 1000,
        initialCount: 200,
        simulate: false,
        tickMs: 1000,
      })
    );

    expect(result.current.goal).toBe(1000);
    expect(result.current.achieved).toBe(200);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.remainingMs).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.remainingMs).toBeLessThan(60 * 60 * 1000);

    act(() => {
      vi.setSystemTime(targetDate.getTime() + 1000);
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.remainingMs).toBe(0);
  });

  it('simulates participant growth when enabled', () => {
    const targetDate = new Date(Date.now() + 5 * 60 * 1000);

    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useActionCountdown({
        targetDate,
        goal: 100,
        initialCount: 10,
        simulate: true,
        tickMs: 500,
      })
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.achieved).toBeGreaterThan(10);
    expect(result.current.progress).toBeGreaterThan(0.1);
  });
});
