"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  ai_report: string;
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

  const getThisMonday = (): string => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split("T")[0];
  };

  const fetchExistingReport = useCallback(async () => {
    setFetching(true);
    try {
      const sb = createClient();
      let uid = userId;
      if (!uid) {
        const { data: { user } } = await sb.auth.getUser();
        uid = user?.id;
      }

      if (!uid) {
        setFetching(false);
        return;
      }

      const thisMonday = getThisMonday();
      const { data } = await sb
        .from("weekly_reports")
        .select("*")
        .eq("user_id", uid)
        .eq("week_start", thisMonday)
        .maybeSingle();

      if (data) setReport(data as WeeklyReport);
    } catch (err: any) {
      console.error("Error fetching report:", err);
    } finally {
      setFetching(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchExistingReport();
  }, [fetchExistingReport]);

  async function generateReport() {
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
        body: JSON.stringify({ userId: uid, force: true }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

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

        {error && <p className="mb-4 text-xs font-bold text-red-500">{error}</p>}

        <button
          className="candy-button inline-flex items-center gap-2.5 rounded-[18px] px-6 py-3.5 text-sm font-black shadow-[4px_4px_0_0_#1E293B] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#1E293B] transition-all disabled:opacity-50"
          onClick={generateReport}
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
          onClick={generateReport}
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
    </div>
  );
}
