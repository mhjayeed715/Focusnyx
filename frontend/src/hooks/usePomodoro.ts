"use client";

import { useFocusContext } from "@/context/FocusContext";
import { useEffect } from "react";

export function usePomodoro(defaultMinutes: number, onComplete?: () => void | Promise<void>) {
  const context = useFocusContext();
  const { totalSeconds, isRunning, hasStarted, setDefaultMinutes } = context;

  useEffect(() => {
    setDefaultMinutes(defaultMinutes);
  }, [defaultMinutes, setDefaultMinutes]);

  useEffect(() => {
    // Only fire onComplete if a session was actually started and reached 0
    if (totalSeconds === 0 && !isRunning && hasStarted) {
      if (onComplete) {
        Promise.resolve(onComplete()).finally(() => {
          context.reset();
        });
      } else {
        context.reset();
      }
    }
  }, [totalSeconds, isRunning, hasStarted]);

  return context;
}
