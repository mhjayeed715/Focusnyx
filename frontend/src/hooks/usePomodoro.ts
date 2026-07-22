"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function usePomodoro(defaultMinutes: number, onComplete?: () => void | Promise<void>) {
  const initialSeconds = useMemo(() => defaultMinutes * 60, [defaultMinutes]);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || totalSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTotalSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, totalSeconds, defaultMinutes, onComplete]);

  useEffect(() => {
    if (totalSeconds !== 0 || !isRunning) {
      return;
    }

    setIsRunning(false);
    setTotalSeconds(initialSeconds);
    if (onComplete) {
      void onComplete();
    }
  }, [initialSeconds, isRunning, onComplete, totalSeconds]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((nextMinutes?: number) => {
    setIsRunning(false);
    setTotalSeconds((nextMinutes ?? defaultMinutes) * 60);
  }, [defaultMinutes]);

  const setDuration = useCallback((nextMinutes: number) => {
    setIsRunning(false);
    setTotalSeconds(nextMinutes * 60);
  }, []);

  const syncState = useCallback((nextSeconds: number, running: boolean) => {
    setTotalSeconds(nextSeconds);
    setIsRunning(running);
  }, []);

  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    isRunning,
    start,
    pause,
    reset,
    setDuration,
    syncState
  };
}
