import { createClient } from "@/lib/supabase/client";

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
  const response = await backendRequest("/auth/me");

  if (!response.ok) {
    throw new Error("Unable to load the dashboard.");
  }

  return response.json() as Promise<{
    profile: {
      id: string;
      email: string;
      fullName: string;
      level: number;
      totalXp: number;
      todayXp: number;
      streak: number;
      focusScore: number;
      completedTasksToday: number;
      totalFocusTime: number;
      sessionsCompleted: number;
      xpIntoLevel: number;
      xpNeededForNextLevel: number;
      xpProgressPercent: number;
    };
    tasks: Array<{
      id: string;
      title: string;
      subject: string;
      estimate: number;
      xp: number;
      completed: boolean;
      subtasks: Array<{ id: string; title: string; completed: boolean }>;
    }>;
  }>;
}

export async function syncDashboardProfile() {
  const response = await backendRequest("/auth/sync", { method: "POST" });

  if (!response.ok) {
    throw new Error("Unable to sync profile.");
  }

  return response.json() as Promise<{ profile: { fullName: string } }>;
}

export async function updateTask(taskId: string, body: Record<string, unknown>) {
  const response = await backendRequest(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Unable to update task.");
  }

  return response.json() as Promise<{ task: unknown }>;
}

export async function createTask(body: Record<string, unknown>) {
  const response = await backendRequest("/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Unable to create task.");
  }

  return response.json() as Promise<{ task: unknown }>;
}

export async function deleteTask(taskId: string) {
  const response = await backendRequest(`/tasks/${taskId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Unable to delete task.");
  }

  return response.json() as Promise<{ task: unknown }>;
}

export async function completePomodoro(minutes = 25) {
  try {
    const response = await backendRequest("/focus/pomodoro/complete", {
      method: "POST",
      body: JSON.stringify({ minutes, xpReward: 25 }),
    });

    if (!response.ok) {
      throw new Error("Unable to record the focus session.");
    }

    return response.json() as Promise<{ profile: unknown; reward: unknown }>;
  } catch (err) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("focus_sessions").insert({
        user_id: user.id,
        duration: minutes,
        completed: true,
      });
    }
    throw err;
  }
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
