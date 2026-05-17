export type DashboardSubtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type DashboardTask = {
  id: string;
  title: string;
  subject: string;
  estimate: number;
  xp: number;
  completed: boolean;
  subtasks: DashboardSubtask[];
  createdAt?: string;
};

export type DashboardProfile = {
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

export const maxLevel = 100;

export function cumulativeXpForLevel(level: number) {
  if (level <= 1) {
    return 0;
  }

  return (100 * (level - 1) * level) / 2;
}

export function calculateLevel(totalXp: number) {
  let level = 1;

  while (level < maxLevel && totalXp >= cumulativeXpForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function getXpState(totalXp: number) {
  const level = calculateLevel(totalXp);
  const currentLevelStart = cumulativeXpForLevel(level);
  const nextLevelStart = level >= maxLevel ? currentLevelStart : cumulativeXpForLevel(level + 1);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelStart);
  const xpNeededForNextLevel = Math.max(0, nextLevelStart - currentLevelStart);
  const xpProgressPercent = xpNeededForNextLevel > 0 ? (xpIntoLevel / xpNeededForNextLevel) * 100 : 100;

  return {
    level,
    xpIntoLevel,
    xpNeededForNextLevel,
    xpProgressPercent,
  };
}

export function calculateStreak(previousLastActiveAt: string | null | undefined, currentStreak: number) {
  if (!previousLastActiveAt) {
    return 1;
  }

  const lastActive = new Date(previousLastActiveAt);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const lastActiveDay = lastActive.toDateString();
  const todayDay = today.toDateString();
  const yesterdayDay = yesterday.toDateString();

  if (lastActiveDay === todayDay) {
    return Math.max(1, currentStreak);
  }

  if (lastActiveDay === yesterdayDay) {
    return Math.min(maxLevel, Math.max(1, currentStreak) + 1);
  }

  return 1;
}

export function buildProfile(input: {
  id: string;
  email: string;
  fullName?: string | null;
  level?: number | null;
  totalXp?: number | null;
  todayXp?: number | null;
  streak?: number | null;
  focusScore?: number | null;
  completedTasksToday?: number | null;
  totalFocusTime?: number | null;
  sessionsCompleted?: number | null;
}): DashboardProfile {
  const totalXp = input.totalXp ?? 0;
  const xpState = getXpState(totalXp);

  return {
    id: input.id,
    email: input.email,
    fullName: input.fullName?.trim() || input.email.split("@")[0] || "Student",
    level: Math.min(maxLevel, Math.max(input.level ?? 1, xpState.level)),
    totalXp,
    todayXp: input.todayXp ?? 0,
    streak: input.streak ?? 1,
    focusScore: input.focusScore ?? 80,
    completedTasksToday: input.completedTasksToday ?? 0,
    totalFocusTime: input.totalFocusTime ?? 0,
    sessionsCompleted: input.sessionsCompleted ?? 0,
    xpIntoLevel: xpState.xpIntoLevel,
    xpNeededForNextLevel: xpState.xpNeededForNextLevel,
    xpProgressPercent: xpState.xpProgressPercent,
  };
}

export const starterTasks: DashboardTask[] = [
  {
    id: "starter-1",
    title: "Finish discrete math revision pack",
    subject: "Mathematics",
    estimate: 25,
    xp: 40,
    completed: false,
    subtasks: [
      { id: "starter-1-1", title: "Review chapter 1-3 examples", completed: false },
      { id: "starter-1-2", title: "Solve practice problems set A", completed: false },
      { id: "starter-1-3", title: "Create summary notes", completed: false },
    ],
  },
  {
    id: "starter-2",
    title: "Review accounting notes and formula sheet",
    subject: "Finance",
    estimate: 20,
    xp: 35,
    completed: false,
    subtasks: [
      { id: "starter-2-1", title: "Read chapter 4-5", completed: false },
      { id: "starter-2-2", title: "Memorize key formulas", completed: false },
    ],
  },
  {
    id: "starter-3",
    title: "Record physics lecture summary",
    subject: "Science",
    estimate: 15,
    xp: 25,
    completed: false,
    subtasks: [
      { id: "starter-3-1", title: "Watch lecture recording", completed: false },
      { id: "starter-3-2", title: "Take detailed notes", completed: false },
    ],
  },
  {
    id: "starter-4",
    title: "Prepare weekly budget log",
    subject: "Finance",
    estimate: 10,
    xp: 20,
    completed: false,
    subtasks: [
      { id: "starter-4-1", title: "Collect receipts", completed: false },
      { id: "starter-4-2", title: "Categorize expenses", completed: false },
    ],
  },
  {
    id: "starter-5",
    title: "Plan next Pomodoro sprint",
    subject: "Focus",
    estimate: 5,
    xp: 15,
    completed: false,
    subtasks: [
      { id: "starter-5-1", title: "List 3 focus goals", completed: false },
      { id: "starter-5-2", title: "Set timer schedule", completed: false },
    ],
  },
];

export function normalizeTask(task: {
  id: string;
  title: string;
  subject: string;
  estimated_minutes?: number | null;
  xp_reward?: number | null;
  is_completed?: boolean | null;
  microtasks?: Array<{ id?: string; title: string; completed?: boolean }> | null;
  created_at?: string | null;
}): DashboardTask {
  return {
    id: task.id,
    title: task.title,
    subject: task.subject,
    estimate: task.estimated_minutes ?? 25,
    xp: task.xp_reward ?? 0,
    completed: task.is_completed ?? false,
    subtasks: (task.microtasks ?? []).map((microtask, index) => ({
      id: microtask.id ?? `${task.id}-${index + 1}`,
      title: microtask.title,
      completed: microtask.completed ?? false,
    })),
    createdAt: task.created_at ?? undefined,
  };
}

export function toPublicDashboard(profile: DashboardProfile, tasks: DashboardTask[]) {
  return { profile, tasks };
}