import { createClient } from "@/lib/supabase/client";
import { getXpState } from "@/lib/xp";

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const defaultBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

async function getAccessToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function backendRequest(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No authenticated session was found.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${defaultBackendUrl}${path}`, {
    ...init,
    headers,
  });
}

export async function getDashboardBootstrap() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    let { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("Supabase profile fetch error:", profileErr);
    }

    if (!profile) {
      const email = user.email || "student@example.com";
      const fullName = (user.user_metadata?.full_name as string) || email.split("@")[0] || "Student";
      const { data: insertedProfile, error: insertErr } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          university_email: email,
          display_name: fullName,
        })
        .select("*")
        .maybeSingle();

      if (insertErr) {
        console.error("Supabase profile insert error:", insertErr);
      }
      profile = insertedProfile ?? {
        id: user.id,
        university_email: email,
        display_name: fullName,
        total_xp: 0,
        today_xp: 0,
        streak: 1,
        focus_score: 80,
        completed_tasks_today: 0,
        total_focus_time: 0,
        sessions_completed: 0,
        emergency_pin: "123456",
      };
    }

    let { data: rawTasks, error: tasksErr } = await supabase
      .from("academic_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (tasksErr) {
      console.error("Supabase tasks fetch error:", tasksErr);
    }

    if (!rawTasks || rawTasks.length === 0) {
      const starterRows = [
        {
          user_id: user.id,
          title: "Complete Focus Session",
          subject: "Focus",
          estimated_minutes: 25,
          xp_reward: 100,
          is_completed: false,
          subtasks: [
            { id: "sub-1", title: "Set timer", completed: false },
            { id: "sub-2", title: "Focus without distraction", completed: false }
          ]
        }
      ];
      await supabase.from("academic_tasks").insert(starterRows);
      const { data: seeded } = await supabase
        .from("academic_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      rawTasks = seeded ?? [];
    }

    const totalXp = profile?.total_xp ?? 0;
    const levelState = getXpState(totalXp);

    const formattedProfile = {
      id: user.id,
      email: profile?.university_email ?? user.email ?? "",
      fullName: profile?.display_name ?? (user.user_metadata?.full_name as string) ?? "Student",
      level: levelState.level,
      totalXp,
      todayXp: profile?.today_xp ?? 0,
      streak: profile?.streak ?? 1,
      focusScore: profile?.focus_score ?? 80,
      completedTasksToday: profile?.completed_tasks_today ?? 0,
      totalFocusTime: profile?.total_focus_time ?? 0,
      sessionsCompleted: profile?.sessions_completed ?? 0,
      xpIntoLevel: levelState.xpIntoLevel,
      xpNeededForNextLevel: levelState.xpNeededForNextLevel,
      xpProgressPercent: levelState.xpProgressPercent,
      emergencyPin: profile?.emergency_pin ?? "123456",
    };

    const formattedTasks = (rawTasks ?? []).map((t: any) => ({
      id: String(t.id),
      title: String(t.title ?? "Untitled task"),
      subject: String(t.subject ?? "Focus"),
      estimate: Number(t.estimated_minutes ?? t.estimate ?? 25),
      xp: Number(t.xp_reward ?? t.xp ?? 40),
      completed: Boolean(t.is_completed ?? t.completed),
      subtasks: Array.isArray(t.subtasks)
        ? t.subtasks.map((st: any, index: number) => ({
            id: st.id ?? `sub-${t.id}-${index}`,
            title: typeof st === "string" ? st : String(st.title || ""),
            completed: Boolean(st.completed),
          }))
        : [],
    }));

    return { profile: formattedProfile, tasks: formattedTasks };
  }

  const isLocalhostBackend = !process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl.includes("localhost:8080");
  if (!isLocalhostBackend) {
    try {
      const response = await backendRequest("/auth/me");
      if (response.ok) {
        return response.json();
      }
    } catch (err) {
      console.error("Backend auth/me fetch error:", err);
    }
  }

  throw new Error("Unable to load the dashboard.");
}

export async function syncDashboardProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      return { profile: { fullName: profile.display_name } };
    }
  }

  const isLocalhostBackend = !process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl.includes("localhost:8080");
  if (!isLocalhostBackend) {
    try {
      const response = await backendRequest("/auth/sync", { method: "POST" });
      if (response.ok) {
        return response.json();
      }
    } catch {}
  }

  return { profile: { fullName: "Student" } };
}

export async function updateTask(taskId: string, body: Record<string, unknown>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(taskId);
    if (!isUuid) {
      return { task: { id: taskId, ...body } };
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.completed === "boolean") {
      updates.is_completed = body.completed;
    }
    if (typeof body.title === "string" && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (typeof body.subject === "string" && body.subject.trim()) {
      updates.subject = body.subject.trim();
    }
    if (body.estimate !== undefined || body.estimated_minutes !== undefined) {
      const est = Number(body.estimate ?? body.estimated_minutes);
      if (Number.isFinite(est) && est > 0) {
        updates.estimated_minutes = Math.round(est);
        updates.xp_reward = Math.max(20, Math.round(est) * 4);
      }
    }
    if (body.subtasks !== undefined && Array.isArray(body.subtasks)) {
      updates.subtasks = body.subtasks;
    }

    const { data: existingTask } = await supabase
      .from("academic_tasks")
      .select("id,xp_reward,is_completed")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("academic_tasks")
      .update(updates)
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (!error && data) {
      if (body.completed === true && existingTask && !existingTask.is_completed) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("total_xp,today_xp,completed_tasks_today,focus_score")
          .eq("id", user.id)
          .maybeSingle();

        const xpReward = data.xp_reward ?? 25;
        const newTotalXp = (profileRow?.total_xp ?? 0) + xpReward;
        const newTodayXp = (profileRow?.today_xp ?? 0) + xpReward;
        const newCompletedCount = (profileRow?.completed_tasks_today ?? 0) + 1;
        const newFocusScore = Math.min(100, (profileRow?.focus_score ?? 80) + 1);
        const levelState = getXpState(newTotalXp);

        await supabase
          .from("profiles")
          .update({
            level: levelState.level,
            total_xp: newTotalXp,
            today_xp: newTodayXp,
            completed_tasks_today: newCompletedCount,
            focus_score: newFocusScore,
            last_active_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }

      return {
        task: {
          id: data.id,
          title: data.title,
          subject: data.subject,
          estimate: data.estimated_minutes ?? data.estimate ?? 25,
          xp: data.xp_reward ?? data.xp ?? 25,
          completed: Boolean(data.is_completed ?? data.completed),
          subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
        },
      };
    }

    if (error) {
      console.error("Supabase updateTask error:", error);
    }
  }

  const isLocalhostBackend = !process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl.includes("localhost:8080");
  if (!isLocalhostBackend) {
    try {
      const response = await backendRequest(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return response.json() as Promise<{ task: unknown }>;
      }
    } catch (err) {
      console.error("Backend updateTask fetch error:", err);
    }
  }

  return { task: { id: taskId, ...body } };
}

export async function createTask(body: Record<string, unknown>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const subject = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : "Focus";
    const estimate = Math.max(5, Math.round(Number(body.estimate ?? body.estimated_minutes ?? 25)));
    const rawSubtasks = Array.isArray(body.subtasks) ? body.subtasks : [];
    const subtasks = rawSubtasks.map((st: any, index: number) => ({
      id: typeof st === "object" && st?.id ? String(st.id) : `sub-${Date.now()}-${index}`,
      title: typeof st === "string" ? st.trim() : String(st?.title || "").trim(),
      completed: typeof st === "object" && Boolean(st?.completed),
    })).filter((s: any) => s.title !== "");

    const xpReward = Math.max(20, estimate * 4);

    const { data, error } = await supabase
      .from("academic_tasks")
      .insert({
        user_id: user.id,
        title: title || "Untitled task",
        subject,
        estimated_minutes: estimate,
        xp_reward: xpReward,
        is_completed: false,
        subtasks,
      })
      .select("*")
      .maybeSingle();

    if (!error && data) {
      return {
        task: {
          id: data.id,
          title: data.title,
          subject: data.subject,
          estimate: data.estimated_minutes ?? data.estimate ?? estimate,
          xp: data.xp_reward ?? data.xp ?? xpReward,
          completed: Boolean(data.is_completed ?? data.completed),
          subtasks: Array.isArray(data.subtasks) ? data.subtasks : subtasks,
        },
      };
    }

    if (error) {
      console.error("Supabase createTask error:", error);
    }
  }

  const isLocalhostBackend = !process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl.includes("localhost:8080");
  if (!isLocalhostBackend) {
    try {
      const response = await backendRequest("/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return response.json() as Promise<{ task: unknown }>;
      }
    } catch (err) {
      console.error("Backend createTask fetch error:", err);
    }
  }

  const title = typeof body.title === "string" ? body.title.trim() : "Untitled task";
  const subject = typeof body.subject === "string" && body.subject.trim() ? body.subject.trim() : "Focus";
  const estimate = Math.max(5, Math.round(Number(body.estimate ?? 25)));
  return {
    task: {
      id: `task-${Date.now()}`,
      title,
      subject,
      estimate,
      xp: Math.max(20, estimate * 4),
      completed: false,
      subtasks: [],
    },
  };
}

export async function deleteTask(taskId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(taskId);
    if (!isUuid) {
      return { task: { id: taskId } };
    }

    const { error } = await supabase
      .from("academic_tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (!error) {
      return { task: { id: taskId } };
    }

    if (error) {
      console.error("Supabase deleteTask error:", error);
    }
  }

  const isLocalhostBackend = !process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl.includes("localhost:8080");
  if (!isLocalhostBackend) {
    try {
      const response = await backendRequest(`/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        return response.json() as Promise<{ task: unknown }>;
      }
    } catch (err) {
      console.error("Backend deleteTask fetch error:", err);
    }
  }

  return { task: { id: taskId } };
}

