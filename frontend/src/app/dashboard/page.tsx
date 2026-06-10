"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Award, BookOpen, CheckCircle2, ChevronDown, ClipboardList, CircleDollarSign, CirclePlay, Clock3, Flame, HeartPulse, LayoutDashboard, NotebookPen, Sparkles, Target, X, BrainCircuit, PenTool, Trash2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { createTask, deleteTask, getDashboardBootstrap, updateTask } from "@/lib/backend";
import { createClient } from "@/lib/supabase/client";
import { cumulativeXpForLevel, getXpState, maxLevel } from "@/lib/xp";
import { useLanguage } from "@/components/layout/language-context";
import { AppShell } from "@/components/layout/AppShell";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { DashboardSkeleton } from "@/components/ui/PageSkeleton";


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

const dashboardCopy = {
  en: {
    loading: "Loading dashboard...",
    dashboard: "Dashboard",
    welcome: "Welcome back",
    subtitle: "One clean view for your day: tasks, focus trend, and progress.",
    startFocus: "Start Focus",
    addTask: "Add Task",
    fullScreen: "Full Screen",
    focusTime: "Focus Time",
    tasksDone: "Tasks Done",
    streak: "Streak",
    totalXp: "Total XP",
    todaysTasks: "Today's Tasks",
    taskList: "Task List",
    noTasks: "No tasks yet. Add one to get started.",
    openFocus: "Open Focus",
    focusTrend: "Focus Trend",
    weeklyFocus: "Weekly Focus",
    thisWeek: "This Week",
    planner: "Planner",
    badges: "Badges",
    level: "Level",
    nextLevelXp: "Next Level XP",
    xpNeeded: "XP needed",
    done: "done",
    aiInsights: "AI Insights",
    simpleRecommendations: "Simple Recommendations",
    insightOne: "Focus time is usually strongest in the morning. Schedule your hardest task before noon.",
    insightTwo: "If you feel stuck, complete one 10-minute subtask to build momentum quickly.",
    save: "Save",
    cancel: "Cancel",
    logout: "Logout",
    addNewTask: "+ Add New Task",
  },
  bn: {
    loading: "ড্যাশবোর্ড লোড হচ্ছে...",
    dashboard: "ড্যাশবোর্ড",
    welcome: "ফিরে আসায় স্বাগতম",
    subtitle: "আপনার দিনের জন্য একটি সহজ ভিউ: টাস্ক, ফোকাস ট্রেন্ড এবং প্রগ্রেস।",
    startFocus: "ফোকাস শুরু করুন",
    addTask: "টাস্ক যোগ করুন",
    fullScreen: "ফুল স্ক্রিন",
    focusTime: "ফোকাস সময়",
    tasksDone: "সম্পন্ন টাস্ক",
    streak: "স্ট্রিক",
    totalXp: "মোট XP",
    todaysTasks: "আজকের টাস্ক",
    taskList: "টাস্ক তালিকা",
    noTasks: "এখনও কোনো টাস্ক নেই। শুরু করতে একটি যোগ করুন।",
    openFocus: "ফোকাস খুলুন",
    focusTrend: "ফোকাস ট্রেন্ড",
    weeklyFocus: "সাপ্তাহিক ফোকাস",
    thisWeek: "এই সপ্তাহ",
    planner: "প্ল্যানার",
    badges: "ব্যাজ",
    level: "লেভেল",
    nextLevelXp: "পরের লেভেল XP",
    xpNeeded: "প্রয়োজনীয় XP",
    done: "সম্পন্ন",
    aiInsights: "AI ইনসাইটস",
    simpleRecommendations: "সহজ পরামর্শ",
    insightOne: "সকালে আপনার ফোকাস বেশি থাকে। কঠিন কাজগুলো দুপুরের আগে করুন।",
    insightTwo: "আটকে গেলে ১০ মিনিটের একটি সাবটাস্ক শেষ করুন, দ্রুত গতি ফিরে পাবেন।",
    save: "সেভ",
    cancel: "বাতিল",
    logout: "লগআউট",
    addNewTask: "+ নতুন টাস্ক যোগ করুন",
  },
} as const;

