import { Router } from "express";
import { buildProfile, calculateStreak, getXpState } from "../lib/dashboard.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const focusRoutes = Router();

focusRoutes.use(requireAuth);

focusRoutes.post("/pomodoro/complete", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    const userEmail = request.authUser?.email;
    const userName = request.authUser?.fullName;

    if (!userId || !userEmail || !userName) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const minutes = Number(request.body?.minutes ?? 25);
    const xpReward = Number(request.body?.xpReward ?? 25);
    const supabase = getSupabaseAdminClient(request.authUser?.accessToken);

    const { data: profileRow, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const streak = calculateStreak(profileRow?.last_active_at, profileRow?.streak ?? 1);
    const profile = buildProfile({
      id: userId,
      email: userEmail,
      fullName: userName,
      level: profileRow?.level,
      totalXp: (profileRow?.total_xp ?? 0) + xpReward,
      todayXp: (profileRow?.today_xp ?? 0) + xpReward,
      streak,
      focusScore: profileRow?.focus_score,
      completedTasksToday: profileRow?.completed_tasks_today,
      totalFocusTime: (profileRow?.total_focus_time ?? 0) + minutes,
      sessionsCompleted: (profileRow?.sessions_completed ?? 0) + 1,
      emergencyPin: profileRow?.emergency_pin,
    });

    const { error: updateError } = await supabase.from("profiles").update({
      level: profile.level,
      total_xp: profile.totalXp,
      today_xp: profile.todayXp,
      streak: profile.streak,
      focus_score: Math.min(100, (profileRow?.focus_score ?? 80) + 1),
      completed_tasks_today: profile.completedTasksToday,
      total_focus_time: profile.totalFocusTime,
      sessions_completed: profile.sessionsCompleted,
      last_active_at: new Date().toISOString(),
    }).eq("id", userId);

    if (updateError) {
      console.error("Profile update error in focus completion:", updateError);
    }

    await supabase.from("focus_sessions").insert({
      user_id: userId,
      started_at: new Date(Date.now() - minutes * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      planned_minutes: minutes,
      actual_minutes: minutes,
    });

    response.json({
      profile,
      reward: {
        xpReward,
        minutes,
        xpState: getXpState(profile.totalXp),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Log distraction block event from extension/PWA/companion
focusRoutes.post("/block-event", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const { url, session_id, domain: reqDomain, type: reqType, details: reqDetails } = request.body || {};
    let domain = reqDomain;
    if (!domain && url) {
      try {
        domain = new URL(url).hostname;
      } catch {
        domain = url;
      }
    }

    const type = reqType || "navigation_blocked";
    const details = reqDetails || { url, session_id, timestamp: new Date().toISOString() };
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from("distraction_logs").insert({
      user_id: userId,
      domain: domain || "unknown",
      type,
      details,
      timestamp: new Date().toISOString(),
      blocked_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("Error recording distraction log:", error.message);
    }

    response.json({ success: true, logged: true });
  } catch (error) {
    next(error);
  }
});

// Fetch distraction logs for reports and analytics
focusRoutes.get("/distractions", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const supabase = getSupabaseAdminClient();
    const { data: logs, error } = await supabase
      .from("distraction_logs")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    response.json({ distractions: logs || [] });
  } catch (error) {
    next(error);
  }
});