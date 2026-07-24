import { SupabaseClient } from "@supabase/supabase-js";

export interface FocusSessionRow {
  id: string;
  duration_seconds?: number;
  actual_minutes?: number;
  planned_minutes?: number;
  completed?: boolean;
  is_completed?: boolean;
  started_at?: string;
  created_at?: string;
  timestamp?: string;
}

export interface DistractionLogRow {
  id: string;
  type?: string;
  domain?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  blocked_at?: string;
}

export interface NoteRow {
  id: string;
  subject?: string;
  created_at?: string;
}

export interface WellnessLogRow {
  id: string;
  mood?: string;
  score?: number;
  sleep_hours?: number;
  hours?: number;
  logged_at?: string;
  created_at?: string;
}

export interface FinanceRow {
  amount?: number;
  category?: string;
  created_at?: string;
  date?: string;
}

export interface TaskRow {
  id: string;
  is_completed?: boolean;
  created_at?: string;
}

export interface WeeklySummary {
  focus: {
    totalSessions: number;
    completedSessions: number;
    totalFocusMinutes: number;
    avgSessionLength: number;
    bestDay: string;
    bestDayMinutes: number;
    sessionsByDay: Record<string, { count: number; minutes: number }>;
  };
  distractions: {
    total: number;
    byType: Record<string, number>;
    peakHour: string;
  };
  notes: {
    total: number;
    subjects: string[];
  };
  wellness: {
    avgMoodScore: string | null;
    avgSleepHours: string | null;
    moodEntries: number;
    sleepEntries: number;
  };
  finance: {
    totalSpent: number;
    entries: number;
  };
  tasks: {
    total: number;
    completed: number;
  };
}

export interface WeeklyDataResult {
  weekStart: string;
  weekEnd: string;
  summary: WeeklySummary;
}