const motivationalQuotes = [
  {
    en: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    bn: "সাফল্য চূড়ান্ত নয়, ব্যর্থতা শেষ নয়; এগিয়ে যাওয়ার সাহসটাই আসল।",
    author: "Winston Churchill",
  },
  {
    en: "Do the hard jobs first. The easy jobs will take care of themselves.",
    bn: "কঠিন কাজগুলো আগে করুন। সহজ কাজগুলো নিজেই হয়ে যাবে।",
    author: "Dale Carnegie",
  },
  {
    en: "Discipline is choosing between what you want now and what you want most.",
    bn: "শৃঙ্খলা মানে এখন যা চাই আর সবচেয়ে বেশি যা চাই - এর মাঝে সঠিকটা বেছে নেওয়া।",
    author: "Abraham Lincoln",
  },
  {
    en: "Small progress each day adds up to big results.",
    bn: "প্রতিদিনের ছোট অগ্রগতি একসময় বড় ফল এনে দেয়।",
    author: "Satya Nani",
  },
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
  const { lang } = useLanguage();
  const copy = dashboardCopy[lang];
  const [quoteIndex] = useState(() => Math.floor(Math.random() * motivationalQuotes.length));
  const activeQuote = motivationalQuotes[quoteIndex];
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      <AppShell title={copy.dashboard} loading skeleton={<DashboardSkeleton />}>
        <></>
      </AppShell>
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
  const levelProgressPercent = xpToNext > 0 ? Math.min(100, Math.round((levelState.xpIntoLevel / xpToNext) * 100)) : 100;
  const xpRemainingForNextLevel = Math.max(0, (xpToNext || 0) - levelState.xpIntoLevel);
  const levelRingRadius = 42;
  const levelRingCircumference = 2 * Math.PI * levelRingRadius;
  const levelRingOffset = levelRingCircumference - (levelProgressPercent / 100) * levelRingCircumference;

  return (
    <AppShell title={copy.dashboard} confirmLogout={true}>
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
                  className="secondary-button inline-flex h-12 flex-1 items-center justify-center rounded-[18px] border-2 border-[var(--foreground)] px-4 font-bold leading-none"
                >
                  {copy.cancel}
                </button>
                <button onClick={handleAddTask} className="candy-button inline-flex h-12 flex-1 items-center justify-center rounded-[18px] border-2 border-[var(--foreground)] px-4 font-bold leading-none">
                  {copy.addTask}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="sticker-card p-6 shadow-[8px_8px_0_0_#DDE7F0] sm:p-7"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{getGreeting()}</p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">{copy.welcome}, {firstName(user.fullName)}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted-fg)] sm:text-base">
              {copy.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/focus" className="candy-button inline-flex h-12 items-center justify-center gap-2 px-5 text-sm leading-none">
              {copy.startFocus}
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
            <button onClick={() => setShowAddTask(true)} className="secondary-button inline-flex h-12 items-center justify-center px-5 text-sm font-bold leading-none">
              {copy.addTask}
            </button>
            <button onClick={toggleFullScreen} className="secondary-button hidden h-12 items-center justify-center px-5 text-sm font-bold leading-none lg:inline-flex">
              {copy.fullScreen}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[18px] border-2 border-[var(--foreground)] bg-[#ECFDF5] px-4 py-3 text-sm text-[var(--muted-fg)]">
          "{lang === "bn" ? activeQuote.bn : activeQuote.en}" - {activeQuote.author}
        </div>
      </motion.section>

      {error ? (
        <div className="mt-6 rounded-[18px] border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="sticker-card bg-[#F3E8FF] p-5 shadow-[8px_8px_0_0_#D6BCFA]">
          <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white">
            <Clock3 size={16} strokeWidth={2.5} />
          </span>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{copy.focusTime}</p>
          <p className="mt-2 font-display text-3xl font-black">{focusHours}:{focusMinutePart}</p>
        </article>
        <article className="sticker-card bg-[#FDF2F8] p-5 shadow-[8px_8px_0_0_#F9A8D4]">
          <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white">
            <CheckCircle2 size={16} strokeWidth={2.5} />
          </span>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{copy.tasksDone}</p>
          <p className="mt-2 font-display text-3xl font-black">{mergedCompletedToday}</p>
        </article>
        <article className="sticker-card bg-[#FFF7D6] p-5 shadow-[8px_8px_0_0_#FCD34D]">
          <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white">
            <Flame size={16} strokeWidth={2.5} />
          </span>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{copy.streak}</p>
          <p className="mt-2 font-display text-3xl font-black">{Math.max(1, user.streak)}</p>
        </article>
        <article className="sticker-card bg-[#ECFDF5] p-5 shadow-[8px_8px_0_0_#6EE7B7]">
          <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white">
            <Sparkles size={16} strokeWidth={2.5} />
          </span>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{copy.totalXp}</p>
          <p className="mt-2 font-display text-3xl font-black">{mergedTotalXp}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#F9A8D4]"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{copy.todaysTasks}</p>
              <h2 className="mt-2 font-display text-2xl font-black">{copy.taskList}</h2>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#FDF2F8]">
              <ClipboardList size={16} strokeWidth={2.5} />
            </span>
          </div>

          <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <div className="rounded-[16px] border-2 border-dashed border-[var(--foreground)] bg-white px-4 py-8 text-center">
                <p className="text-sm text-[var(--muted-fg)]">{copy.noTasks}</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id}>
                  <div
                    onClick={() => setExpandedTaskId((value) => (value === task.id ? null : task.id))}
                    className={`w-full rounded-[16px] border-2 border-[var(--foreground)] px-4 py-3 text-left transition ${task.completed ? "bg-[#ECFDF5]" : "bg-white"}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleTask(task);
                        }}
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)] ${task.completed ? "bg-[#34D399]" : "bg-[#FDF2F8]"}`}
                      >
                        {task.completed ? <CheckCircle2 size={14} strokeWidth={2.5} className="text-white" /> : <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`font-bold leading-6 ${task.completed ? "line-through text-[var(--muted-fg)]" : ""}`}>{task.title}</p>
                            <p className="mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">{task.subject} • {task.estimate}m</p>
                          </div>
                          <span className="rounded-full border-2 border-[var(--foreground)] bg-white px-2.5 py-1 text-xs font-black">+{task.xp} XP</span>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTaskId(task.id);
                                setEditTaskTitle(task.title);
                                setEditTaskSubject(task.subject);
                                setEditTaskEstimate(task.estimate.toString());
                                setEditTaskMicrotasks(task.subtasks.map((st) => st.title).join("\n"));
                              }}
                              className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-2 py-1"
                              aria-label="Edit task"
                            >
                              <PenTool size={13} strokeWidth={2} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to delete this task?")) {
                                  deleteTask(task.id)
                                    .then(() => {
                                      setTasks((prev) => {
                                        const next = prev.filter((t) => t.id !== task.id);
                                        persistLocalTasks(next);
                                        return next;
                                      });
                                    })
                                    .catch(() => {
                                      setTasks((prev) => {
                                        const next = prev.filter((t) => t.id !== task.id);
                                        persistLocalTasks(next);
                                        return next;
                                      });
                                    });
                                }
                              }}
                              className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-2 py-1"
                              aria-label="Delete task"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
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
                                      subtasks: editTaskMicrotasks
                                        .split("\n")
                                        .filter(Boolean)
                                        .map((title, index) => ({
                                          id: task.subtasks[index]?.id ?? `sub-${Date.now()}-${index}`,
                                          title,
                                          completed: task.subtasks[index]?.completed ?? false,
                                        })),
                                    };
                                    setTasks((prev) => {
                                      const next = prev.map((t) => (t.id === task.id ? updatedTask : t));
                                      persistLocalTasks(next);
                                      return next;
                                    });
                                    setEditingTaskId(null);
                                  }}
                                  className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-2.5 py-1 text-xs font-black"
                                >
                                  {copy.save}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTaskId(null);
                                  }}
                                  className="rounded-[12px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-2.5 py-1 text-xs font-black"
                                >
                                  {copy.cancel}
                                </button>
                              </>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getSubjectTone(task.subject)}`}>{task.subject}</span>
                            {task.subtasks.length > 0 ? <ChevronDown size={15} className={`transition ${expandedTaskId === task.id ? "rotate-180" : ""}`} /> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedTaskId === task.id && task.subtasks.length > 0 ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2 border-l-2 border-[var(--border)] pl-4">
                      {task.subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          onClick={() => void toggleSubtask(task, subtask)}
                          className="cursor-pointer rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm hover:bg-[var(--muted)]"
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

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => setShowAddTask(true)} className="candy-button inline-flex h-12 items-center justify-center px-5 text-sm leading-none">{copy.addNewTask}</button>
            <Link href="/focus" className="secondary-button inline-flex h-12 items-center justify-center px-5 text-sm font-bold leading-none">{copy.openFocus}</Link>
          </div>
        </motion.aside>

        <div className="space-y-6">
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#D6BCFA]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{copy.focusTrend}</p>
                <h2 className="mt-1 font-display text-2xl font-black">{copy.weeklyFocus}</h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6]">
                <Target size={16} strokeWidth={2.5} />
              </span>
            </div>

            <div className="mt-4 h-44 rounded-[14px] border-2 border-[var(--foreground)] bg-white p-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyFocusSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="focusTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "2px solid #1E293B",
                      background: "#ffffff",
                      fontWeight: 700,
                    }}
                    cursor={{ stroke: "#8B5CF6", strokeOpacity: 0.35 }}
                    formatter={(value) => [`${value} score`, "Focus"]}
                  />
                  <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={3} fill="url(#focusTrendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.aside>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#86EFAC]"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{copy.thisWeek}</p>
              <span className="rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5] px-2.5 py-1 text-xs font-black">{weeklyPercent}% {copy.done}</span>
            </div>

            <div className="mt-4 h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
              <div className="h-full bg-[#34D399]" style={{ width: `${weeklyPercent}%` }} />
            </div>

            <div className="mt-4 rounded-[14px] border-2 border-[var(--foreground)] bg-[#F8FAFC] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--muted-fg)]">{copy.level}</p>
                  <p className="font-display text-2xl font-black">{levelState.level}</p>
                </div>
                <div className="relative grid h-[108px] w-[108px] place-items-center">
                  <svg viewBox="0 0 100 100" className="h-[108px] w-[108px] -rotate-90">
                    <circle cx="50" cy="50" r={levelRingRadius} fill="none" stroke="#E2E8F0" strokeWidth="9" />
                    <circle
                      cx="50"
                      cy="50"
                      r={levelRingRadius}
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={levelRingCircumference}
                      strokeDashoffset={levelRingOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <p className="text-lg font-black leading-none">{levelProgressPercent}%</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-fg)]">{copy.done}</p>
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2.5 py-2">
                  <p className="font-bold text-[var(--muted-fg)]">{copy.nextLevelXp}</p>
                  <p className="font-black">{levelState.xpIntoLevel}/{xpToNext || levelState.xpIntoLevel}</p>
                </div>
                <div className="rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2.5 py-2">
                  <p className="font-bold text-[var(--muted-fg)]">{copy.xpNeeded}</p>
                  <p className="font-black">{xpRemainingForNextLevel} XP</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2">
                <span className="mb-1 inline-grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6]">
                  <ClipboardList size={13} strokeWidth={2.5} />
                </span>
                <p className="text-[var(--muted-fg)]">{copy.planner}</p>
                <p className="font-black">{weeklyCompleted} / {weeklyTotal}</p>
              </div>
              <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2">
                <span className="mb-1 inline-grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#FDF2F8]">
                  <Award size={13} strokeWidth={2.5} />
                </span>
                <p className="text-[var(--muted-fg)]">{copy.badges}</p>
                <p className="font-black">{unlockedBadges.length}</p>
              </div>
              <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2">
                <span className="mb-1 inline-grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F3E8FF]">
                  <Target size={13} strokeWidth={2.5} />
                </span>
                <p className="text-[var(--muted-fg)]">{copy.level}</p>
                <p className="font-black">{levelState.level}</p>
              </div>
              <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2">
                <span className="mb-1 inline-grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5]">
                  <ArrowRight size={13} strokeWidth={2.5} />
                </span>
                <p className="text-[var(--muted-fg)]">{copy.nextLevelXp}</p>
                <p className="font-black">{levelState.xpIntoLevel}/{xpToNext || levelState.xpIntoLevel}</p>
              </div>
            </div>
          </motion.aside>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 }}
            className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#FCD34D]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{copy.aiInsights}</p>
                <h2 className="mt-1 font-display text-2xl font-black">{copy.simpleRecommendations}</h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5]">
                <BrainCircuit size={16} strokeWidth={2.5} />
              </span>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-[var(--muted-fg)]">
              <li className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2">
                {copy.insightOne}
              </li>
              <li className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2">
                {copy.insightTwo}
              </li>
            </ul>
          </motion.aside>
        </div>
      </section>
    </AppShell>
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