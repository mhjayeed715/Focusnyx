"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type FocusContextType = {
  defaultMinutes: number;
  totalSeconds: number;
  isRunning: boolean;
  isLocked: boolean;
  hasStarted: boolean;
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

  const [hasStarted, setHasStarted] = useState(false);

  const start = useCallback(() => {
    setHasStarted(true);
    setIsRunning(true);
    setEndTime(Date.now() + totalSeconds * 1000);
  }, [totalSeconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
    setEndTime(null);
  }, []);

  const reset = useCallback((nextMinutes?: number) => {
    setHasStarted(false);
    setIsRunning(false);
    setEndTime(null);
    const secs = (nextMinutes ?? defaultMinutes) * 60;
    setTotalSeconds(secs);
  }, [defaultMinutes]);

  const setDuration = useCallback((nextMinutes: number) => {
    setDefaultMinutes(nextMinutes);
    setHasStarted(false);
    setIsRunning(false);
    setEndTime(null);
    setTotalSeconds(nextMinutes * 60);
  }, []);

  const syncState = useCallback((nextSeconds: number, running: boolean) => {
    setTotalSeconds(nextSeconds);
    setIsRunning(running);
    if (running && nextSeconds > 0) {
      setHasStarted(true);
      setEndTime(Date.now() + nextSeconds * 1000);
    } else {
      setEndTime(null);
    }
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "FOCUSNYX_EXTENSION_STATE" && event.data.state) {
        const { active, remainingTime } = event.data.state;
        const remainingSecs = Math.max(0, Math.round((remainingTime || 0) / 1000));
        if (active && remainingSecs > 0) {
          syncState(remainingSecs, true);
          setIsLocked(true);
        } else if (!active) {
          syncState(defaultMinutes * 60, false);
          setIsLocked(false);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    if (typeof window !== "undefined") {
      window.postMessage({ type: "FOCUSNYX_WEB_APP_ACTION", action: "getStatus" }, "*");
    }
    return () => window.removeEventListener("message", handleMessage);
  }, [syncState, defaultMinutes]);

  return (
    <FocusContext.Provider
      value={{
        defaultMinutes,
        totalSeconds,
        isRunning,
        isLocked,
        hasStarted,
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
