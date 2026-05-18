"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Award, BookOpen, CheckCircle2, ChevronDown, ClipboardList, CircleDollarSign, CirclePlay, Flame, HeartPulse, LayoutDashboard, LogOut, Menu, NotebookPen, Sparkles, Target, X, BrainCircuit, PenTool, Trash2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { completePomodoro, createTask, deleteTask, getDashboardBootstrap, updateTask } from "@/lib/backend";
import { createClient } from "@/lib/supabase/client";
import { cumulativeXpForLevel, getXpState, maxLevel } from "@/lib/xp";
import { LanguageProvider } from "@/components/layout/language-context";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

type Task = {
  id: string;
  title: string;
  subject: string;
  estimate: number;
  xp: number;
  completed: boolean;
  subtasks: Subtask[];
};

type Profile = {
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

type SidebarHref = "/dashboard" | "/academic" | "/focus" | "/notes" | "/finance" | "/wellness" | "/coach";

type SidebarItem = {
  label: string;
  href: SidebarHref;
  icon: typeof LayoutDashboard;
};

type LocalProgress = {
  xp: number;
  focusMinutes: number;
  sessionsCompleted: number;
  completedTasks: number;
};

const LOCAL_TASKS_KEY = "localTasks";
const LOCAL_PROGRESS_KEY = "focusnyxLocalProgressV1";

const initialLocalProgress: LocalProgress = {
  xp: 0,
  focusMinutes: 0,
  sessionsCompleted: 0,
  completedTasks: 0,
};

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Academic", href: "/academic", icon: BookOpen },
  { label: "Focus", href: "/focus", icon: CirclePlay },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Finance", href: "/finance", icon: CircleDollarSign },
  { label: "Wellness", href: "/wellness", icon: HeartPulse },
  { label: "Coach", href: "/coach", icon: BrainCircuit },
];

const badgeChips = ["Early Bird", "Focus Master", "Task Crusher"];

const fallbackTasks: Task[] = [
  {
    id: "fallback-1",
    title: "Finish discrete math revision pack",
    subject: "Mathematics",
    estimate: 25,
    xp: 40,
    completed: false,
    subtasks: [
      { id: "fallback-1-1", title: "Review chapter 1-3 examples", completed: false },
      { id: "fallback-1-2", title: "Solve practice problems set A", completed: false },
      { id: "fallback-1-3", title: "Create summary notes", completed: false },
    ],
  },
  {
    id: "fallback-2",
    title: "Plan next Pomodoro sprint",
    subject: "Focus",
    estimate: 10,
    xp: 25,
    completed: false,
    subtasks: [
      { id: "fallback-2-1", title: "Set a 25 minute timer", completed: false },
      { id: "fallback-2-2", title: "Pick one subject", completed: false },
    ],
  },
];

const dailyUpdateItems = [
  "End-of-day summary",
  "% of planned tasks completed today",
  "Focus session duration vs. target",
  "Distraction attempts blocked (extension data)",
  "Mood log prompt + quick wellness check",
  "BDT spent today vs. daily budget",
];

const weeklyReportItems = [
  "7-day behavioral graph",
  "Productivity graph: tasks done vs. planned per day",
  "Subject time distribution: which courses got most study time",
  "Focus depth score (short bursts vs. deep sessions)",
  "Budget adherence score for the week",
  "Top 3 distraction sites blocked this week",
];

