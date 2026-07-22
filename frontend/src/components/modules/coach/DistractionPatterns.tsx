"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

const CHART_COLORS = [
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#6366F1", // Indigo
];

interface DistractionData {
  total: number;
  byHour: Array<{ hour: number; label: string; count: number }>;
  byDay: Array<{ day: string; count: number }>;
  byType: Array<{ name: string; value: number; raw: string }>;
  dailyTrend: Array<{ date: string; distractions: number }>;
  insights: {
    peakHour: string | null;
    topType: string | null;
    mostDistractedDay: string;
  };
}

interface DistractionPatternsProps {
  userId?: string;
}

export function DistractionPatterns({ userId }: DistractionPatternsProps) {
  const [data, setData] = useState<DistractionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [range, setRange] = useState<number>(7);
  const [error, setError] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let uid = userId;
      if (!uid) {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        uid = user?.id;
      }

      const queryUid = uid ? `userId=${uid}&` : "";
      const res = await fetch(`/api/distraction-patterns?${queryUid}days=${range}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to load patterns");
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load distraction data");
    } finally {
      setLoading(false);
    }
  }, [userId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border-2 border-[var(--foreground)] bg-white p-3 font-bold text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B]">
          <p className="text-xs uppercase tracking-wider text-[var(--muted-fg)]">{label}</p>
          <p className="mt-1 text-sm font-black text-[#8B5CF6]">
            {payload[0].value} {payload[0].value === 1 ? "attempt" : "attempts"}
          </p>
        </div>
      );
    }
    return null;
  };

  const PieCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.06) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 800 }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-8 text-center shadow-[6px_6px_0_0_#1E293B]">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--foreground)] border-t-[#8B5CF6]"></div>
          <p className="text-sm font-bold text-[var(--muted-fg)]">Analyzing distraction patterns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-8 text-center shadow-[6px_6px_0_0_#1E293B]">
        <p className="text-sm font-bold text-red-500">Failed to load: {error}</p>
        <button
          className="mt-4 rounded-[14px] border-2 border-[var(--foreground)] bg-[#FFF7D6] px-4 py-2 text-xs font-bold shadow-[3px_3px_0_0_#1E293B]"
          onClick={fetchData}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-8 text-center shadow-[6px_6px_0_0_#1E293B]">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#ECFDF5] text-3xl shadow-[4px_4px_0_0_#1E293B]">
          🎉
        </div>
        <h3 className="font-display text-xl font-black text-[var(--foreground)]">No distractions logged yet!</h3>
        <p className="mt-1 text-sm font-semibold text-[var(--muted-fg)]">
          Start a focus session to begin tracking your distraction patterns.
        </p>
      </div>
    );
  }

  const peakHourObj = data.byHour.reduce(
    (max, h) => (h.count > max.count ? h : max),
    data.byHour[0]
  );
  const worstDayObj = data.byDay.reduce(
    (max, d) => (d.count > max.count ? d : max),
    data.byDay[0]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header + Range Selector */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[6px_6px_0_0_#1E293B]">
        <div>
          <h2 className="font-display text-2xl font-black text-[var(--foreground)]">🧠 Distraction Patterns</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--muted-fg)]">
            {data.total} {data.total === 1 ? "distraction" : "distractions"} blocked in the last {range} days
          </p>
        </div>

        <div className="flex rounded-[14px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-1 shadow-[3px_3px_0_0_#1E293B]">
          <button
            className={`rounded-[10px] px-3.5 py-1.5 text-xs font-black transition-all ${
              range === 7
                ? "border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[2px_2px_0_0_#1E293B]"
                : "text-[var(--foreground)] hover:bg-white/50"
            }`}
            onClick={() => setRange(7)}
          >
            7 Days
          </button>
          <button
            className={`rounded-[10px] px-3.5 py-1.5 text-xs font-black transition-all ${
              range === 30
                ? "border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[2px_2px_0_0_#1E293B]"
                : "text-[var(--foreground)] hover:bg-white/50"
            }`}
            onClick={() => setRange(30)}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Insight Pills */}
      {data.insights.peakHour && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-full border-2 border-[var(--foreground)] bg-[#FEE2E2] px-4 py-2 text-xs font-bold text-[#991B1B] shadow-[3px_3px_0_0_#1E293B]">
            ⚠️ Peak distraction: <strong>{data.insights.peakHour}</strong>
          </div>
          {data.insights.topType && (
            <div className="rounded-full border-2 border-[var(--foreground)] bg-[#F3E8FF] px-4 py-2 text-xs font-bold text-[#5B21B6] shadow-[3px_3px_0_0_#1E293B]">
              🔥 Most common: <strong>{data.insights.topType}</strong>
            </div>
          )}
          <div className="rounded-full border-2 border-[var(--foreground)] bg-[#E0F2FE] px-4 py-2 text-xs font-bold text-[#075985] shadow-[3px_3px_0_0_#1E293B]">
            📅 Most distracted: <strong>{data.insights.mostDistractedDay}</strong>
          </div>
        </div>
      )}

      {/* Chart 1: By Hour of Day — Bar Chart */}
      <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[6px_6px_0_0_#1E293B]">
        <h3 className="font-display text-lg font-black text-[var(--foreground)]">📊 Distractions by Hour of Day</h3>
        <p className="mb-4 mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">
          When during the day are you most prone to distraction?
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.byHour} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10, fontWeight: 700 }} interval={2} />
            <YAxis tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.byHour.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    entry.hour === peakHourObj?.hour && peakHourObj.count > 0
                      ? "#EC4899"
                      : "#8B5CF6"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-3 text-center text-xs font-bold text-[var(--muted-fg)]">
          <span style={{ color: "#EC4899" }}>■</span> Peak hour &nbsp;
          <span style={{ color: "#8B5CF6" }}>■</span> Normal
        </p>
      </div>

      {/* Chart 2: Daily Trend — Line Chart */}
      <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[6px_6px_0_0_#1E293B]">
        <h3 className="font-display text-lg font-black text-[var(--foreground)]">📈 Daily Distraction Trend</h3>
        <p className="mb-4 mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">
          How your distraction count changed day by day
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.dailyTrend} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10, fontWeight: 700 }} interval={range === 7 ? 0 : 4} />
            <YAxis tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="distractions"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={{ fill: "#8B5CF6", r: 4, stroke: "#1E293B", strokeWidth: 1 }}
              activeDot={{ r: 7, fill: "#EC4899", stroke: "#1E293B", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3 + 4 — Type Breakdown + Day of Week */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Pie Chart — By Type */}
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[6px_6px_0_0_#1E293B]">
          <h3 className="font-display text-lg font-black text-[var(--foreground)]">🔍 By Type</h3>
          <p className="mb-2 mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">What kind of distractions?</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.byType}
                cx="50%"
                cy="50%"
                outerRadius={75}
                dataKey="value"
                labelLine={false}
                label={<PieCustomLabel />}
              >
                {data.byType.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="#1E293B" strokeWidth={1.5} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [`${value} times`, name]}
                contentStyle={{
                  background: "#ffffff",
                  border: "2px solid #1E293B",
                  borderRadius: 12,
                  color: "#1E293B",
                  fontWeight: "bold",
                  boxShadow: "4px 4px 0 0 #1E293B",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="mt-3 flex flex-col gap-1.5">
            {data.byType.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-xs font-bold text-[var(--foreground)]">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-[var(--foreground)]"
                    style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span>{entry.name}</span>
                </div>
                <span className="font-black text-[#8B5CF6]">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart — By Day of Week */}
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[6px_6px_0_0_#1E293B]">
          <h3 className="font-display text-lg font-black text-[var(--foreground)]">📅 By Day of Week</h3>
          <p className="mb-2 mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">Which day is hardest to focus?</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.byDay} margin={{ top: 10, right: 5, bottom: 5, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.byDay.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.day === worstDayObj?.day && worstDayObj.count > 0
                        ? "#F59E0B"
                        : "#10B981"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-3 text-center text-xs font-bold text-[var(--muted-fg)]">
            <span style={{ color: "#F59E0B" }}>■</span> Hardest day &nbsp;
            <span style={{ color: "#10B981" }}>■</span> Normal
          </p>
        </div>
      </div>
    </div>
  );
}
