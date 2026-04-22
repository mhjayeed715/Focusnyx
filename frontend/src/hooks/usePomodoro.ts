"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export function usePomodoro(defaultMinutes: number) {
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
  }, [isRunning, totalSeconds]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    setTotalSeconds(initialSeconds);
  }, [initialSeconds]);

  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    isRunning,
    start,
    pause,
    reset
  };
}
