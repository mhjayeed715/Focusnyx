import { Router } from "express";
import { buildProfile, normalizeTask, starterTasks, toPublicDashboard } from "../lib/dashboard.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const authRoutes = Router();

async function getOrCreateDashboardUser(userId: string, email: string, fullName: string) {
  const supabase = getSupabaseAdminClient();

  const { data: existingProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  const baseProfile = buildProfile({
    id: userId,
    email,
    fullName,
    level: existingProfile?.level,
    totalXp: existingProfile?.total_xp,
    todayXp: existingProfile?.today_xp,
    streak: existingProfile?.streak,
    focusScore: existingProfile?.focus_score,
    completedTasksToday: existingProfile?.completed_tasks_today,
    totalFocusTime: existingProfile?.total_focus_time,
    sessionsCompleted: existingProfile?.sessions_completed,
  });

  const profilePayload = {
    id: userId,
    university_email: email,
    display_name: fullName,
    preferred_language: existingProfile?.preferred_language ?? "en",
    level: baseProfile.level,
    total_xp: baseProfile.totalXp,
    today_xp: baseProfile.todayXp,
    streak: baseProfile.streak,
    focus_score: baseProfile.focusScore,
    completed_tasks_today: baseProfile.completedTasksToday,
    total_focus_time: baseProfile.totalFocusTime,
    sessions_completed: baseProfile.sessionsCompleted,
    last_active_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

  if (upsertError) {
    throw upsertError;
  }

  const { data: taskRows, error: taskError } = await supabase
    .from("academic_tasks")
    .select("id,title,subject,estimated_minutes,xp_reward,is_completed,microtasks,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (taskError) {
    throw taskError;
  }

  if (!taskRows || taskRows.length === 0) {
    const starterRows = starterTasks.map((task) => ({
      user_id: userId,
      title: task.title,
      subject: task.subject,
      estimated_minutes: task.estimate,
      xp_reward: task.xp,
      is_completed: task.completed,
      microtasks: task.subtasks.map((subtask) => ({ id: subtask.id, title: subtask.title, completed: subtask.completed })),
    }));

    const { error: seedError } = await supabase.from("academic_tasks").insert(starterRows);

    if (seedError) {
      throw seedError;
    }

    return {
      profile: baseProfile,
      tasks: starterTasks,
    };
  }

  return {
    profile: baseProfile,
    tasks: taskRows.map((task) => normalizeTask(task)),
  };
}

authRoutes.get("/me", requireAuth, async (request, response, next) => {
  try {
    if (!request.authUser) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const dashboard = await getOrCreateDashboardUser(request.authUser.id, request.authUser.email, request.authUser.fullName);
    response.json(toPublicDashboard(dashboard.profile, dashboard.tasks));
  } catch (error) {
    next(error);
  }
});

authRoutes.post("/sync", requireAuth, async (request, response, next) => {
  try {
    if (!request.authUser) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const dashboard = await getOrCreateDashboardUser(request.authUser.id, request.authUser.email, request.authUser.fullName);
    response.json({ profile: dashboard.profile });
  } catch (error) {
    next(error);
  }
});