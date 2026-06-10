"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { getDailyWellnessLog, type DailyWellnessEntry } from "@/lib/backend";
import { calculateWellnessScore, getScoreColor } from "@/lib/wellness";

type MoodKey = "awful" | "sad" | "okay" | "good" | "great";

function calcBurnoutScore(entry: DailyWellnessEntry): number {
  const hydrationPct = entry.hydrationGoal > 0
    ? Math.min(100, (entry.hydrationGlasses / entry.hydrationGoal) * 100)
    : 0;
  const stepsPct = entry.stepsGoal > 0
    ? Math.min(100, (entry.steps / entry.stepsGoal) * 100)
    : 0;

  let risk = 0;
  if (entry.sleepHours < 5) risk += 35;
  else if (entry.sleepHours < 6.5) risk += 20;
  else if (entry.sleepHours < 7) risk += 10;

  const moodMap: Record<MoodKey, number> = { awful: 30, sad: 20, okay: 10, good: 2, great: 0 };
  if (entry.moodKey) risk += moodMap[entry.moodKey as MoodKey] ?? 10;

  if (hydrationPct < 30) risk += 15;
  else if (hydrationPct < 60) risk += 8;

  if (stepsPct < 30) risk += 10;
  else if (stepsPct < 60) risk += 5;

  return Math.min(100, Math.max(0, risk));
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WellnessLog({ refreshKey }: { refreshKey?: number }) {
  const [log, setLog] = useState<DailyWellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDailyWellnessLog(7)
      .then((res) => setLog(res.log))
      .catch(() => setLog([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#8b5cf6]">
          <TrendingUp size={18} color="#fff" strokeWidth={2.5} />
        </span>
        <p className="font-display text-lg font-black">7-Day Wellness Log</p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted-fg)]">Loading…</p>
      ) : log.length === 0 ? (
        <p className="text-sm text-[var(--muted-fg)]">No data yet. Your daily log will appear here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--border)]">
                {["Date", "Sleep", "Mood", "Hydration", "Steps", "Burnout", "Wellness"].map((h) => (
                  <th key={h} className="pb-2 pr-3 text-left text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((entry) => {
                const hydPct = entry.hydrationGoal > 0
                  ? Math.min(100, (entry.hydrationGlasses / entry.hydrationGoal) * 100)
                  : 0;
                const stpPct = entry.stepsGoal > 0
                  ? Math.min(100, (entry.steps / entry.stepsGoal) * 100)
                  : 0;
                const burnout = calcBurnoutScore(entry);
                const wellness = calculateWellnessScore({
                  sleepHours: entry.sleepHours,
                  moodKey: entry.moodKey,
                  hydrationPct: hydPct,
                  stepsPct: stpPct,
                });
                const wColor = getScoreColor(wellness);
                const bColor = burnout <= 25 ? "#34d399" : burnout <= 50 ? "#fbbf24" : burnout <= 75 ? "#f97316" : "#ef4444";

                return (
                  <tr key={entry.date} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2 pr-3 font-bold">{fmtDate(entry.date)}</td>
                    <td className="py-2 pr-3">{entry.sleepHours > 0 ? `${entry.sleepHours}h` : "—"}</td>
                    <td className="py-2 pr-3 capitalize">{entry.moodKey ?? "—"}</td>
                    <td className="py-2 pr-3">{Math.round(hydPct)}%</td>
                    <td className="py-2 pr-3">{Math.round(stpPct)}%</td>
                    <td className="py-2 pr-3">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-black text-white" style={{ background: bColor }}>
                        {burnout}%
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-black text-white" style={{ background: wColor }}>
                        {wellness}/100
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
