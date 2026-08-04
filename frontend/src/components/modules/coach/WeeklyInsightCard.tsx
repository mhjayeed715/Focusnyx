"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  ai_report: string;
  generated_at?: string;
  raw_data?: {
    focus?: {
      totalSessions?: number;
      completedSessions?: number;
      totalFocusMinutes?: number;
      avgSessionLength?: number;
      bestDay?: string;
    };
    distractions?: {
      total?: number;
      peakHour?: string;
    };
    wellness?: {
      avgMoodScore?: string | null;
      avgSleepHours?: string | null;
    };
    tasks?: {
      total?: number;
      completed?: number;
    };
    notes?: {
      total?: number;
      subjects?: string[];
    };
  };
  highlights: {
    topStat: string;
    distractionCount: number;
    bestDay: string;
    avgMood?: string | null;
    sessionsCompleted: number;
  };
}

interface WeeklyInsightCardProps {
  userId?: string;
}

export function WeeklyInsightCard({ userId }: WeeklyInsightCardProps) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const getCurrentWeekChunkStart = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();

    if (date <= 7) return new Date(year, month, 1).toISOString().split("T")[0];
    if (date <= 14) return new Date(year, month, 8).toISOString().split("T")[0];
    if (date <= 21) return new Date(year, month, 15).toISOString().split("T")[0];
    return new Date(year, month, 22).toISOString().split("T")[0];
  };

  const generateReport = useCallback(async (force = true) => {
    setLoading(true);
    setError("");

    try {
      const sb = createClient();
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await sb.auth.getUser();
        uid = user?.id;
      }

      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, force }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      setReport(data.report);
      return data.report as WeeklyReport;
    } catch (err: any) {
      setError(err.message || "Failed to connect");
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchExistingReport = useCallback(async () => {
    setFetching(true);
    try {
      const sb = createClient();
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await sb.auth.getUser();
        uid = user?.id;
      }

      if (!uid) return null;

      const { data } = await sb
        .from("weekly_reports")
        .select("*")
        .eq("user_id", uid)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const weeklyReport = data as WeeklyReport;
        setReport(weeklyReport);
        return weeklyReport;
      }
      return null;
    } catch (err: any) {
      console.error("Error fetching report:", err);
      return null;
    } finally {
      setFetching(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const existing = await fetchExistingReport();
      if (!mounted) return;

      const expectedWeekStart = getCurrentWeekChunkStart();
      if (!existing || existing.week_start !== expectedWeekStart) {
        await generateReport(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchExistingReport, generateReport]);

  const buildPersonalizedActions = (raw: WeeklyReport["raw_data"]) => {
    if (!raw) return [] as string[];

    const focusMins = raw.focus?.totalFocusMinutes ?? 0;
    const avgSession = raw.focus?.avgSessionLength ?? 0;
    const distractions = raw.distractions?.total ?? 0;
    const peakHour = raw.distractions?.peakHour || "your common distraction window";
    const sleepHours = Number(raw.wellness?.avgSleepHours ?? 0);
    const mood = Number(raw.wellness?.avgMoodScore ?? 0);
    const completed = raw.tasks?.completed ?? 0;
    const total = raw.tasks?.total ?? 0;

    const actions: string[] = [];

    if (focusMins < 180) {
      actions.push("Schedule one guaranteed 25-minute deep-focus block daily for the next 7 days, ideally at the same clock time.");
    } else {
      actions.push(`You already banked ${focusMins} focus minutes this week. Keep the momentum by front-loading your hardest task in your first session each day.`);
    }

    if (distractions > 0) {
      actions.push(`Distractions peaked around ${peakHour}. Start focus lock 10 minutes before that window and pre-open only study tabs to reduce context-switching.`);
    } else {
      actions.push("Zero distraction attempts is excellent. Maintain this by preparing tomorrow's first task tonight so your start friction stays low.");
    }

    if (total > 0) {
      actions.push(`Task follow-through is ${completed}/${total}. Convert every large task into 2-3 microsteps so completion stays consistent even on low-energy days.`);
    }

    if (sleepHours > 0 && sleepHours < 6.5) {
      actions.push("Your sleep average is below 6.5 hours. Move your final study sprint 30 minutes earlier to protect recovery and improve next-day focus quality.");
    } else if (mood > 0 && mood < 3) {
      actions.push("Mood trend is low this week. Use shorter sprints (15-20 minutes) with a 5-minute reset break to reduce cognitive resistance.");
    } else if (avgSession >= 45) {
      actions.push("Your average session length is strong. Add one deliberate 5-minute recap at the end of each session to improve retention.");
    }

    return actions.slice(0, 4);
  };

  if (fetching) {
    return (
      <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-8 text-center shadow-[6px_6px_0_0_#1E293B]">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--foreground)] border-t-[#8B5CF6]"></div>
          <p className="text-sm font-bold text-[var(--muted-fg)]">Checking weekly insights...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-8 text-center shadow-[6px_6px_0_0_#1E293B]">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#FFF7D6] text-3xl shadow-[4px_4px_0_0_#1E293B]">
          🤖
        </div>
        <h3 className="font-display text-2xl font-black text-[var(--foreground)]">Your Weekly Insight is Ready</h3>
        <p className="mx-auto mb-6 mt-2 max-w-md text-sm font-semibold text-[var(--muted-fg)] leading-relaxed">
          Nyx will analyze your focus sessions, wellness logs, and distraction metrics from this past week to deliver personalized study advice.
        </p>

        {error && (
          <div className="mx-auto mb-5 max-w-md rounded-2xl border-2 border-red-500 bg-[#FEE2E2] p-4 text-xs font-bold text-red-900 shadow-[3px_3px_0_0_#991B1B]">
            <p className="font-black">{error}</p>
            {error.includes("Settings") && (
              <a
                href="/settings"
                className="mt-2 inline-block rounded-xl border border-red-800 bg-white px-3 py-1 text-[11px] font-black text-red-900 shadow-[2px_2px_0_0_#991B1B] hover:bg-slate-50"
              >
                ⚙️ Add API Key in Settings
              </a>
            )}
          </div>
        )}

        <button
          className="candy-button inline-flex items-center gap-2.5 rounded-[18px] px-6 py-3.5 text-sm font-black shadow-[4px_4px_0_0_#1E293B] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#1E293B] transition-all disabled:opacity-50"
          onClick={() => void generateReport(true)}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              Nyx is thinking...
            </>
          ) : (
            "✨ Generate My Weekly Report"
          )}
        </button>
      </div>
    );
  }

  const { highlights, ai_report, week_start, week_end } = report;

  return (
    <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 sm:p-8 shadow-[6px_6px_0_0_#1E293B]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-[var(--foreground)] bg-[#F3E8FF] text-2xl shadow-[3px_3px_0_0_#1E293B]">
            🤖
          </div>
          <div>
            <h3 className="font-display text-xl font-black text-[var(--foreground)]">Weekly Report from Nyx</h3>
            <p className="mt-0.5 text-xs font-bold text-[var(--muted-fg)]">
              {new Date(week_start).toLocaleDateString("en-BD", {
                day: "numeric",
                month: "short",
              })}{" "}
              —{" "}
              {new Date(week_end).toLocaleDateString("en-BD", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <button
          className="rounded-[14px] border-2 border-[var(--foreground)] bg-white px-4 py-2 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B] transition hover:translate-y-[-1px] hover:shadow-[4px_4px_0_0_#1E293B] disabled:opacity-50"
          onClick={() => void generateReport(true)}
          disabled={loading}
        >
          {loading ? "Regenerating..." : "🔄 Regenerate"}
        </button>
      </div>

      {/* Quick Highlights Row */}
      {highlights && (
        <div className="mb-6 flex flex-wrap gap-2.5">
          {highlights.topStat && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#F3E8FF] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              ⏱️ <strong>{highlights.topStat}</strong>
            </div>
          )}
          {typeof highlights.sessionsCompleted === "number" && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              ✅ <strong>{highlights.sessionsCompleted} sessions done</strong>
            </div>
          )}
          {typeof highlights.distractionCount === "number" && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#FEE2E2] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              🚫 <strong>{highlights.distractionCount} blocks</strong>
            </div>
          )}
          {highlights.bestDay && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#FEF3C7] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              🏆 <strong>{highlights.bestDay} was best</strong>
            </div>
          )}
          {highlights.avgMood && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#E0F2FE] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              💛 <strong>Mood avg: {highlights.avgMood}/5</strong>
            </div>
          )}
        </div>
      )}

      {/* AI Report Text Box */}
      <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#FAF5FF] p-5 sm:p-6 text-sm leading-relaxed text-[var(--foreground)] font-medium shadow-[4px_4px_0_0_#1E293B] whitespace-pre-wrap">
        {ai_report}
      </div>

      {/* Real-data action plan */}
      {report.raw_data ? (
        <div className="mt-5 rounded-[20px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-5 shadow-[4px_4px_0_0_#1E293B]">
          <h4 className="font-display text-lg font-black text-[var(--foreground)]">Personalized Action Plan</h4>
          <p className="mt-1 text-xs font-semibold text-[var(--muted-fg)]">Built from your real focus, distraction, task, and wellness logs for this week.</p>
          <div className="mt-3 space-y-2.5">
            {buildPersonalizedActions(report.raw_data).map((tip, index) => (
              <div key={`${index}-${tip.slice(0, 24)}`} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--foreground)]">
                {tip}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