const monthlyReviewItems = [
  "Strengths & weaknesses report",
  "AI-identified academic strengths: subjects improving",
  "Behavioral weaknesses: time-drain patterns, missed sessions",
  "CGPA trend correlation with study hours logged",
  "Budget health score: semester vs. actual spend",
  "Personalized improvement plan for next month (Bangla)",
];

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName || "Student";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function parseMicrotasks(text: string) {
  return text
    .split(/\n|,|•/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function getSubjectTone(subject: string) {
  const normalized = subject.toLowerCase();

  if (normalized.includes("focus")) return "bg-[#F472B6] text-white";
  if (normalized.includes("finance")) return "bg-[#34D399] text-[var(--foreground)]";
  if (normalized.includes("science")) return "bg-[#FBBF24] text-[var(--foreground)]";
  return "bg-[#8B5CF6] text-white";
}


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskSubject, setEditTaskSubject] = useState("");
  const [editTaskEstimate, setEditTaskEstimate] = useState("");
  const [editTaskMicrotasks, setEditTaskMicrotasks] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSubject, setNewTaskSubject] = useState("Focus");
  const [newTaskEstimate, setNewTaskEstimate] = useState("25");
  const [newTaskMicrotasks, setNewTaskMicrotasks] = useState("Define the goal\nBreak into steps\nStart the first step");
  const [localProgress, setLocalProgress] = useState<LocalProgress>(initialLocalProgress);


  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const dashboard = await getDashboardBootstrap();
      setUser(dashboard.profile);
      setTasks(dashboard.tasks);

      const sharedTasks = dashboard.tasks.map((task) => ({
        ...task,
        minutes: task.estimate,
        status: task.completed ? "done" : "ready",
      }));

      try {
        localStorage.setItem("userEmail", dashboard.profile.email);
        localStorage.setItem("userFullName", dashboard.profile.fullName);
        const saved = localStorage.getItem(LOCAL_TASKS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed.map((task, index) => normalizeTaskFromStorage(task as Record<string, unknown>, index)));
          } else {
            localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(sharedTasks));
          }
        } else {
          localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(sharedTasks));
        }
      } catch {
        // ignore
      }
    } catch (loadError) {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user;

      if (!sessionUser) {
        const message = loadError instanceof Error ? loadError.message : "Unable to load the dashboard.";
        setError(message);
        router.push("/auth");
        return;
      }

      const fallbackEmail = sessionUser.email || localStorage.getItem("userEmail") || "yourname@gmail.com";
      const fallbackName =
        (sessionUser.user_metadata?.full_name as string | undefined) ||
        localStorage.getItem("userFullName") ||
        fallbackEmail.split("@")[0] ||
        "Student";

      let localTasks = fallbackTasks;
      try {
        const saved = localStorage.getItem(LOCAL_TASKS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localTasks = parsed.map((task, index) => normalizeTaskFromStorage(task as Record<string, unknown>, index));
          }
        }
      } catch {
        // ignore
      }

      setUser({
        id: sessionUser.id,
        email: fallbackEmail,
        fullName: fallbackName,
        level: 1,
        totalXp: 0,
        todayXp: 0,
        streak: 1,
        focusScore: 80,
        completedTasksToday: 0,
        totalFocusTime: 0,
        sessionsCompleted: 0,
        xpIntoLevel: 0,
        xpNeededForNextLevel: cumulativeXpForLevel(2),
        xpProgressPercent: 0,
      });
      setTasks(localTasks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalProgress(readLocalProgress());
  }, []);

  const weeklyFocusSeries = useMemo(() => {
    if (!user) {
      return [];
    }

    const base = Math.max(24, Math.min(92, user.focusScore));
    return [
      { day: "M", value: base - 8 },
      { day: "T", value: base - 1 },
      { day: "W", value: base - 4 },
      { day: "T", value: base + 3 },
      { day: "F", value: base + 7 },
      { day: "S", value: base + 2 },
      { day: "S", value: base + 5 },
    ];
  }, [user]);

  const toggleTask = async (task: Task) => {
    setError("");
    const nowCompleted = !task.completed;

    if (nowCompleted) {
      const earnedXp = Math.max(20, task.xp || task.estimate * 4);
      setLocalProgress((current) => {
        const next = {
          ...current,
          xp: current.xp + earnedXp,
          completedTasks: current.completedTasks + 1,
        };
        writeLocalProgress(next);
        return next;
      });
    }

    // optimistic local update
    setTasks((current) => {
      const updated = current.map((t) => t.id === task.id ? { ...t, completed: nowCompleted } : t);
      persistLocalTasks(updated);
      return updated;
    });
    try {
      await updateTask(task.id, { completed: nowCompleted });
      await loadDashboard();
    } catch {
      // backend unavailable — local state already updated
    }
  };

  const toggleSubtask = async (task: Task, subtask: Subtask) => {
    setError("");
    const nextSubtasks = task.subtasks.map((entry) =>
      entry.id === subtask.id ? { ...entry, completed: !entry.completed } : entry,
    );
    // optimistic local update
    setTasks((current) => {
      const updated = current.map((t) => t.id === task.id ? { ...t, subtasks: nextSubtasks } : t);
      persistLocalTasks(updated);
      return updated;
    });
    try {
      await updateTask(task.id, { subtasks: nextSubtasks });
      await loadDashboard();
    } catch {
      // backend unavailable — local state already updated
    }
  };


  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    try {
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userFullName");
      localStorage.removeItem("userData");
      localStorage.removeItem("userTasks");
    } catch {
      // ignore
    }

    router.push("/auth");
  };


  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const persistLocalTasks = (updated: Task[]) => {
    try {
      const sharedShape = updated.map((task) => ({
        id: task.id,
        title: task.title,
        subject: task.subject,
        estimate: task.estimate,
        minutes: task.estimate,
        xp: task.xp,
        completed: task.completed,
        status: task.completed ? "done" : "ready",
        subtasks: task.subtasks,
      }));
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(sharedShape));
    } catch {
      // ignore
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const estimatedMinutes = Math.max(5, Number(newTaskEstimate) || 25);
    const optimisticTask: Task = {
      id: `local-${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: newTaskSubject.trim() || "Focus",
      estimate: estimatedMinutes,
      xp: Math.max(20, estimatedMinutes * 4),
      completed: false,
      subtasks: parseMicrotasks(newTaskMicrotasks).map((subtask, index) => ({
        id: `local-${Date.now()}-${index}`,
        title: subtask,
        completed: false,
      })),
    };

    const resetForm = () => {
      setNewTaskTitle("");
      setNewTaskSubject("Focus");
      setNewTaskEstimate("25");
      setNewTaskMicrotasks("Define the goal\nBreak into steps\nStart the first step");
      setShowAddTask(false);
    };

    setTasks((current) => {
      const updated = [optimisticTask, ...current];
      persistLocalTasks(updated);
      return updated;
    });
    resetForm();

    try {
      await createTask({
        title: optimisticTask.title,
        subject: optimisticTask.subject,
        estimate: optimisticTask.estimate,
        subtasks: optimisticTask.subtasks.map((s) => s.title),
      });
      await loadDashboard();
    } catch {
      // backend unavailable — task stays in local state, already persisted
    }
  };

  if (loading || !user) {
    return (
      <LanguageProvider>
        <LanguageToggle className="fixed right-4 top-4 z-50" />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffffff_45%,#f7fafc_100%)] flex items-center justify-center px-6 text-[var(--foreground)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--foreground)]" />
          <p className="text-[var(--muted-fg)]">Loading dashboard...</p>
          {error ? <p className="mt-3 max-w-sm text-sm text-red-600">{error}</p> : null}
        </div>
        </div>
      </LanguageProvider>
    );
  }

  const mergedTotalXp = Math.max(0, (user.totalXp ?? 0) + localProgress.xp);
  const mergedFocusMinutes = Math.max(0, (user.totalFocusTime ?? 0) + localProgress.focusMinutes);
  const mergedCompletedToday = Math.max(
    user.completedTasksToday ?? 0,
    tasks.filter((task) => task.completed).length,
    localProgress.completedTasks,
  );
  const mergedSessionsCompleted = Math.max(0, (user.sessionsCompleted ?? 0) + localProgress.sessionsCompleted);
  const levelState = getXpState(mergedTotalXp);
  const nextLevel = Math.min(levelState.level + 1, maxLevel);
  const xpToNext = levelState.xpNeededForNextLevel;
  const unlockedBadges = [
    mergedTotalXp >= 60 ? "Early Bird" : null,
    mergedTotalXp >= 160 ? "Focus Master" : null,
    mergedCompletedToday >= 3 ? "Task Crusher" : null,
    mergedSessionsCompleted >= 5 ? "Streak Keeper" : null,
  ].filter(Boolean) as string[];
  const focusHours = String(Math.floor(mergedFocusMinutes / 60)).padStart(2, "0");
  const focusMinutePart = String(mergedFocusMinutes % 60).padStart(2, "0");
  const weeklyCompleted = tasks.filter((task) => task.completed).length;
  const weeklyTotal = Math.max(1, tasks.length);
  const weeklyPercent = Math.min(100, Math.round((weeklyCompleted / weeklyTotal) * 100));

  return (
    <LanguageProvider>
      <LanguageToggle className="fixed right-4 top-4 z-50" />
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffffff_40%,#f8fafc_100%)] pt-20 text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b-2 border-[var(--foreground)] bg-white/95 shadow-[0_4px_0_0_#1E293B] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={() => setSidebarOpen((value) => !value)}
            className="rounded-lg border-2 border-[var(--foreground)] p-2 hover:bg-[var(--muted)]"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-3">
            <Image
              src="/icons/focusnyx.png"
              alt="Focusnyx"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl border-2 border-[var(--foreground)] object-cover shadow-[4px_4px_0_0_#1E293B]"
            />
            <div>
              <p className="font-display text-lg font-black">Focusnyx</p>
              <p className="text-xs font-semibold text-[var(--muted-fg)]">Dashboard</p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="rounded-lg border-2 border-[var(--foreground)] px-3 py-2 text-xs font-black"
          >
            Logout
          </button>
        </div>
      </header>

      {sidebarOpen ? <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-screen flex-col border-r-2 border-[var(--foreground)] bg-white px-4 py-5 shadow-[4px_0_0_0_#1E293B] transition-all duration-300 ${sidebarCollapsed ? "lg:w-[92px]" : "lg:w-[280px]"} ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <Image
              src="/icons/focusnyx.png"
              alt="Focusnyx"
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-[var(--foreground)] object-cover shadow-[4px_4px_0_0_#1E293B]"
            />
            {!sidebarCollapsed ? (
              <div>
                <p className="font-display text-xl font-black leading-none">Focusnyx</p>
                <p className="text-xs font-semibold text-[var(--muted-fg)]">Student Life OS</p>
              </div>
            ) : null}
          </Link>

          <button
            onClick={() => setSidebarCollapsed((value) => !value)}
            className="hidden rounded-lg border-2 border-[var(--foreground)] p-2 hover:bg-[var(--muted)] lg:grid"
            aria-label="Collapse sidebar"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="mt-6 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-pill flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-bold shadow-[4px_4px_0_0_#1E293B] transition-all duration-200 hover:shadow-[6px_6px_0_0_#1E293B] ${item.href === "/dashboard" ? "bg-[var(--foreground)] text-white" : "bg-white"} ${sidebarCollapsed ? "lg:justify-center lg:px-3" : ""}`}
              >
                <Icon size={18} strokeWidth={2.5} />
                {!sidebarCollapsed ? item.label : <span className="sr-only">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-6 rounded-[24px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4 shadow-[4px_4px_0_0_#1E293B] ${sidebarCollapsed ? "lg:p-3" : ""}`}>
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? "lg:justify-center" : ""}`}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
              <Sparkles size={18} strokeWidth={2.5} />
            </span>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{firstName(user.fullName)}</p>
                <p className="text-xs font-semibold text-[var(--muted-fg)]">Level {user.level}</p>
              </div>
            ) : null}
          </div>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className={`mt-4 flex items-center justify-center gap-2 rounded-[18px] border-2 border-[var(--foreground)] bg-[#FDF2F8] px-4 py-3 font-bold text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B] transition hover:translate-y-[-2px] ${sidebarCollapsed ? "lg:px-3" : ""}`}
        >
          <LogOut size={16} strokeWidth={2.5} />
          {!sidebarCollapsed ? "Logout" : <span className="sr-only">Logout</span>}
        </button>

      </aside>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]"
          >
            <h3 className="text-xl font-black">Confirm logout?</h3>
            <p className="mt-2 text-sm text-[var(--muted-fg)]">Your dashboard state is stored on the backend. You can safely sign out now.</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold"
              >
                Logout
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {showAddTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl font-black">Add Task</h3>
              <button onClick={() => setShowAddTask(false)} className="rounded-full border-2 border-[var(--foreground)] p-2">
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Task title"
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
              <input
                value={newTaskSubject}
                onChange={(event) => setNewTaskSubject(event.target.value)}
                placeholder="Subject or category"
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
              <input
                value={newTaskEstimate}
                onChange={(event) => setNewTaskEstimate(event.target.value)}
                type="number"
                min="5"
                placeholder="Estimated minutes"
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
              <textarea
                value={newTaskMicrotasks}
                onChange={(event) => setNewTaskMicrotasks(event.target.value)}
                rows={5}
                placeholder="Microtasks, one per line"
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
              <p className="text-xs font-semibold text-[var(--muted-fg)]">XP is calculated from time automatically. Separate microtasks with new lines or commas.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddTask(false)}
                  className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold"
                >
                  Cancel
                </button>
                <button onClick={handleAddTask} className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold">
                  Create Task
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}

      <main className={`flex-1 pb-10 transition-[margin] lg:pb-12 ${sidebarCollapsed ? "lg:ml-[92px]" : "lg:ml-[280px]"}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <motion.section
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative overflow-hidden rounded-[32px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8"
          >
            <div className="memphis-dots absolute inset-0 opacity-40" aria-hidden="true" />
            <span className="absolute -right-8 -top-8 hidden h-32 w-32 rounded-full bg-[#FBBF24] opacity-75 lg:block" />
            <span className="absolute -bottom-10 left-10 hidden h-24 w-24 rounded-full bg-[#8B5CF6] opacity-15 lg:block" />

            <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--muted-fg)]">Dashboard</p>
                <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:text-4xl">
                  Here's your productivity overview for this week.
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted-fg)] sm:text-lg">
                  Track your progress, focus time, and achievements all in one place.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-4 shadow-[4px_4px_0_0_#1E293B]">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-fg)]">Level {levelState.level}</p>
                    <p className="mt-2 font-display text-2xl font-black">{mergedTotalXp} XP</p>
                  </div>
                  <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[#FDF2F8] p-4 shadow-[4px_4px_0_0_#1E293B]">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted-fg)]">Progress to Level {nextLevel}</p>
                    <p className="mt-2 font-display text-2xl font-black">{levelState.xpIntoLevel} / {xpToNext || levelState.xpIntoLevel} XP</p>
                  </div>
                  <Link href="/focus" className="candy-button flex h-12 items-center gap-2 px-5 text-sm sm:h-14 sm:px-6 sm:text-base">
                    Start Focus
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[var(--foreground)] shadow-[2px_2px_0_0_#1E293B]">
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </span>
                  </Link>
                  <button onClick={toggleFullScreen} className="secondary-button ml-3 hidden h-12 items-center gap-2 px-4 text-sm lg:inline-flex">
                    Full Screen
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-4 shadow-[4px_4px_0_0_#1E293B]">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Enable Notifications</p>
                  <p className="mt-2 font-display text-2xl font-black">Daily Inspiration</p>
                  <p className="mt-2 text-sm text-[var(--muted-fg)] italic">"Hardships often prepare ordinary people for an extraordinary destiny."</p>
                  <p className="mt-1 text-xs text-[var(--muted-fg)]">— C.S. Lewis</p>
                </div>
              </div>
            </div>
          </motion.section>

          {error ? (
            <div className="mt-6 rounded-[22px] border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-[4px_4px_0_0_#1E293B]">
              {error}
            </div>
          ) : null}

          <section className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <article className="sticker-card p-6 shadow-[8px_8px_0_0_#34D399] lg:col-span-2 xl:col-span-1">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">01 Daily Update</p>
              <h2 className="mt-2 font-display text-2xl font-black">End-of-day summary</h2>
              <div className="mt-4 space-y-3">
                {dailyUpdateItems.map((item) => (
                  <div key={item} className="rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3 text-sm font-semibold shadow-[4px_4px_0_0_#1E293B]">
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="sticker-card p-6 shadow-[8px_8px_0_0_#8B5CF6] lg:col-span-2 xl:col-span-1">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">02 Weekly Report</p>
              <h2 className="mt-2 font-display text-2xl font-black">7-day snapshot</h2>
              <div className="mt-4 space-y-3">
                {weeklyReportItems.map((item) => (
                  <div key={item} className="rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3 text-sm font-semibold shadow-[4px_4px_0_0_#1E293B]">
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="sticker-card p-6 shadow-[8px_8px_0_0_#F472B6] lg:col-span-2 xl:col-span-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Recent Achievements</p>
                  <h2 className="mt-2 font-display text-2xl font-black">Badges & Progress</h2>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6" />
                    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                  </svg>
                </span>
              </div>
              
              <div className="mt-6 space-y-4">
                <div className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-4 shadow-[4px_4px_0_0_#1E293B]">
                  <p className="font-bold text-[var(--foreground)]">{mergedTotalXp} Total XP</p>
                  <p className="mt-1 text-sm text-[var(--muted-fg)]">Keep going to earn more rewards!</p>
                </div>
                
                <div className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-4 shadow-[4px_4px_0_0_#1E293B]">
                  <p className="font-bold text-[var(--foreground)]">{unlockedBadges.length} Badge{unlockedBadges.length === 1 ? "" : "s"}</p>
                  <p className="mt-1 text-sm text-[var(--muted-fg)]">{unlockedBadges.length ? unlockedBadges.join(" • ") : "No badges earned yet. Keep pushing!"}</p>
                </div>

                <div className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#FDF2F8] p-4 shadow-[4px_4px_0_0_#1E293B]">
                  <div className="flex items-center gap-2">
                    <Award size={18} strokeWidth={2.5} />
                    <p className="font-bold text-[var(--foreground)]">Inspiration Trophy</p>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted-fg)]">
                    {mergedTotalXp >= 100 ? "Unlocked for crossing 100 XP. Keep compounding your momentum." : `Earn ${100 - mergedTotalXp} more XP to unlock your first trophy.`}
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.article
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.05 * 0, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="sticker-card relative p-5 pt-8"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <Target size={20} strokeWidth={2.5} />
              </span>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted-fg)]">Focus Time</p>
              <p className="mt-3 font-display text-3xl font-black tracking-tight">{focusHours}:{focusMinutePart}</p>
            </motion.article>
            
            <motion.article
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.05 * 1, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="sticker-card relative p-5 pt-8"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <CheckCircle2 size={20} strokeWidth={2.5} />
              </span>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted-fg)]">Tasks Done</p>
              <p className="mt-3 font-display text-3xl font-black tracking-tight">{mergedCompletedToday}</p>
            </motion.article>
            
            <motion.article
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.05 * 2, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="sticker-card relative p-5 pt-8"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <Flame size={20} strokeWidth={2.5} />
              </span>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted-fg)]">Streak</p>
              <p className="mt-3 font-display text-3xl font-black tracking-tight">{Math.max(1, user.streak)}</p>
            </motion.article>
            
            <motion.article
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.05 * 3, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="sticker-card relative p-5 pt-8"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--muted-fg)]">Total XP</p>
              <p className="mt-3 font-display text-3xl font-black tracking-tight">{mergedTotalXp}</p>
            </motion.article>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-6">
              <motion.aside
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.16, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="sticker-card p-6 shadow-[8px_8px_0_0_#FBBF24]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Focus Activity (Minutes)</p>
                    <h2 className="mt-2 font-display text-3xl font-black">Weekly Overview</h2>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#FBBF24] text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18h18" />
                      <path d="m19 9-5 5-4-4-3 3" />
                    </svg>
                  </span>
                </div>
                
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)] mb-2">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                  
                  <div className="h-32 rounded-[18px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                    <div className="relative h-full">
                      <div className="absolute bottom-0 left-0 right-0 flex h-full items-end justify-between">
                        {[0, 1, 2, 3, 4, 0, 0].map((height, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="w-6 rounded-t-lg bg-[#8B5CF6] transition-all duration-300 hover:bg-[#7C3AED]"
                              style={{ height: `${(height / 4) * 100}%` }}
                            />
                            <div className="mt-2 text-xs font-black text-[var(--muted-fg)]">{height}</div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="absolute left-0 right-0 top-0 flex h-full items-center justify-between">
                        {[4, 3, 2, 1, 0].map((value, index) => (
                          <div key={index} className="text-xs text-[var(--muted-fg)] opacity-50">{value}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.aside>
              
              <motion.aside
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="sticker-card p-6 shadow-[8px_8px_0_0_#34D399]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">AI Insights</p>
                    <h2 className="mt-2 font-display text-3xl font-black">Personalized Tips</h2>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#34D399] text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B]">
                    <BrainCircuit size={20} strokeWidth={2.5} />
                  </span>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-4 shadow-[4px_4px_0_0_#1E293B]">
                    <p className="font-bold text-[var(--foreground)]">Low Focus Today</p>
                    <p className="mt-1 text-sm text-[var(--muted-fg)]">Your focus time is low today. Try a 25-minute Pomodoro session to get started.</p>
                  </div>
                  
                  <div className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-4 shadow-[4px_4px_0_0_#1E293B]">
                    <p className="font-bold text-[var(--foreground)]">Peak Performance</p>
                    <p className="mt-1 text-sm text-[var(--muted-fg)]">Your focus is highest in the morning. Schedule your most complex tasks before noon.</p>
                  </div>
                </div>
              </motion.aside>
            </div>
            
            <div className="space-y-6">
              <motion.aside
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.16, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="sticker-card p-6 shadow-[8px_8px_0_0_#F472B6]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Today's Tasks</p>
                    <h2 className="mt-2 font-display text-3xl font-black">Task List</h2>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
                    <ClipboardList size={18} strokeWidth={2.5} />
                  </span>
                </div>
                
                <div className="mt-5 max-h-[640px] space-y-3 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="rounded-[20px] border-2 border-dashed border-[var(--foreground)] bg-white px-4 py-8 text-center">
                    <p className="text-sm text-[var(--muted-fg)]">No tasks yet. Add one to build momentum.</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id}>
                      <div
                        onClick={() => setExpandedTaskId((value) => (value === task.id ? null : task.id))}
                        className={`w-full rounded-[22px] border-2 border-[var(--foreground)] px-4 py-3 text-left shadow-[4px_4px_0_0_#1E293B] transition ${task.completed ? "bg-[#ECFDF5]" : "bg-white"}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleTask(task);
                            }}
                            className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)] ${task.completed ? "bg-[#34D399]" : "bg-[#FDF2F8]"}`}
                          >
                            {task.completed ? <CheckCircle2 size={14} strokeWidth={2.5} className="text-white" /> : <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />}
                          </button>

                          <div className="min-w-0 flex-1">
                           <div className="flex items-start justify-between gap-3">
                               <div>
                                 <p className={`font-bold leading-6 ${task.completed ? "line-through text-[var(--muted-fg)]" : ""}`}>{task.title}</p>
                                 <p className="mt-1 text-xs font-semibold text-[var(--muted-fg)]">
                                   {task.subject} • {task.estimate}m
                                 </p>
                               </div>
                               <span className="hard-chip shrink-0 px-3 py-1.5 text-xs font-black text-[var(--foreground)]">+{task.xp} XP</span>
                             </div>
                             <div className="flex gap-2 mt-2">
                               {editingTaskId === task.id ? (
                                 <>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       const updatedTask: Task = {
                                         ...task,
                                         title: editTaskTitle,
                                         subject: editTaskSubject,
                                         estimate: Number(editTaskEstimate),
                                         subtasks: editTaskMicrotasks.split("\n").filter(Boolean).map((title, index) => ({
                                           id: task.subtasks[index]?.id ?? `sub-${Date.now()}-${index}`,
                                           title,
                                           completed: task.subtasks[index]?.completed ?? false
                                         }))
                                       };
                                       setTasks(prev => {
                                         const next = prev.map(t => t.id === task.id ? updatedTask : t);
                                         persistLocalTasks(next);
                                         return next;
                                       });
                                       setEditingTaskId(null);
                                     }}
                                     className="rounded-[18px] border-2 border-[var(--foreground)] px-3 py-1 text-xs font-black bg-white hover:bg-[var(--muted)]"
                                   >
                                     Save
                                   </button>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setEditingTaskId(null);
                                     }}
                                     className="rounded-[18px] border-2 border-[var(--foreground)] px-3 py-1 text-xs font-black bg-[var(--muted)] hover:bg-[var(--muted)]/80"
                                   >
                                     Cancel
                                   </button>
                                 </>
                               ) : (
                                 <>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setEditingTaskId(task.id);
                                       setEditTaskTitle(task.title);
                                       setEditTaskSubject(task.subject);
                                       setEditTaskEstimate(task.estimate.toString());
                                       setEditTaskMicrotasks(task.subtasks.map(st => st.title).join("\n"));
                                     }}
                                     className="rounded-[18px] border-2 border-[var(--foreground)] px-3 py-1 text-xs font-black bg-white hover:bg-[var(--muted)]"
                                   >
                                     <PenTool size={14} strokeWidth={1.5} />
                                   </button>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       if (window.confirm("Are you sure you want to delete this task?")) {
                                         deleteTask(task.id).then(() => {
                                           setTasks(prev => {
                                             const next = prev.filter(t => t.id !== task.id);
                                             persistLocalTasks(next);
                                             return next;
                                           });
                                         }).catch(() => {
                                           // Optimistic update - remove immediately and handle error if needed
                                           setTasks(prev => {
                                             const next = prev.filter(t => t.id !== task.id);
                                             persistLocalTasks(next);
                                             return next;
                                           });
                                         });
                                       }
                                     }}
                                     className="rounded-[18px] border-2 border-[var(--foreground)] px-3 py-1 text-xs font-black bg-white hover:bg-[var(--muted)]"
                                   >
                                     <Trash2 size={14} strokeWidth={1.5} />
                                   </button>
                                 </>
                               )}
                             </div>

                            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">
                              <span className={`rounded-full px-2 py-1 ${getSubjectTone(task.subject)}`}>{task.subject}</span>
                              {task.subtasks.length > 0 ? <ChevronDown size={16} className={`transition ${expandedTaskId === task.id ? "rotate-180" : ""}`} /> : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedTaskId === task.id && task.subtasks.length > 0 ? (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2 border-l-2 border-[var(--foreground)] pl-4">
                          {task.subtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              onClick={() => void toggleSubtask(task, subtask)}
                              className="w-full rounded-[16px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-left text-sm transition hover:bg-[var(--muted)] cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)] ${subtask.completed ? "bg-[#34D399]" : "bg-white"}`}>
                                  {subtask.completed ? <CheckCircle2 size={10} strokeWidth={3} className="text-white" /> : null}
                                </span>
                                <span className={subtask.completed ? "line-through text-[var(--muted-fg)]" : ""}>{subtask.title}</span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <button onClick={() => setShowAddTask(true)} className="mt-4 w-full rounded-[22px] border-2 border-[var(--foreground)] bg-[#FBBF24] px-4 py-3 font-black shadow-[4px_4px_0_0_#1E293B] transition hover:translate-y-1 active:shadow-none">
                + Add New Task
              </button>
              

              <div className="mt-6 rounded-[22px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Weekly Task Progress</p>
                  <p className="font-bold text-[var(--foreground)]">{weeklyCompleted} / {weeklyTotal} Planner</p>
                </div>
                <div className="h-4 rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)] overflow-hidden">
                  <div className="h-full bg-[#34D399]" style={{ width: `${weeklyPercent}%` }} />
                </div>
                <p className="mt-2 text-xs font-black text-[var(--muted-fg)] text-right">{weeklyPercent}%</p>
              </div>
            </motion.aside>
          </div>
          </section>
        </div>
      </main>
      </div>
    </LanguageProvider>
  );
}

