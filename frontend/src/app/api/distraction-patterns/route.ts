import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    // Accept Bearer token from Authorization header (client passes it directly)
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let userId = searchParams.get("userId");

    // If no userId in query, decode it from the JWT
    if (!userId && token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
        userId = payload.sub ?? null;
      } catch { }
    }

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Use service role key if available so RLS doesn't block server reads,
    // otherwise fall back to anon key with the user token
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const sb = serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : createClient(supabaseUrl, supabaseKey, {
          global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        });

    const days = parseInt(searchParams.get("days") || "7", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: distractions, error } = await sb
      .from("distraction_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("blocked_at", since)
      .order("blocked_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logs = distractions || [];

    // Helper to extract log timestamp string
    const getTimestamp = (d: any): string =>
      d.timestamp || d.blocked_at || new Date().toISOString();

    // ── By Hour of Day (0 - 23) ────────────────────────────────────────
    const byHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label:
        hour === 0
          ? "12 AM"
          : hour < 12
          ? `${hour} AM`
          : hour === 12
          ? "12 PM"
          : `${hour - 12} PM`,
      count: logs.filter(
        (d) => new Date(getTimestamp(d)).getHours() === hour
      ).length,
    }));

    // ── By Day of Week (Sun - Sat) ────────────────────────────────────
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay = dayNames.map((name, index) => ({
      day: name,
      count: logs.filter(
        (d) => new Date(getTimestamp(d)).getDay() === index
      ).length,
    }));

    // ── By Type ───────────────────────────────────────────────────────
    const typeMap = logs.reduce((acc, d) => {
      const typeKey = d.type || d.domain || "unknown";
      acc[typeKey] = (acc[typeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeLabels: Record<string, string> = {
      tab_switch_blocked: "Tab Switch",
      new_tab_blocked: "New Tab",
      navigation_blocked: "URL Change",
      app_killed: "App Opened",
      window_switch: "App Switch",
      unknown: "Other",
    };

    const byType: Array<{ name: string; value: number; raw: string }> =
      Object.entries(typeMap).map(([key, count]) => ({
        name: typeLabels[key] || key,
        value: Number(count),
        raw: key,
      }));

    // ── Daily Trend ───────────────────────────────────────────────────
    const dailyTrend = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const count = logs.filter((d) => {
        const logDate = new Date(getTimestamp(d));
        return logDate.toDateString() === date.toDateString();
      }).length;
      dailyTrend.push({ date: dateStr, distractions: count });
    }

    // ── Peak Insights ─────────────────────────────────────────────────
    const peakHour = byHour.reduce(
      (max, h) => (h.count > max.count ? h : max),
      byHour[0]
    );

    const topType = byType.sort((a, b) => b.value - a.value)[0];

    const mostDistractedDay = byDay.reduce(
      (max, d) => (d.count > max.count ? d : max),
      byDay[0]
    );

    return NextResponse.json({
      total: logs.length,
      byHour,
      byDay,
      byType,
      dailyTrend,
      insights: {
        peakHour: peakHour && peakHour.count > 0 ? peakHour.label : null,
        topType: topType ? topType.name : null,
        mostDistractedDay: mostDistractedDay.day,
      },
    });
  } catch (err: any) {
    console.error("Distraction patterns API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
