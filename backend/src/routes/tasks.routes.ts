import { Router } from "express";
import { calculateStreak, buildProfile, normalizeTask, starterTasks } from "../lib/dashboard.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const tasksRoutes = Router();

tasksRoutes.use(requireAuth);

tasksRoutes.get("/", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("academic_tasks")
      .select("id,title,subject,estimated_minutes,xp_reward,is_completed,microtasks,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      response.json({ tasks: starterTasks });
      return;
    }

    response.json({ tasks: data.map((task) => normalizeTask(task)) });
  } catch (error) {
    next(error);
  }
});

tasksRoutes.post("/", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const title = typeof request.body?.title === "string" ? request.body.title.trim() : "";
    const subject = typeof request.body?.subject === "string" && request.body.subject.trim() ? request.body.subject.trim() : "General";
    const estimate = Math.max(5, Math.round(Number(request.body?.estimate ?? 25)));
    const microtasks = Array.isArray(request.body?.microtasks)
      ? request.body.microtasks
          .filter((microtask: unknown) => typeof microtask === "string" && microtask.trim())
          .map((microtask: string, index: number) => ({ id: `micro-${Date.now()}-${index}`, title: microtask.trim(), completed: false }))
      : [];

    if (!title) {
      response.status(400).json({ message: "Task title is required." });
      return;
    }

    const supabase = getSupabaseAdminClient();
    const payload = {
      user_id: userId,
      title,
      subject,
      estimated_minutes: Number.isFinite(estimate) ? estimate : 25,
      xp_reward: Math.max(20, estimate * 4),
      is_completed: false,
      microtasks,
    };

    const { data, error } = await supabase
      .from("academic_tasks")
      .insert(payload)
      .select("id,title,subject,estimated_minutes,xp_reward,is_completed,microtasks,created_at")
      .single();

    if (error) {
      throw error;
    }

    response.status(201).json({ task: normalizeTask(data) });
  } catch (error) {
    next(error);
  }
});

tasksRoutes.patch("/:taskId", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    const taskId = request.params.taskId;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const supabase = getSupabaseAdminClient();

    const { data: existingTask, error: lookupError } = await supabase
      .from("academic_tasks")
      .select("id,title,subject,estimated_minutes,xp_reward,is_completed,microtasks,created_at")
      .eq("id", taskId)
      .eq("user_id", userId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    const updates: Record<string, unknown> = {};
    const wantsCompleted = typeof request.body?.completed === "boolean" ? request.body.completed : undefined;

    if (typeof wantsCompleted === "boolean") {
      updates.is_completed = wantsCompleted;
      if (wantsCompleted) {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }
    }

    if (Array.isArray(request.body?.microtasks)) {
      updates.microtasks = request.body.microtasks;
    }

    const { data, error } = await supabase
      .from("academic_tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("user_id", userId)
      .select("id,title,subject,estimated_minutes,xp_reward,is_completed,microtasks,created_at")
      .single();

    if (error) {
      throw error;
    }

    if (typeof wantsCompleted === "boolean" && wantsCompleted && existingTask && !existingTask.is_completed) {
      const { data: profileRow, error: profileError } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const xpReward = existingTask.xp_reward ?? 0;
      const totalXp = (profileRow?.total_xp ?? 0) + xpReward;
      const todayXp = (profileRow?.today_xp ?? 0) + xpReward;
      const streak = calculateStreak(profileRow?.last_active_at, profileRow?.streak ?? 1);
      const updatedProfile = buildProfile({
        id: userId,
        email: request.authUser?.email ?? "student@example.com",
        fullName: request.authUser?.fullName ?? "Student",
        level: profileRow?.level,
        totalXp,
        todayXp,
        streak,
        focusScore: Math.min(100, (profileRow?.focus_score ?? 80) + 1),
        completedTasksToday: (profileRow?.completed_tasks_today ?? 0) + 1,
        totalFocusTime: profileRow?.total_focus_time,
        sessionsCompleted: profileRow?.sessions_completed,
      });

      const { error: updateProfileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          university_email: request.authUser?.email ?? "student@example.com",
          display_name: request.authUser?.fullName ?? "Student",
          preferred_language: profileRow?.preferred_language ?? "en",
          level: updatedProfile.level,
          total_xp: updatedProfile.totalXp,
          today_xp: updatedProfile.todayXp,
          streak: updatedProfile.streak,
          focus_score: updatedProfile.focusScore,
          completed_tasks_today: updatedProfile.completedTasksToday,
          total_focus_time: updatedProfile.totalFocusTime,
          sessions_completed: updatedProfile.sessionsCompleted,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (updateProfileError) {
        throw updateProfileError;
      }
    }

    response.json({ task: normalizeTask(data) });
  } catch (error) {
    next(error);
  }
});