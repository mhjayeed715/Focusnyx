"use client";

import { useFocusContext } from "@/context/FocusContext";
import { useEffect } from "react";

export function usePomodoro(defaultMinutes: number, onComplete?: () => void | Promise<void>) {
  const context = useFocusContext();
  const { totalSeconds, isRunning, setDefaultMinutes } = context;

  useEffect(() => {
    setDefaultMinutes(defaultMinutes);
  }, [defaultMinutes, setDefaultMinutes]);

  useEffect(() => {
    if (totalSeconds === 0 && !isRunning) {
      if (onComplete) {
        Promise.resolve(onComplete()).finally(() => {
          context.reset();
        });
      } else {
        context.reset();
      }
    }
  }, [totalSeconds, isRunning, onComplete, context]);

  return context;
}
