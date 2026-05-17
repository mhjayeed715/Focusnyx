"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, Pause, Play, Plus, RotateCcw, ShieldAlert, Sparkles, Target, TimerReset, X } from "lucide-react";
import { useLanguage } from "@/components/layout/language-context";
import { usePomodoro } from "@/hooks/usePomodoro";
import { completePomodoro, createTask } from "@/lib/backend";

type FocusSubtask = {
  id: string;
  title: string;
  completed: boolean;
};

type FocusTask = {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  xp: number;
  status: "ready" | "in-progress" | "done";
  subtasks: FocusSubtask[];
};

type DistractionSite = {
  site: string;
  blocked: number;
  enabled: boolean;
};

const INITIAL_DISTRACTION_SITES: DistractionSite[] = [
  { site: "youtube.com", blocked: 14, enabled: true },
  { site: "facebook.com", blocked: 9, enabled: true },
  { site: "instagram.com", blocked: 6, enabled: false },
];

const FALLBACK_FOCUS_TASKS: FocusTask[] = [
  {
    id: "focus-fb-1",
    title: "Finish discrete math revision pack",
    subject: "Mathematics",
    minutes: 25,
    xp: 100,
    status: "ready",
    subtasks: [
      { id: "focus-fb-1-1", title: "Review chapter 1-3 examples", completed: false },
      { id: "focus-fb-1-2", title: "Solve practice problems set A", completed: false },
      { id: "focus-fb-1-3", title: "Create summary notes", completed: false },
    ],
  },
  {
    id: "focus-fb-2",
    title: "Plan next Pomodoro sprint",
    subject: "Focus",
    minutes: 15,
    xp: 60,
    status: "in-progress",
    subtasks: [],
  },
  {
    id: "focus-fb-3",
    title: "Write quiz answers draft",
    subject: "English",
    minutes: 15,
    xp: 60,
    status: "ready",
    subtasks: [],
  },
];