export async function completePomodoro(minutes = 25) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const xpReward = Math.max(20, minutes * 4);
    await supabase.from("focus_sessions").insert({
      user_id: user.id,
      started_at: new Date(Date.now() - minutes * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      planned_minutes: minutes,
      actual_minutes: minutes,
    }).select().maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp,today_xp,total_focus_time,sessions_completed,focus_score")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const newTotalXp = (profile.total_xp ?? 0) + xpReward;
      const newTodayXp = (profile.today_xp ?? 0) + xpReward;
      const newTotalFocusTime = (profile.total_focus_time ?? 0) + minutes;
      const newSessionsCompleted = (profile.sessions_completed ?? 0) + 1;
      const newFocusScore = Math.min(100, (profile.focus_score ?? 80) + 2);
      const levelState = getXpState(newTotalXp);

      await supabase
        .from("profiles")
        .update({
          level: levelState.level,
          total_xp: newTotalXp,
          today_xp: newTodayXp,
          total_focus_time: newTotalFocusTime,
          sessions_completed: newSessionsCompleted,
          focus_score: newFocusScore,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return {
      profile: { focusScore: profile?.focus_score ?? 80 },
      reward: { xpReward },
    };
  }

  const isLocalhostBackend = !process.env.NEXT_PUBLIC_BACKEND_URL || defaultBackendUrl.includes("localhost:8080");
  if (!isLocalhostBackend) {
    try {
      const response = await backendRequest("/focus/pomodoro/complete", {
        method: "POST",
        body: JSON.stringify({ minutes, xpReward: 25 }),
      });

      if (response.ok) {
        return response.json() as Promise<{ profile: unknown; reward: unknown }>;
      }
    } catch {}
  }

  return {
    profile: { focusScore: 80 },
    reward: { xpReward: Math.max(20, minutes * 4) },
  };
}

export type AcademicExam = {
  id: string;
  title: string;
  date: string;
  createdAt: string;
};

export async function getAcademicExams(): Promise<{ exams: AcademicExam[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("academic_exams")
    .select("id,title,exam_date,created_at")
    .eq("user_id", user.id)
    .order("exam_date", { ascending: true });
  if (error) throw error;
  return { exams: (data ?? []).map((r) => ({ id: r.id, title: r.title, date: r.exam_date, createdAt: r.created_at })) };
}

export async function createAcademicExam(payload: { title: string; date: string }): Promise<{ exam: AcademicExam }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("academic_exams")
    .insert({ user_id: user.id, title: payload.title, exam_date: payload.date })
    .select("id,title,exam_date,created_at")
    .single();
  if (error) throw error;
  return { exam: { id: data.id, title: data.title, date: data.exam_date, createdAt: data.created_at } };
}

export async function deleteAcademicExam(examId: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase.from("academic_exams").delete().eq("id", examId).eq("user_id", user.id);
  if (error) throw error;
  return { success: true };
}

export type AcademicSemesterCgpa = {
  id: string;
  semesterNo: number | null;
  cgpa: number;
  createdAt: string;
};

export type AcademicCourse = {
  id: string;
  name: string;
  credits: number;
  grade: string;
  targetGrade: string;
  midMarks: number;
  createdAt: string;
};

export async function getAcademicSemesters(): Promise<{ semesters: AcademicSemesterCgpa[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("academic_semester_cgpas")
    .select("id,semester_no,cgpa_value,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return {
    semesters: (data ?? []).map((r) => ({
      id: r.id,
      semesterNo: r.semester_no,
      cgpa: Number(r.cgpa_value),
      createdAt: r.created_at,
    })),
  };
}

export async function getAcademicCourses(): Promise<{ courses: AcademicCourse[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("academic_courses")
    .select("id,name,credits,grade,target_grade,mid_marks,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return {
    courses: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      credits: Number(r.credits),
      grade: r.grade,
      targetGrade: r.target_grade,
      midMarks: Number(r.mid_marks),
      createdAt: r.created_at,
    })),
  };
}

