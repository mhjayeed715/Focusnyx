"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type FocusContextType = {
  defaultMinutes: number;
  totalSeconds: number;
  isRunning: boolean;
  isLocked: boolean;
  activeTaskId: string;
  minutes: number;
  seconds: number;
  start: () => void;
  pause: () => void;
  reset: (nextMinutes?: number) => void;
  setDuration: (nextMinutes: number) => void;
  syncState: (nextSeconds: number, running: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  setActiveTaskId: (id: string) => void;
  setDefaultMinutes: (minutes: number) => void;
};

const FocusContext = createContext<FocusContextType | null>(null);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [defaultMinutes, setDefaultMinutes] = useState(25);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning || !endTime) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setTotalSeconds(remaining);
      if (remaining === 0) {
        setIsRunning(false);
        setEndTime(null);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, endTime]);

  const start = useCallback(() => {
    setIsRunning(true);
    setEndTime(Date.now() + totalSeconds * 1000);
  }, [totalSeconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
    setEndTime(null);
  }, []);
  const reset = useCallback((nextMinutes?: number) => {
    setIsRunning(false);
    setEndTime(null);
    setTotalSeconds((nextMinutes ?? defaultMinutes) * 60);
  }, [defaultMinutes]);

  const setDuration = useCallback((nextMinutes: number) => {
    setDefaultMinutes(nextMinutes);
    setIsRunning(false);
    setEndTime(null);
    setTotalSeconds(nextMinutes * 60);
  }, []);

  const syncState = useCallback((nextSeconds: number, running: boolean) => {
    setTotalSeconds(nextSeconds);
    setIsRunning(running);
    if (running) {
      setEndTime(Date.now() + nextSeconds * 1000);
    } else {
      setEndTime(null);
    }
  }, []);

  return (
    <FocusContext.Provider
      value={{
        defaultMinutes,
        totalSeconds,
        isRunning,
        isLocked,
        activeTaskId,
        minutes: Math.floor(totalSeconds / 60),
        seconds: totalSeconds % 60,
        start,
        pause,
        reset,
        setDuration,
        syncState,
        setIsLocked,
        setActiveTaskId,
        setDefaultMinutes
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocusContext() {
  const context = useContext(FocusContext);
  if (!context) {
    throw new Error("useFocusContext must be used within a FocusProvider");
  }
  return context;
}