function parseMicrotasks(text: string) {
  return text
    .split(/\n|,|•/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function PomodoroPanel() {
  const { lang } = useLanguage();
  const copy = lang === "bn"
    ? {
        header: "ফোকাস ইঞ্জিন",
        title: "পোমোডোরো + হাইপারফোকাস টাইমার",
        description: "প্রিসেট বেছে নিন অথবা নিজের সময় সেট করুন। এই পেজটি সক্রিয় ফোকাস সেশন, ব্লক করা ডিস্ট্র্যাকশন, এবং আপনি যে টাস্কে কাজ করছেন তা দেখায়।",
        chips: ["XP রিওয়ার্ড", "ব্যাজ", "ডিস্ট্র্যাকশন ট্র্যাকিং", "টাস্ক লিস্ট"],
        customDuration: "কাস্টম সময়",
        start: "শুরু",
        pause: "থামান",
        reset: "রিসেট",
        running: "চলছে",
        ready: "শুরু করার জন্য প্রস্তুত",
        nextBadge: "পরবর্তী ব্যাজ",
        taskList: "টাস্ক তালিকা",
        currentQueue: "বর্তমান ফোকাস সারি",
        addTask: "টাস্ক যোগ করুন",
        complete: "সম্পন্ন করুন",
        done: "সম্পন্ন",
        progress: "ফোকাস অগ্রগতি",
        distractionTracker: "ডিস্ট্র্যাকশন প্যাটার্ন ট্র্যাকার",
        blockedAttempts: "ব্লক করা চেষ্টা",
        badges: "ব্যাজ",
        modalTitle: "টাস্ক যোগ করুন",
        taskTitle: "টাস্কের শিরোনাম",
        subject: "বিষয় বা ক্যাটাগরি",
        minutes: "আনুমানিক মিনিট",
        microtasks: "মাইক্রোটাস্ক, একেকটি লাইনে",
        xpNote: "XP সময় অনুযায়ী গণনা হয়। নতুন লাইন বা কমা দিয়ে মাইক্রোটাস্ক আলাদা করুন।",
        cancel: "বাতিল",
        createTask: "টাস্ক তৈরি করুন",
        total: "মোট",
        localSync: "টাস্ক লোকালি তৈরি হয়েছে এবং ব্যাকএন্ড পাওয়া গেলে সিঙ্ক হবে।",
        created: "তৈরি হয়েছে",
        loaded: "লোড হয়েছে",
        sessionComplete: "সেশন সম্পন্ন হয়েছে",
        blockedLabel: "ব্লক হয়েছে",
        unblocked: "আনব্লকড",
        xpText: "দীর্ঘ deep-work block short check-in-এর চেয়ে বেশি XP দেয়।",
        allUnlocked: "সব আনলক",
      }
    : {
        header: "Focus Engine",
        title: "Pomodoro + Hyperfocus Timer",
        description: "Choose a preset or set your own timer length. This page tracks active focus sessions, blocked distractions, and the task you are working on right now.",
        chips: ["XP reward", "Badges", "Distraction tracking", "Task list"],
        customDuration: "Custom duration",
        start: "Start",
        pause: "Pause",
        reset: "Reset",
        running: "Running",
        ready: "Ready to start",
        nextBadge: "Next badge",
        taskList: "Task List",
        currentQueue: "Current focus queue",
        addTask: "Add Task",
        complete: "Complete",
        done: "Done",
        progress: "Focus Progress",
        distractionTracker: "Distraction Pattern Tracker",
        blockedAttempts: "Blocked attempts",
        badges: "Badges",
        modalTitle: "Add Task",
        taskTitle: "Task title",
        subject: "Subject or category",
        minutes: "Estimated minutes",
        microtasks: "Microtasks, one per line",
        xpNote: "XP is calculated from time automatically. Separate microtasks with new lines or commas.",
        cancel: "Cancel",
        createTask: "Create Task",
        total: "Total",
        localSync: "Task created locally and will sync when the backend is available.",
        created: "Created",
        loaded: "Loaded",
        sessionComplete: "Session complete",
        blockedLabel: "blocked",
        unblocked: "Unblocked",
        xpText: "Longer deep-work blocks give more XP than short check-ins.",
        allUnlocked: "All unlocked",
      };

  const [durationMinutes, setDurationMinutes] = useState(25);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [statusMessage, setStatusMessage] = useState("");
  const [tasks, setTasks] = useState<FocusTask[]>(FALLBACK_FOCUS_TASKS);
  const [activeTaskId, setActiveTaskId] = useState(FALLBACK_FOCUS_TASKS[0]?.id ?? "");
  const [blockedSites, setBlockedSites] = useState(INITIAL_DISTRACTION_SITES);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSubject, setNewTaskSubject] = useState("Focus");
  const [newTaskEstimate, setNewTaskEstimate] = useState("25");
  const [newTaskMicrotasks, setNewTaskMicrotasks] = useState("Define the goal\nBreak into steps\nStart the first step");
  const [totalXp, setTotalXp] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("localTasks");
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return;
      }

      const normalizedTasks: FocusTask[] = parsed.map((task: Record<string, unknown>) => ({
        id: String(task.id ?? `focus-${Date.now()}`),
        title: String(task.title ?? "Untitled task"),
        subject: String(task.subject ?? "Focus"),
        minutes: Number(task.estimate ?? task.minutes ?? 25),
        xp: Number(task.xp ?? 40),
        status: task.completed ? "done" : "ready",
        subtasks: Array.isArray(task.subtasks)
          ? task.subtasks.map((subtask: Record<string, unknown>, index: number) => ({
              id: String(subtask.id ?? `${task.id ?? "task"}-${index}`),
              title: String(subtask.title ?? "Untitled subtask"),
              completed: Boolean(subtask.completed),
            }))
          : [],
      }));

      setTasks(normalizedTasks);
      setActiveTaskId(normalizedTasks[0]?.id ?? "");
    } catch {
      // ignore
    }
  }, []);

  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? tasks[0] ?? null;

  const updateTasks = (updater: (current: FocusTask[]) => FocusTask[]) => {
    setTasks((current) => {
      const next = updater(current);
      try {
        localStorage.setItem("localTasks", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const { minutes, seconds, isRunning, start, pause, reset, setDuration } = usePomodoro(durationMinutes, async () => {
    try {
      const result = await completePomodoro(durationMinutes);
      const reward = result.reward as { xpReward?: number } | undefined;
      const earnedXp = reward?.xpReward ?? Math.max(25, durationMinutes * 4);
      setTotalXp((current) => current + earnedXp);

      if (activeTask && activeTask.status !== "done") {
        updateTasks((current) => current.map((entry) => (entry.id === activeTask.id ? { ...entry, status: "done" } : entry)));
      }

      setStatusMessage(activeTask ? `${copy.sessionComplete}. +${earnedXp} XP for ${activeTask.title}` : `${copy.sessionComplete}. +${earnedXp} XP`);
    } catch {
      setStatusMessage("Session complete, but backend sync is unavailable right now.");
    }
  });

  useEffect(() => {
    setDuration(durationMinutes);
  }, [durationMinutes, setDuration]);

  const presets = useMemo(() => [15, 25, 45, 60], []);
  const completedTaskCount = useMemo(() => tasks.filter((task) => task.status === "done").length, [tasks]);
  const badges = useMemo(
    () => [
      { label: "Early Bird", unlocked: totalXp >= 60 },
      { label: "Focus Master", unlocked: totalXp >= 160 },
      { label: "Task Crusher", unlocked: completedTaskCount >= 3 },
      { label: "Streak Keeper", unlocked: totalXp >= 240 || completedTaskCount >= 5 },
    ],
    [completedTaskCount, totalXp],
  );

  const handleTaskSelect = (task: FocusTask) => {
    setActiveTaskId(task.id);
    setDurationMinutes(task.minutes);
    setCustomMinutes(task.minutes);
    reset(task.minutes);

    updateTasks((current) =>
      current.map((entry) => {
        if (entry.id === task.id && entry.status !== "done") {
          return { ...entry, status: "in-progress" };
        }

        if (entry.status === "done") {
          return entry;
        }

        return { ...entry, status: "ready" };
      }),
    );

    setStatusMessage(`${copy.loaded} ${task.title} into the timer.`);
  };

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || task.status === "done") {
      return;
    }

    updateTasks((current) => current.map((entry) => (entry.id === taskId ? { ...entry, status: "done" } : entry)));
    setTotalXp((current) => current + task.xp);

    const nextTask = tasks.find((entry) => entry.id !== taskId && entry.status !== "done");
    if (nextTask) {
      setActiveTaskId(nextTask.id);
    }

    setStatusMessage(`${task.title} ${copy.done.toLowerCase()}. +${task.xp} XP`);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      return;
    }

    const estimatedMinutes = Math.max(5, Number(newTaskEstimate) || 25);
    const subtasks = parseMicrotasks(newTaskMicrotasks);
    const optimisticTask: FocusTask = {
      id: `focus-local-${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: newTaskSubject.trim() || "Focus",
      minutes: estimatedMinutes,
      xp: Math.max(20, estimatedMinutes * 4),
      status: "ready",
      subtasks: subtasks.map((subtask, index) => ({
        id: `focus-local-${Date.now()}-${index}`,
        title: subtask,
        completed: false,
      })),
    };

    updateTasks((current) => [optimisticTask, ...current]);
    setActiveTaskId(optimisticTask.id);
    setDurationMinutes(estimatedMinutes);
    setCustomMinutes(estimatedMinutes);
    reset(estimatedMinutes);
    setShowAddTask(false);
    setNewTaskTitle("");
    setNewTaskSubject("Focus");
    setNewTaskEstimate("25");
    setNewTaskMicrotasks("Define the goal\nBreak into steps\nStart the first step");

    try {
      await createTask({
        title: optimisticTask.title,
        subject: optimisticTask.subject,
        estimate: optimisticTask.minutes,
        subtasks: optimisticTask.subtasks.map((subtask) => subtask.title),
      });
      setStatusMessage(`${copy.created} ${optimisticTask.title}.`);
    } catch {
      setStatusMessage(copy.localSync);
    }
  };

  const toggleSite = (site: string) => {
    setBlockedSites((current) => current.map((entry) => (entry.site === site ? { ...entry, enabled: !entry.enabled } : entry)));
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.header}</p>
              <h2 className="mt-2 font-display text-3xl font-black">{copy.title}</h2>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
              <TimerReset size={20} strokeWidth={2.5} />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">
            {copy.chips.map((chip) => (
              <span key={chip} className="hard-chip px-3 py-1.5">{chip}</span>
            ))}
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-fg)]">{copy.description}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setDurationMinutes(preset);
                  setCustomMinutes(preset);
                  reset(preset);
                }}
                className={`rounded-full border-2 border-[var(--foreground)] px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#1E293B] ${durationMinutes === preset ? "bg-[var(--foreground)] text-white" : "bg-[#FFF7D6]"}`}
              >
                {preset} min
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">
                <Clock3 size={14} strokeWidth={2.5} />
                {copy.customDuration}
              </span>
              <input
                value={customMinutes}
                onChange={(event) => setCustomMinutes(Number(event.target.value) || 25)}
                onBlur={() => {
                  const nextDuration = Math.max(5, Math.min(180, customMinutes));
                  setCustomMinutes(nextDuration);
                  setDurationMinutes(nextDuration);
                  reset(nextDuration);
                }}
                type="number"
                min="5"
                max="180"
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 text-base shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button onClick={start} disabled={isRunning} className="candy-button flex h-12 items-center gap-2 px-5 text-sm disabled:opacity-60">
                <Play size={16} /> {copy.start}
              </button>
              <button onClick={pause} disabled={!isRunning} className="secondary-button flex h-12 items-center gap-2 px-5 text-sm disabled:opacity-60">
                <Pause size={16} /> {copy.pause}
              </button>
              <button onClick={() => reset(durationMinutes)} className="secondary-button flex h-12 items-center gap-2 px-5 text-sm">
                <RotateCcw size={16} /> {copy.reset}
              </button>
            </div>
          </div>

          <div className="mt-6 grid place-items-center rounded-[28px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-8 shadow-[4px_4px_0_0_#1E293B]">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 flex items-center justify-center rounded-full ring-2 ring-[var(--foreground)]">
                <p className="font-display text-5xl font-black leading-none">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm font-bold text-[var(--muted-fg)]">{isRunning ? copy.running : copy.ready}</p>
            {activeTask ? (
              <div className="mt-3 flex items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#1E293B]">
                <Target size={16} strokeWidth={2.5} />
                {activeTask.title}
              </div>
            ) : null}
            {statusMessage ? <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{statusMessage}</p> : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-4 shadow-[4px_4px_0_0_#1E293B]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">XP reward</p>
              <p className="mt-2 font-display text-2xl font-black">+{Math.max(60, durationMinutes * 4)} XP</p>
            </div>
            <div className="rounded-[22px] border-2 border-[var(--foreground)] bg-[#FDF2F8] p-4 shadow-[4px_4px_0_0_#1E293B]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">Hyperfocus depth</p>
              <p className="mt-2 font-display text-2xl font-black">{Math.min(100, durationMinutes * 2)}%</p>
            </div>
            <div className="rounded-[22px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-4 shadow-[4px_4px_0_0_#1E293B]">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">{copy.nextBadge}</p>
              <p className="mt-2 font-display text-2xl font-black">{badges.find((badge) => !badge.unlocked)?.label ?? copy.allUnlocked}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.taskList}</p>
              <h3 className="mt-2 font-display text-2xl font-black">{copy.currentQueue}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="hard-chip px-3 py-1.5 text-xs font-black">{copy.total}: {totalXp} XP</span>
              <button onClick={() => setShowAddTask(true)} className="flex h-10 items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-[#FBBF24] px-4 text-sm font-black shadow-[4px_4px_0_0_#1E293B]">
                <Plus size={16} strokeWidth={2.5} />
                {copy.addTask}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {tasks.map((task) => {
              const isActive = task.id === activeTaskId;
              const isDone = task.status === "done";

              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleTaskSelect(task)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleTaskSelect(task);
                    }
                  }}
                  className={`cursor-pointer rounded-[20px] border-2 border-[var(--foreground)] px-4 py-3 shadow-[4px_4px_0_0_#1E293B] transition ${isActive ? "bg-[#FFF7D6]" : "bg-[#FAFAFA]"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`font-bold ${isDone ? "line-through text-[var(--muted-fg)]" : ""}`}>{task.title}</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--muted-fg)]">{task.subject} • {task.minutes} min</p>
                    </div>
                    <span className="hard-chip px-3 py-1.5 text-xs font-black">+{task.xp} XP</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-[var(--muted-fg)]">{isDone ? copy.done : task.status.replace("-", " ")}</span>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCompleteTask(task.id);
                      }}
                      disabled={isDone}
                      className="rounded-full border-2 border-[var(--foreground)] bg-white px-3 py-1.5 text-xs font-black shadow-[3px_3px_0_0_#1E293B] disabled:opacity-50"
                    >
                      {isDone ? copy.done : copy.complete}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-[22px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4 shadow-[4px_4px_0_0_#1E293B]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.progress}</p>
              <p className="font-bold text-[var(--foreground)]">{completedTaskCount} / {tasks.length} tasks</p>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-white">
              <div className="h-full bg-[#34D399]" style={{ width: `${tasks.length > 0 ? Math.round((completedTaskCount / tasks.length) * 100) : 0}%` }} />
            </div>
            <p className="mt-2 text-xs font-black text-[var(--muted-fg)] text-right">{tasks.length > 0 ? Math.round((completedTaskCount / tasks.length) * 100) : 0}%</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.distractionTracker}</p>
              <h3 className="mt-2 font-display text-2xl font-black">{copy.blockedAttempts}</h3>
            </div>
            <ShieldAlert size={20} className="text-[#F472B6]" />
          </div>
          <div className="mt-4 space-y-3">
            {blockedSites.map((item) => (
              <button
                key={item.site}
                type="button"
                onClick={() => toggleSite(item.site)}
                className="flex w-full items-center justify-between rounded-[18px] border-2 border-[var(--foreground)] bg-[#FFF7D6] px-4 py-3 text-left shadow-[4px_4px_0_0_#1E293B]"
              >
                <span className="font-bold">{item.site}</span>
                <span className={`rounded-full border-2 border-[var(--foreground)] px-3 py-1 text-xs font-black shadow-[3px_3px_0_0_#1E293B] ${item.enabled ? "bg-[#34D399]" : "bg-[#F472B6] text-white"}`}>
                  {item.enabled ? `${item.blocked} ${copy.blockedLabel}` : copy.unblocked}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.badges}</p>
            <Sparkles size={20} className="text-[#8B5CF6]" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge.label}
                className={`hard-chip px-4 py-2 text-sm font-bold ${badge.unlocked ? "bg-[#34D399] text-[var(--foreground)]" : "bg-[var(--muted)] text-[var(--muted-fg)]"}`}
              >
                {badge.label}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-[20px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-4 shadow-[4px_4px_0_0_#1E293B]">
            <p className="text-sm leading-7 text-[var(--foreground)]">{copy.xpText}</p>
          </div>
        </div>
      </div>

      {showAddTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl font-black">{copy.modalTitle}</h3>
              <button onClick={() => setShowAddTask(false)} className="rounded-full border-2 border-[var(--foreground)] p-2">
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder={copy.taskTitle}
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
              <input
                value={newTaskSubject}
                onChange={(event) => setNewTaskSubject(event.target.value)}
                placeholder={copy.subject}
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
              <input
                value={newTaskEstimate}
                onChange={(event) => setNewTaskEstimate(event.target.value)}
                type="number"
                min="5"
                placeholder={copy.minutes}
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
              <textarea
                value={newTaskMicrotasks}
                onChange={(event) => setNewTaskMicrotasks(event.target.value)}
                rows={5}
                placeholder={copy.microtasks}
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none"
              />
              <p className="text-xs font-semibold text-[var(--muted-fg)]">{copy.xpNote}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddTask(false)}
                  className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold"
                >
                  {copy.cancel}
                </button>
                <button onClick={handleAddTask} className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold">
                  {copy.createTask}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </section>
  );
}