function normalizeTaskFromStorage(task: Record<string, unknown>, index: number): Task {
  const completed = typeof task.completed === "boolean" ? task.completed : String(task.status ?? "") === "done";
  const estimateRaw = Number(task.estimate ?? task.minutes ?? 25);
  const estimate = Number.isFinite(estimateRaw) ? Math.max(5, estimateRaw) : 25;

  return {
    id: String(task.id ?? `task-${Date.now()}-${index}`),
    title: String(task.title ?? "Untitled task"),
    subject: String(task.subject ?? "Focus"),
    estimate,
    xp: Math.max(20, Number(task.xp ?? estimate * 4) || estimate * 4),
    completed,
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.map((subtask, subIndex) => {
          const entry = subtask as Record<string, unknown>;
          return {
            id: String(entry.id ?? `subtask-${index}-${subIndex}`),
            title: String(entry.title ?? "Untitled subtask"),
            completed: Boolean(entry.completed),
          };
        })
      : [],
  };
}

function readLocalProgress(): LocalProgress {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!raw) {
      return initialLocalProgress;
    }

    const parsed = JSON.parse(raw) as Partial<LocalProgress>;
    return {
      xp: Number(parsed.xp ?? 0),
      focusMinutes: Number(parsed.focusMinutes ?? 0),
      sessionsCompleted: Number(parsed.sessionsCompleted ?? 0),
      completedTasks: Number(parsed.completedTasks ?? 0),
    };
  } catch {
    return initialLocalProgress;
  }
}

function writeLocalProgress(next: LocalProgress) {
  try {
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}