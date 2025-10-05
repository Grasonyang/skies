import { useEffect, useMemo, useRef, useState } from 'react';

export interface ActionCountdownOptions {
  targetDate: Date | null;
  goal: number;
  initialCount?: number;
  simulate?: boolean;
  tickMs?: number;
}

export interface CountdownState {
  remainingMs: number;
  achieved: number;
  goal: number;
  progress: number;
  isExpired: boolean;
}

const DEFAULT_TICK = 1000;

export function useActionCountdown({
  targetDate,
  goal,
  initialCount = 120,
  simulate = true,
  tickMs = DEFAULT_TICK,
}: ActionCountdownOptions): CountdownState {
  const [achieved, setAchieved] = useState(initialCount);
  const [remainingMs, setRemainingMs] = useState(() =>
    targetDate ? Math.max(0, targetDate.getTime() - Date.now()) : 0
  );
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!targetDate) {
      setRemainingMs(0);
      return;
    }

    const updateRemaining = () => {
      const delta = targetDate.getTime() - Date.now();
      setRemainingMs(Math.max(0, delta));
    };

    updateRemaining();
    timerRef.current = window.setInterval(updateRemaining, tickMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [targetDate, tickMs]);

  useEffect(() => {
    if (!simulate || !goal) return;

    const increment = () => {
      setAchieved((prev) => {
        if (prev >= goal) return prev;
        const variation = Math.random() * 4 + 1; // 1~5 人
        return Math.min(goal, prev + variation);
      });
    };

    const interval = window.setInterval(increment, tickMs * 3);
    return () => clearInterval(interval);
  }, [simulate, goal, tickMs]);

  useEffect(() => {
    setAchieved(initialCount);
  }, [initialCount]);

  const progress = useMemo(() => {
    if (!goal) return 0;
    return Math.min(1, achieved / goal);
  }, [achieved, goal]);

  const isExpired = remainingMs <= 0;

  return {
    remainingMs,
    achieved,
    goal,
    progress,
    isExpired,
  };
}
