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
      byType?: Record<string, number>;
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
    finance?: {
      totalSpent?: number;
    };
  };
  highlights: {
    topStat: string;
    distractionCount: number;
    bestDay: string;
    avgMood?: string | null;
    sessionsCompleted: number;
    taskCompletionRate?: number | null;
    notesCount?: number;
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
    const sessions = raw.focus?.completedSessions ?? 0;
    const distractions = raw.distractions?.total ?? 0;
    const peakHour = raw.distractions?.peakHour || "your common distraction window";
    const distractionTypes = raw.distractions?.byType ?? {};
    const sleepHours = Number(raw.wellness?.avgSleepHours ?? 0);
    const mood = Number(raw.wellness?.avgMoodScore ?? 0);
    const completed = raw.tasks?.completed ?? 0;
    const total = raw.tasks?.total ?? 0;
    const notes = raw.notes?.total ?? 0;
    const subjects = raw.notes?.subjects ?? [];
    const spent = raw.finance?.totalSpent ?? 0;

    const actions: string[] = [];

    // Focus recommendation
    if (focusMins === 0) {
      actions.push("You haven't logged any focus sessions this week. Start with just one 25-minute Pomodoro today — even a single session builds the habit.");
    } else if (focusMins < 120) {
      actions.push(`You logged ${focusMins} focus minutes this week. Aim to add one extra 25-minute session each day — that's only 175 more minutes to hit a solid 3-hour weekly baseline.`);
    } else {
      const bestDay = raw.focus?.bestDay;
      actions.push(`Strong week with ${focusMins} focus minutes across ${sessions} sessions${bestDay && bestDay !== "N/A" ? ` — ${bestDay} was your peak day` : ""}. Keep front-loading your hardest task in your first session each day to maintain this momentum.`);
    }

    // Distraction recommendation
    const topDistractionType = Object.entries(distractionTypes).sort((a, b) => b[1] - a[1])[0];
    if (distractions > 5) {
      const typeLabel = topDistractionType ? topDistractionType[0].replace(/_/g, " ") : "distractions";
      actions.push(`You had ${distractions} distraction attempts this week, mostly ${typeLabel}. Peak friction was around ${peakHour}. Start your focus lock 10 minutes before that window and pre-close all non-study tabs.`);
    } else if (distractions > 0) {
      actions.push(`${distractions} distraction attempts blocked this week — that's well controlled. Keep the focus lock active during your study blocks to maintain this discipline.`);
    } else {
      actions.push("Zero distraction attempts this week — excellent self-control. Maintain this by preparing tomorrow's study environment tonight so your start friction stays near zero.");
    }

    // Task completion recommendation
    if (total > 0) {
      const rate = Math.round((completed / total) * 100);
      if (rate < 50) {
        actions.push(`Task completion was ${completed}/${total} (${rate}%). Break each remaining task into 2-3 microsteps and schedule them with specific time slots — vague tasks get skipped, specific ones get done.`);
      } else if (rate < 80) {
        actions.push(`You completed ${completed} of ${total} tasks (${rate}%). For the uncompleted ones, identify if they were blocked by unclear scope or low energy — then reschedule them as your first task tomorrow morning.`);
      }
    }

    // Sleep/wellness recommendation
    if (sleepHours > 0 && sleepHours < 6.5) {
      actions.push(`Your average sleep was ${sleepHours} hours — below the 7-hour threshold for optimal memory consolidation. Move your final study sprint 30 minutes earlier to protect recovery and improve next-day focus quality.`);
    } else if (mood > 0 && mood < 3) {
      actions.push(`Your mood average was ${mood}/5 this week. Use shorter 15-20 minute sprints with deliberate 5-minute reset breaks to reduce cognitive resistance on low-energy days.`);
    } else if (avgSession >= 45) {
      actions.push(`Your average session length of ${avgSession} minutes is strong. Add a deliberate 5-minute recap at the end of each session — writing one sentence about what you learned improves retention by up to 30%.`);
    }

    // Notes recommendation
    if (notes === 0) {
      actions.push("You haven't captured any notes this week. Even 3-5 bullet points per study session in the Smart Notes Vault will dramatically improve recall during exams.");
    } else if (subjects.length > 0) {
      actions.push(`You studied ${subjects.length} subject${subjects.length > 1 ? "s" : ""} (${subjects.slice(0, 3).join(", ")}). Review your notes from the weakest subject first next week to close knowledge gaps before they compound.`);
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
          {highlights.bestDay && highlights.bestDay !== "N/A" && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#FEF3C7] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              🏆 <strong>{highlights.bestDay} was best</strong>
            </div>
          )}
          {highlights.avgMood && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#E0F2FE] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              💛 <strong>Mood avg: {highlights.avgMood}/5</strong>
            </div>
          )}
          {typeof highlights.taskCompletionRate === "number" && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              📝 <strong>{highlights.taskCompletionRate}% tasks done</strong>
            </div>
          )}
          {typeof highlights.notesCount === "number" && highlights.notesCount > 0 && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#F0FDF4] px-3.5 py-1.5 text-xs font-bold text-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]">
              📚 <strong>{highlights.notesCount} notes</strong>
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
