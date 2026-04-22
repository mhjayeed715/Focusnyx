"use client";

import { usePomodoro } from "@/hooks/usePomodoro";

export function PomodoroPanel() {
  const { minutes, seconds, isRunning, start, pause, reset } = usePomodoro(25);

  return (
    <section className="card">
      <h2>Dopamine Detox Engine</h2>
      <p>Run focused sessions and sync active focus state to the browser extension.</p>
      <p style={{ fontSize: 42, fontWeight: 700, margin: "8px 0 16px" }}>
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={start} disabled={isRunning}>Start</button>
        <button onClick={pause} disabled={!isRunning}>Pause</button>
        <button onClick={reset}>Reset</button>
      </div>
    </section>
  );
}