export async function collectWeeklyData(
  userId: string,
  supabase: SupabaseClient,
  weekStartStr: string,
  weekEndStr: string
): Promise<WeeklyDataResult> {
  const weekStart = weekStartStr;
  const weekEnd = weekEndStr;

  // Fetch all user data in parallel
  const [
    focusRes,
    distractionRes,
    notesRes,
    wellnessRes,
    financeRes,
    tasksRes,
  ] = await Promise.all([
    supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", weekStart)
      .lte("created_at", weekEnd),

    supabase
      .from("distraction_logs")
      .select("*")
      .eq("user_id", userId)
      .or(`timestamp.gte.${weekStart},blocked_at.gte.${weekStart}`),

    supabase
      .from("notes")
      .select("id, subject, created_at")
      .eq("user_id", userId)
      .gte("created_at", weekStart),

    supabase
      .from("wellness_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", weekStart),

    supabase
      .from("transactions")
      .select("amount, category, type, date, created_at")
      .eq("user_id", userId)
      .gte("created_at", weekStart),

    supabase
      .from("academic_tasks")
      .select("id, is_completed, created_at")
      .eq("user_id", userId),
  ]);

  const sessions: FocusSessionRow[] = focusRes.data || [];
  const distractions: DistractionLogRow[] = distractionRes.data || [];
  const notes: NoteRow[] = notesRes.data || [];
  const wellness: WellnessLogRow[] = wellnessRes.data || [];
  const finances: FinanceRow[] = financeRes.data || [];
  const tasks: TaskRow[] = tasksRes.data || [];

  // Focus calculations
  const getSessionMinutes = (s: FocusSessionRow): number => {
    if (typeof s.actual_minutes === "number") return s.actual_minutes;
    if (typeof s.duration_seconds === "number") return s.duration_seconds / 60;
    if (typeof s.planned_minutes === "number") return s.planned_minutes;
    return 0;
  };

  const totalFocusMinutes = sessions.reduce(
    (sum, s) => sum + getSessionMinutes(s),
    0
  );

  const completedSessions = sessions.filter(
    (s) => s.completed === true || s.is_completed === true || getSessionMinutes(s) > 0
  ).length;

  // Distraction calculations
  const distractionsByType = distractions.reduce((acc, d) => {
    const key = d.type || d.domain || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distractionsByHour = distractions.reduce((acc, d) => {
    const timeStr = d.timestamp || d.blocked_at || new Date().toISOString();
    const hour = new Date(timeStr).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const peakDistractionHourEntry = Object.entries(distractionsByHour).sort(
    (a, b) => b[1] - a[1]
  )[0];

  let peakHour = "N/A";
  if (peakDistractionHourEntry) {
    const h = parseInt(peakDistractionHourEntry[0], 10);
    const label =
      h === 0
        ? "12 AM"
        : h < 12
        ? `${h} AM`
        : h === 12
        ? "12 PM"
        : `${h - 12} PM`;
    peakHour = `${label} (${peakDistractionHourEntry[1]} attempts)`;
  }

  // Sessions by day
  const sessionsByDay = sessions.reduce((acc, s) => {
    const dateStr = s.started_at || s.created_at || s.timestamp || new Date().toISOString();
    const day = new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
    });
    if (!acc[day]) acc[day] = { count: 0, minutes: 0 };
    acc[day].count += 1;
    acc[day].minutes += getSessionMinutes(s);
    return acc;
  }, {} as Record<string, { count: number; minutes: number }>);

  const bestDayEntry = Object.entries(sessionsByDay).sort(
    (a, b) => b[1].minutes - a[1].minutes
  )[0];

  // Wellness calculations
  const moodScores: number[] = wellness
    .map((w) => {
      if (typeof w.score === "number") return w.score;
      if (w.mood === "great" || w.mood === "happy") return 5;
      if (w.mood === "good") return 4;
      if (w.mood === "okay" || w.mood === "neutral") return 3;
      if (w.mood === "bad" || w.mood === "tired") return 2;
      if (w.mood === "terrible") return 1;
      return null;
    })
    .filter((score): score is number => score !== null);

  const avgMood = moodScores.length
    ? (moodScores.reduce((sum, val) => sum + val, 0) / moodScores.length).toFixed(1)
    : null;

  const sleepHoursList: number[] = wellness
    .map((w) => (typeof w.sleep_hours === "number" ? w.sleep_hours : w.hours))
    .filter((h): h is number => typeof h === "number" && h > 0);

  const avgSleep = sleepHoursList.length
    ? (
        sleepHoursList.reduce((sum, val) => sum + val, 0) / sleepHoursList.length
      ).toFixed(1)
    : null;

  // Finance calculation
  const totalSpend = finances.reduce((sum, f) => sum + (f.amount || 0), 0);

  const noteSubjects = Array.from(
    new Set(notes.map((n) => n.subject).filter((s): s is string => Boolean(s)))
  );

  // Tasks calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;

  return {
    weekStart,
    weekEnd,
    summary: {
      focus: {
        totalSessions: sessions.length,
        completedSessions,
        totalFocusMinutes: Math.round(totalFocusMinutes),
        avgSessionLength: sessions.length
          ? Math.round(totalFocusMinutes / sessions.length)
          : 0,
        bestDay: bestDayEntry ? bestDayEntry[0] : "N/A",
        bestDayMinutes: bestDayEntry ? Math.round(bestDayEntry[1].minutes) : 0,
        sessionsByDay,
      },
      distractions: {
        total: distractions.length,
        byType: distractionsByType,
        peakHour,
      },
      notes: {
        total: notes.length,
        subjects: noteSubjects,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
      },
      wellness: {
        avgMoodScore: avgMood,
        avgSleepHours: avgSleep,
        moodEntries: wellness.length,
        sleepEntries: sleepHoursList.length,
      },
      finance: {
        totalSpent: Math.round(totalSpend),
        entries: finances.length,
      },
    },
  };
}