export async function createAcademicSemester(payload: { cgpa: number; semesterNo?: number }): Promise<{ semester: AcademicSemesterCgpa }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("academic_semester_cgpas")
    .insert({
      user_id: user.id,
      cgpa_value: Math.max(0, Math.min(4, payload.cgpa)),
      semester_no: payload.semesterNo ?? null,
    })
    .select("id,semester_no,cgpa_value,created_at")
    .single();
  if (error) throw error;
  return { semester: { id: data.id, semesterNo: data.semester_no, cgpa: Number(data.cgpa_value), createdAt: data.created_at } };
}

export async function deleteAcademicSemester(semesterId: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase.from("academic_semester_cgpas").delete().eq("id", semesterId).eq("user_id", user.id);
  if (error) throw error;
  return { success: true };
}

export async function getStudyPlan(): Promise<{ content: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("academic_study_plans")
    .select("content")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { content: data?.content ?? "" };
}

export async function saveStudyPlan(content: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase
    .from("academic_study_plans")
    .upsert({ user_id: user.id, content, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function replaceAcademicCourses(
  courses: Array<{ id: string; name: string; credits: number; grade: string; targetGrade: string; midMarks: number }>,
): Promise<{ courses: AcademicCourse[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  // fetch what's currently in DB for this user
  const { data: existing, error: fetchError } = await supabase
    .from("academic_courses")
    .select("id")
    .eq("user_id", user.id);
  if (fetchError) throw fetchError;

  const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));
  const nextIds = new Set(courses.map((c) => c.id));

  const toInsert = courses.filter((c) => !existingIds.has(c.id));
  const toUpdate = courses.filter((c) => existingIds.has(c.id));
  const toDeleteIds = [...existingIds].filter((id) => !nextIds.has(id));

  // insert new courses
  if (toInsert.length > 0) {
    const { error } = await supabase.from("academic_courses").insert(
      toInsert.map((c) => ({
        id: c.id,
        user_id: user.id,
        name: c.name,
        credits: c.credits,
        grade: c.grade,
        target_grade: c.targetGrade,
        mid_marks: c.midMarks,
      }))
    );
    if (error) throw error;
  }

  // update existing courses one-by-one to avoid RLS upsert issues
  for (const c of toUpdate) {
    const { error } = await supabase
      .from("academic_courses")
      .update({
        name: c.name,
        credits: c.credits,
        grade: c.grade,
        target_grade: c.targetGrade,
        mid_marks: c.midMarks,
      })
      .eq("id", c.id)
      .eq("user_id", user.id);
    if (error) throw error;
  }

  // delete removed courses
  if (toDeleteIds.length > 0) {
    const { error } = await supabase
      .from("academic_courses")
      .delete()
      .eq("user_id", user.id)
      .in("id", toDeleteIds);
    if (error) throw error;
  }

  return { courses: [] };
}

// ─── Wellness: Hydration ─────────────────────────────────────

export async function getWellnessHydration(date?: string): Promise<{ glasses: number; goal: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  const { data } = await supabase
    .from("wellness_hydration")
    .select("glasses,goal")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .maybeSingle();
  return { glasses: data?.glasses ?? 0, goal: data?.goal ?? 8 };
}

export async function saveWellnessHydration(glasses: number, goal = 8, date?: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  await supabase
    .from("wellness_hydration")
    .upsert({ user_id: user.id, log_date: logDate, glasses, goal }, { onConflict: "user_id,log_date" });
}

// ─── Wellness: Sleep ─────────────────────────────────────────

export type SleepSession = {
  id: string;
  logDate: string;
  bedtime: string | null;
  wakeTime: string | null;
  quality: number;
  durationHours: number;
};

export async function getWellnessSleepSessions(date?: string): Promise<{ sessions: SleepSession[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  const { data, error } = await supabase
    .from("wellness_sleep_sessions")
    .select("id,log_date,bedtime,wake_time,quality,duration_hours")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return {
    sessions: (data ?? []).map((r) => ({
      id: r.id,
      logDate: r.log_date,
      bedtime: r.bedtime,
      wakeTime: r.wake_time,
      quality: r.quality,
      durationHours: Number(r.duration_hours),
    })),
  };
}

export async function addWellnessSleepSession(session: {
  bedtime?: string;
  wakeTime?: string;
  quality: number;
  durationHours: number;
  date?: string;
}): Promise<{ id: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = session.date ?? localDateStr();
  const { data, error } = await supabase
    .from("wellness_sleep_sessions")
    .insert({
      user_id: user.id,
      log_date: logDate,
      bedtime: session.bedtime ?? null,
      wake_time: session.wakeTime ?? null,
      quality: Math.max(1, Math.min(5, session.quality)),
      duration_hours: Math.max(0, session.durationHours),
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

// ─── Wellness: Mood ──────────────────────────────────────────

export type MoodEntry = {
  id: string;
  logDate: string;
  mood: string;
  note: string | null;
};

export async function getWellnessMoodEntries(date?: string): Promise<{ entries: MoodEntry[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  const { data, error } = await supabase
    .from("wellness_mood_entries")
    .select("id,log_date,mood,note")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return {
    entries: (data ?? []).map((r) => ({
      id: r.id,
      logDate: r.log_date,
      mood: r.mood,
      note: r.note,
    })),
  };
}

export async function addWellnessMoodEntry(mood: string, note?: string, date?: string): Promise<{ id: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  const { data, error } = await supabase
    .from("wellness_mood_entries")
    .insert({ user_id: user.id, log_date: logDate, mood, note: note ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

// ─── Wellness: Medications ───────────────────────────────────

export type Medication = {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string;
  timeOfDay: string;
  isActive: boolean;
};

export async function getWellnessMedications(): Promise<{ medications: Medication[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("wellness_medications")
    .select("id,name,dosage,frequency,time_of_day,is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return {
    medications: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      dosage: r.dosage,
      frequency: r.frequency,
      timeOfDay: r.time_of_day,
      isActive: r.is_active,
    })),
  };
}

export async function addWellnessMedication(med: {
  name: string;
  dosage?: string;
  frequency?: string;
  timeOfDay?: string;
}): Promise<{ id: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("wellness_medications")
    .insert({
      user_id: user.id,
      name: med.name,
      dosage: med.dosage ?? null,
      frequency: med.frequency ?? "daily",
      time_of_day: med.timeOfDay ?? "morning",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function deleteWellnessMedication(medId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  await supabase
    .from("wellness_medications")
    .update({ is_active: false })
    .eq("id", medId)
    .eq("user_id", user.id);
}

export async function getMedicationLogs(date?: string): Promise<{ logs: Record<string, boolean> }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  const { data, error } = await supabase
    .from("wellness_medication_logs")
    .select("medication_id,taken")
    .eq("user_id", user.id)
    .eq("log_date", logDate);
  if (error) throw error;
  const logs: Record<string, boolean> = {};
  (data ?? []).forEach((r) => { logs[r.medication_id] = r.taken; });
  return { logs };
}

export async function logMedicationTaken(medicationId: string, taken: boolean, date?: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  await supabase
    .from("wellness_medication_logs")
    .upsert(
      { user_id: user.id, medication_id: medicationId, log_date: logDate, taken },
      { onConflict: "medication_id,log_date" },
    );
}

// ─── Wellness: Activity (Steps) ──────────────────────────────

export async function getWellnessActivity(date?: string): Promise<{ steps: number; goal: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  const { data } = await supabase
    .from("wellness_activity")
    .select("steps,goal")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .maybeSingle();
  return { steps: data?.steps ?? 0, goal: data?.goal ?? 10000 };
}

export async function saveWellnessActivity(steps: number, goal = 10000, date?: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  await supabase
    .from("wellness_activity")
    .upsert({ user_id: user.id, log_date: logDate, steps, goal }, { onConflict: "user_id,log_date" });
}

// ─── Wellness: Body Metrics ──────────────────────────────────

export async function getWellnessBodyMetrics(date?: string): Promise<{ weightKg: number | null; heightCm: number | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  const { data } = await supabase
    .from("wellness_body_metrics")
    .select("weight_kg,height_cm")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .maybeSingle();
  return { weightKg: data?.weight_kg ?? null, heightCm: data?.height_cm ?? null };
}

export async function saveWellnessBodyMetrics(weightKg: number | null, heightCm: number | null, date?: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  await supabase
    .from("wellness_body_metrics")
    .upsert({ user_id: user.id, log_date: logDate, weight_kg: weightKg, height_cm: heightCm }, { onConflict: "user_id,log_date" });
}

// ─── Daily Wellness Snapshot ─────────────────────────────────

export type DailyWellnessEntry = {
  date: string;
  sleepHours: number;
  moodKey: string | null;
  hydrationGlasses: number;
  hydrationGoal: number;
  steps: number;
  stepsGoal: number;
};

export async function getDailyWellness(date?: string): Promise<DailyWellnessEntry> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = date ?? localDateStr();
  const { data } = await supabase
    .from("daily_wellness")
    .select("log_date,sleep_hours,mood_key,hydration_glasses,hydration_goal,steps,steps_goal")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .maybeSingle();
  return {
    date: logDate,
    sleepHours: Number(data?.sleep_hours ?? 0),
    moodKey: data?.mood_key ?? null,
    hydrationGlasses: data?.hydration_glasses ?? 0,
    hydrationGoal: data?.hydration_goal ?? 8,
    steps: data?.steps ?? 0,
    stepsGoal: data?.steps_goal ?? 10000,
  };
}

export async function upsertDailyWellness(entry: Omit<DailyWellnessEntry, "date"> & { date?: string }): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const logDate = entry.date ?? localDateStr();
  await supabase
    .from("daily_wellness")
    .upsert(
      {
        user_id: user.id,
        log_date: logDate,
        sleep_hours: entry.sleepHours,
        mood_key: entry.moodKey ?? "okay",
        hydration_glasses: entry.hydrationGlasses,
        hydration_goal: entry.hydrationGoal,
        steps: entry.steps,
        steps_goal: entry.stepsGoal,
      },
      { onConflict: "user_id,log_date" },
    );
}

export async function getDailyWellnessLog(days = 7): Promise<{ log: DailyWellnessEntry[] }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { data, error } = await supabase
    .from("daily_wellness")
    .select("log_date,sleep_hours,mood_key,hydration_glasses,hydration_goal,steps,steps_goal")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(Math.min(30, days));
  if (error) throw error;
  return {
    log: (data ?? []).map((r) => ({
      date: r.log_date,
      sleepHours: Number(r.sleep_hours),
      moodKey: r.mood_key,
      hydrationGlasses: r.hydration_glasses,
      hydrationGoal: r.hydration_goal,
      steps: r.steps,
      stepsGoal: r.steps_goal,
    })),
  };
}
