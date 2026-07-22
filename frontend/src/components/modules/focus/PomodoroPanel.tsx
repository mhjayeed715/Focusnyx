"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, Image as ImageIcon, LibraryBig, Link2, Maximize2, Minimize2, Music2, Pause, Play, Plus, Radio, RotateCcw, ShieldAlert, Sparkles, Target, TimerReset, Volume2, X, Youtube } from "lucide-react";
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

type StudyResourceType = "youtube" | "pdf" | "image";

type StudyResource = {
  id: string;
  type: StudyResourceType;
  title: string;
  link: string;
  source: "link" | "file";
  mimeType?: string;
};

type LocalProgress = {
  xp: number;
  focusMinutes: number;
  sessionsCompleted: number;
  completedTasks: number;
};

const LOCAL_TASKS_KEY = "localTasks";
const LOCAL_PROGRESS_KEY = "focusnyxLocalProgressV1";
const LOCAL_RESOURCES_KEY = "focusnyxStudyResourcesV1";

const initialLocalProgress: LocalProgress = {
  xp: 0,
  focusMinutes: 0,
  sessionsCompleted: 0,
  completedTasks: 0,
};

const FOCUS_DURATION_PRESETS = [20, 25, 30, 60];
const SOUND_PRESETS: Array<{ key: "none" | "rain" | "white" | "lofi"; label: string; icon: typeof Music2 }> = [
  { key: "none", label: "None", icon: Music2 },
  { key: "rain", label: "Rain", icon: Radio },
  { key: "white", label: "White", icon: Volume2 },
  { key: "lofi", label: "Lo-fi", icon: Music2 },
];

type AudioEngine = {
  stop: () => void;
};

function createAmbientAudio(sound: "none" | "rain" | "white" | "lofi", volume: number): AudioEngine | null {
  if (sound === "none") {
    return null;
  }

  const audio = new Audio();
  audio.loop = true;
  audio.volume = Math.max(0, Math.min(1, volume / 100));

  const soundMap: Record<string, string> = {
    rain: "/audios/rain.mp3",
    white: "/audios/whitesound.mp3",
    lofi: "/audios/lofi.mp3",
  };

  audio.src = soundMap[sound] || "/audios/rain.mp3";
  audio.play().catch(() => {
    // ignore autoplay policy errors
  });

  return {
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
  };
}

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

function readStudyResources(): StudyResource[] {
  try {
    const raw = localStorage.getItem(LOCAL_RESOURCES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((entry, index) => {
      const resource = entry as Record<string, unknown>;
      const type = resource.type === "pdf" || resource.type === "image" ? resource.type : "youtube";

      return {
        id: String(resource.id ?? `resource-${Date.now()}-${index}`),
        type,
        title: String(resource.title ?? "Untitled resource"),
        link: String(resource.link ?? ""),
        source: resource.source === "file" ? "file" : "link",
        mimeType: typeof resource.mimeType === "string" ? resource.mimeType : undefined,
      };
    });
  } catch {
    return [];
  }
}

function writeStudyResources(resources: StudyResource[]) {
  try {
    localStorage.setItem(LOCAL_RESOURCES_KEY, JSON.stringify(resources));
  } catch {
    // ignore
  }
}

async function fileToResource(file: File): Promise<StudyResource> {
  const url = URL.createObjectURL(file);
  const type: StudyResourceType = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "pdf";

  return {
    id: `resource-${Date.now()}`,
    type,
    title: file.name.replace(/\.[^.]+$/, ""),
    link: url,
    source: "file",
    mimeType: file.type || "application/octet-stream",
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

function toSharedTaskShape(tasks: FocusTask[]) {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    subject: task.subject,
    estimate: task.minutes,
    minutes: task.minutes,
    xp: task.xp,
    completed: task.status === "done",
    status: task.status,
    subtasks: task.subtasks,
  }));
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getYouTubeEmbedUrl(url: string): string {
  const videoId = extractYouTubeId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [focusSound, setFocusSound] = useState<"none" | "rain" | "white" | "lofi">("rain");
  const [focusVolume, setFocusVolume] = useState(70);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [resourceType, setResourceType] = useState<StudyResourceType>("youtube");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceLink, setResourceLink] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileUrl, setSelectedFileUrl] = useState("");
  const [selectedMimeType, setSelectedMimeType] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedResourceIndex, setSelectedResourceIndex] = useState(0);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_TASKS_KEY);
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

      const progress = readLocalProgress();
      setTotalXp(progress.xp);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      setResources(readStudyResources());
    } catch {
      setResources([]);
    }
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();

    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  // Enforce fullscreen while lock mode is active
  useEffect(() => {
    if (isLocked && !isFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [isLocked, isFullscreen]);

  useEffect(() => {
    writeStudyResources(resources);
  }, [resources]);

  useEffect(() => {
    if (audioEngine) {
      audioEngine.stop();
    }

    const nextEngine = createAmbientAudio(focusSound, focusVolume);
    setAudioEngine(nextEngine);

    return () => {
      nextEngine?.stop();
    };
  }, [focusSound, focusVolume]);

  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? tasks[0] ?? null;

  const updateTasks = (updater: (current: FocusTask[]) => FocusTask[]) => {
    setTasks((current) => {
      const next = updater(current);
      try {
        localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(toSharedTaskShape(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const { minutes, seconds, isRunning, start, pause, reset, setDuration, syncState } = usePomodoro(durationMinutes, async () => {
    const fallbackXp = Math.max(25, durationMinutes * 4);

    try {
      const result = await completePomodoro(durationMinutes);
      const reward = result.reward as { xpReward?: number } | undefined;
      const earnedXp = reward?.xpReward ?? fallbackXp;
      setTotalXp((current) => current + earnedXp);
      const currentProgress = readLocalProgress();
      writeLocalProgress({
        ...currentProgress,
        xp: currentProgress.xp + earnedXp,
        focusMinutes: currentProgress.focusMinutes + durationMinutes,
        sessionsCompleted: currentProgress.sessionsCompleted + 1,
      });

      if (activeTask && activeTask.status !== "done") {
        updateTasks((current) => current.map((entry) => (entry.id === activeTask.id ? { ...entry, status: "done" } : entry)));
      }

      setStatusMessage(activeTask ? `${copy.sessionComplete}. +${earnedXp} XP for ${activeTask.title}` : `${copy.sessionComplete}. +${earnedXp} XP`);
      setIsLocked(false);
      // Exit fullscreen after session ends
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      setTotalXp((current) => current + fallbackXp);
      const currentProgress = readLocalProgress();
      writeLocalProgress({
        ...currentProgress,
        xp: currentProgress.xp + fallbackXp,
        focusMinutes: currentProgress.focusMinutes + durationMinutes,
        sessionsCompleted: currentProgress.sessionsCompleted + 1,
      });
      setStatusMessage(`Session complete, backend sync is unavailable right now. +${fallbackXp} XP saved locally.`);
      setIsLocked(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  });

  useEffect(() => {
    setDuration(durationMinutes);
  }, [durationMinutes, setDuration]);

  // ── Extension & PWA Bidirectional Synchronization ──
  const notifyExtension = (action: "startFocus" | "endFocus" | "getStatus", durationMins?: number, customPin?: string) => {
    const payload = {
      type: "FOCUSNYX_WEB_APP_ACTION",
      action,
      durationMinutes: durationMins || durationMinutes,
      pin: customPin || "1234",
      timestamp: Date.now(),
    };

    // 1. PostMessage to window DOM
    window.postMessage(payload, "*");

    // 2. BroadcastChannel
    try {
      const syncChannel = new BroadcastChannel("FOCUSNYX_SYNC_CHANNEL");
      syncChannel.postMessage(payload);
      syncChannel.close();
    } catch {}

    // 3. LocalStorage persistence for extension content script polling
    try {
      localStorage.setItem("focusnyx_app_focus_state", JSON.stringify(payload));
    } catch {}
  };

  useEffect(() => {
    const handleExtensionState = (extState: any) => {
      if (!extState) return;
      const active = Boolean(extState.isActive ?? extState.active);
      setIsLocked(active);

      if (!active) {
        syncState(0, false);
      } else if (extState.focusStartTime && extState.focusDuration) {
        const elapsedSecs = Math.floor((Date.now() - extState.focusStartTime) / 1000);
        const totalSecs = Math.floor(extState.focusDuration / 1000);
        const remainingSecs = Math.max(0, totalSecs - elapsedSecs);
        if (remainingSecs > 0) {
          syncState(remainingSecs, true);
        } else {
          syncState(0, false);
        }
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "FOCUSNYX_EXTENSION_EVENT") return;
      handleExtensionState(event.data.state);
    };

    window.addEventListener("message", handleMessage);

    let syncChannel: BroadcastChannel | null = null;
    try {
      syncChannel = new BroadcastChannel("FOCUSNYX_SYNC_CHANNEL");
      syncChannel.onmessage = (event) => {
        if (!event.data || event.data.type !== "FOCUSNYX_EXTENSION_EVENT") return;
        handleExtensionState(event.data.state);
      };
    } catch {}

    // Request initial extension status on mount
    notifyExtension("getStatus");

    return () => {
      window.removeEventListener("message", handleMessage);
      syncChannel?.close();
    };
  }, [syncState]);

  const handleStartFocus = () => {
    try {
      if (document.documentElement && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
    start();
    setIsLocked(true);
    notifyExtension("startFocus", durationMinutes);
  };

  const handlePauseFocus = () => {
    pause();
    setIsLocked(false);
    notifyExtension("endFocus");
  };

  const handleResetFocus = () => {
    reset(durationMinutes);
    setIsLocked(false);
    notifyExtension("endFocus");
  };

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
    const currentProgress = readLocalProgress();
    writeLocalProgress({
      ...currentProgress,
      xp: currentProgress.xp + task.xp,
      completedTasks: currentProgress.completedTasks + 1,
    });

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

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setStatusMessage("Fullscreen is not available in this browser.");
    }
  };

  const handleStart = async () => {
    try {
      // Request fullscreen if not already
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      setStatusMessage("Unable to enter fullscreen lock mode.");
    }
    setIsLocked(true);
    start();
    notifyExtension("startFocus", durationMinutes);
  };

  const addResource = () => {
    if (!resourceTitle.trim() || !resourceLink.trim()) {
      return;
    }

    const nextResource: StudyResource = {
      id: `resource-${Date.now()}`,
      type: resourceType,
      title: resourceTitle.trim(),
      link: resourceLink.trim(),
      source: "link",
    };

    setResources((current) => [nextResource, ...current]);
    setSelectedResourceIndex(0);
    setSelectedFileName(nextResource.title);
    setSelectedFileUrl(resourceType === "youtube" ? getYouTubeEmbedUrl(nextResource.link) : nextResource.link);
    setSelectedMimeType(resourceType === "youtube" ? "video/youtube" : resourceType === "pdf" ? "application/pdf" : "image/");
    setResourceTitle("");
    setResourceLink("");
    setStatusMessage(`Added ${nextResource.title} to study resources.`);
  };

  const handleResourceFileUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    const nextResource = await fileToResource(file);
    setResources((current) => [nextResource, ...current]);
    setSelectedResourceIndex(0);
    setSelectedFileName(file.name);
    setSelectedFileUrl(nextResource.link);
    setSelectedMimeType(file.type || "application/octet-stream");
    setResourceType(nextResource.type);
    setStatusMessage(`Added ${file.name} to study resources.`);
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    updateTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
              ),
            }
          : task,
      ),
    );
  };

  const removeResource = (resourceId: string) => {
    setResources((current) => {
      const next = current.filter((resource) => resource.id !== resourceId);
      const removed = current.find((resource) => resource.id === resourceId);
      if (removed?.source === "file" && removed.link.startsWith("blob:")) {
        URL.revokeObjectURL(removed.link);
      }
      return next;
    });
  };

  const handleResourceNavigation = (direction: "prev" | "next") => {
    if (resources.length === 0) return;
    
    let nextIndex = selectedResourceIndex;
    if (direction === "next") {
      nextIndex = (selectedResourceIndex + 1) % resources.length;
    } else {
      nextIndex = (selectedResourceIndex - 1 + resources.length) % resources.length;
    }
    
    const resource = resources[nextIndex];
    setSelectedResourceIndex(nextIndex);
    setSelectedFileName(resource.title);
    setSelectedFileUrl(resource.type === "youtube" ? getYouTubeEmbedUrl(resource.link) : resource.link);
    setSelectedMimeType(resource.type === "youtube" ? "video/youtube" : resource.type === "pdf" ? "application/pdf" : resource.mimeType || "image/");
  };

  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#22E6A8]">{copy.header}</p>
            <h2 className="mt-2 font-display text-3xl font-black">{copy.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-fg)]">{copy.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={toggleFullscreen} className="secondary-button flex h-12 items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-white px-5 text-sm font-bold shadow-[4px_4px_0_0_#1E293B]">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
            <button onClick={handleStart} disabled={isRunning} className="candy-button flex h-12 items-center gap-2 rounded-full border-2 border-[var(--foreground)] px-5 text-sm font-black disabled:opacity-60">
              <Play size={16} /> Start focus session
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)]">
          {copy.chips.map((chip) => (
            <span key={chip} className="hard-chip px-3 py-1.5">
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="rounded-[26px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_0_#1E293B]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.header}</p>
                  <h3 className="mt-2 font-display text-3xl font-black">{copy.title}</h3>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
                  <TimerReset size={20} strokeWidth={2.5} />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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
                  <button onClick={handleStartFocus} disabled={isRunning} className="candy-button flex h-12 items-center gap-2 px-5 text-sm disabled:opacity-60">
                    <Play size={16} /> {copy.start}
                  </button>
                  <button onClick={handlePauseFocus} disabled={!isRunning} className="secondary-button flex h-12 items-center gap-2 px-5 text-sm disabled:opacity-60">
                    <Pause size={16} /> {copy.pause}
                  </button>
                  <button onClick={handleResetFocus} className="secondary-button flex h-12 items-center gap-2 px-5 text-sm">
                    <RotateCcw size={16} /> {copy.reset}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 grid place-items-center rounded-[28px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-8 shadow-[4px_4px_0_0_#1E293B]">
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
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-4 shadow-[4px_4px_0_0_#1E293B]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">XP reward</p>
                <p className="mt-2 font-display text-2xl font-black">+{Math.max(60, durationMinutes * 4)} XP</p>
              </div>
              <div className="rounded-[22px] border-2 border-[var(--foreground)] bg-[#FDF2F8] p-4 shadow-[4px_4px_0_0_#1E293B]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">Focus depth</p>
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
              const isExpanded = expandedTaskId === task.id;

              return (
                <div key={task.id}>
                  <div
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    className={`cursor-pointer rounded-[20px] border-2 border-[var(--foreground)] px-4 py-3 shadow-[4px_4px_0_0_#1E293B] transition ${isActive ? "bg-[#FFF7D6]" : "bg-[#FAFAFA]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className={`font-bold ${isDone ? "line-through text-[var(--muted-fg)]" : ""}`}>{task.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--muted-fg)]">{task.subject} • {task.minutes} min</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hard-chip px-3 py-1.5 text-xs font-black">+{task.xp} XP</span>
                        {task.subtasks.length > 0 && (
                          <ChevronDown size={16} className={`transition ${isExpanded ? "rotate-180" : ""}`} />
                        )}
                      </div>
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

                  {isExpanded && task.subtasks.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2 border-l-2 border-[var(--foreground)] pl-4">
                      {task.subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          onClick={() => toggleSubtask(task.id, subtask.id)}
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
                  )}
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
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Focus sounds</p>
              <h3 className="mt-2 font-display text-2xl font-black">Ambient mode</h3>
            </div>
            <Music2 size={20} className="text-[#22E6A8]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SOUND_PRESETS.map((sound) => {
              const Icon = sound.icon;
              const active = focusSound === sound.key;

              return (
                <button
                  key={sound.key}
                  onClick={() => setFocusSound(sound.key)}
                  className={`rounded-[18px] border-2 px-3 py-3 text-left text-sm font-black transition shadow-[4px_4px_0_0_#1E293B] ${active ? "border-[#22E6A8] bg-[#22E6A8] text-[#08111F] shadow-[6px_6px_0_0_#F472B6]" : "border-[var(--foreground)] bg-white text-[var(--foreground)]"}`}
                >
                  <Icon size={16} className="mb-2" />
                  <span className="block">{sound.label}</span>
                </button>
              );
            })}
          </div>
          <label className="mt-4 block">
            <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">
              <Volume2 size={14} />
              Volume
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={focusVolume}
              onChange={(event) => setFocusVolume(Number(event.target.value) || 0)}
              className="w-full accent-[#22E6A8]"
            />
          </label>
        </div>

        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Distraction guard</p>
              <h3 className="mt-2 font-display text-2xl font-black">Blocked domains</h3>
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
      </div>

      <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Study resources</p>
            <h3 className="mt-2 font-display text-2xl font-black">Resource library</h3>
          </div>
          <LibraryBig size={20} className="text-[#22E6A8]" />
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-[26px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">Add YouTube video or link</p>
                <h3 className="mt-2 font-display text-2xl font-black">Online resources</h3>
              </div>
              <Youtube size={20} className="text-[#22E6A8]" />
            </div>
            <div className="mt-4 flex gap-2">
              {(["youtube", "pdf", "image"] as StudyResourceType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setResourceType(type)}
                  className={`rounded-full border-2 border-[var(--foreground)] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${resourceType === type ? "bg-[#22E6A8] text-[#08111F]" : "bg-white text-[var(--foreground)]"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3 rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4">
              <input
                value={resourceTitle}
                onChange={(event) => setResourceTitle(event.target.value)}
                className="w-full rounded-[16px] border-2 border-[var(--foreground)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-fg)]"
                placeholder="Title"
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={resourceLink}
                  onChange={(event) => setResourceLink(event.target.value)}
                  className="w-full rounded-[16px] border-2 border-[var(--foreground)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-fg)]"
                  placeholder={resourceType === "youtube" ? "YouTube link" : resourceType === "pdf" ? "PDF link" : "Image link"}
                />
                <button onClick={addResource} className="candy-button rounded-[16px] border-2 border-[var(--foreground)] px-4 py-3 text-sm font-black text-[#08111F]">
                  Add
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block cursor-pointer rounded-[16px] border-2 border-dashed border-[var(--foreground)] bg-white px-4 py-3 text-sm font-bold text-[var(--muted-fg)] shadow-[3px_3px_0_0_#1E293B]">
                    Upload PDF, DOC, DOCX, or image
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      className="hidden"
                      onChange={(event) => void handleResourceFileUpload(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  {selectedFileName ? <p className="mt-2 text-xs font-semibold text-[var(--muted-fg)]">Selected: {selectedFileName}</p> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">Resource library</p>
                <h3 className="mt-2 font-display text-2xl font-black">All resources</h3>
              </div>
            </div>

            <div className="mt-4 min-h-[260px] rounded-[24px] border-2 border-dashed border-[var(--foreground)] bg-[var(--muted)] p-4">
              {resources.length === 0 ? (
                <div className="grid h-full min-h-[220px] place-items-center text-center text-[var(--muted-fg)]">
                  <div>
                    <FileText size={32} className="mx-auto mb-3" />
                    <p className="text-sm font-semibold">No resources added yet.</p>
                    <p className="mt-1 text-xs">Add a YouTube link, PDF, or image to study from.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {resources.map((resource) => {
                    const ResourceIcon = resource.type === "youtube" ? Youtube : resource.type === "pdf" ? FileText : ImageIcon;

                    return (
                      <div key={resource.id} className="rounded-[18px] border-2 border-[var(--foreground)] bg-white p-4 text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B] hover:shadow-[6px_6px_0_0_#1E293B] transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#22E6A8] text-white shadow-[3px_3px_0_0_#1E293B] shrink-0">
                              <ResourceIcon size={16} />
                            </span>
                            <div>
                              <p className="font-black">{resource.title}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted-fg)]">{resource.type}</p>
                              {resource.link ? (
                                <a href={resource.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#22E6A8] hover:underline">
                                  <Link2 size={12} />
                                  Open resource
                                </a>
                              ) : null}
                            </div>
                          </div>
                          <button onClick={() => removeResource(resource.id)} className="rounded-full border-2 border-[var(--foreground)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {resources.length > 0 && selectedFileUrl ? (
              <div className="mt-4 rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted-fg)]">Resource Preview</p>
                    <p className="mt-1 font-bold truncate">{selectedFileName || "Selected resource"}</p>
                    <p className="text-xs text-[var(--muted-fg)] mt-1">{selectedResourceIndex + 1} / {resources.length}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResourceNavigation("prev")}
                      disabled={resources.length <= 1}
                      className="rounded-full border-2 border-[var(--foreground)] p-2 hover:bg-[var(--muted)] disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => handleResourceNavigation("next")}
                      disabled={resources.length <= 1}
                      className="rounded-full border-2 border-[var(--foreground)] p-2 hover:bg-[var(--muted)] disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <span className="rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6] px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
                      {selectedMimeType === "video/youtube" ? "YouTube" : selectedMimeType?.split("/")[1] || "file"}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-[18px] border-2 border-[var(--foreground)] bg-[var(--muted)]">
                  {selectedMimeType === "video/youtube" ? (
                    <iframe
                      title={selectedFileName || "YouTube video"}
                      src={selectedFileUrl}
                      className="w-full h-[400px] bg-black"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : selectedMimeType.startsWith("image/") ? (
                    <img src={selectedFileUrl} alt={selectedFileName || "Uploaded resource"} className="w-full h-auto object-contain bg-white" />
                  ) : selectedMimeType === "application/pdf" ? (
                    <iframe title={selectedFileName || "PDF preview"} src={selectedFileUrl} className="w-full h-[600px] bg-white" />
                  ) : (
                    <div className="grid min-h-[240px] place-items-center bg-white p-6 text-center">
                      <div>
                        <FileText size={32} className="mx-auto text-[var(--muted-fg)]" />
                        <p className="mt-3 font-bold">File stored locally in tab.</p>
                        <p className="mt-1 text-sm text-[var(--muted-fg)]">
                          DOC/DOCX files cannot be previewed in browser. Use open link to view.
                        </p>
                        <a href={selectedFileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-[#22E6A8] px-4 py-2 text-sm font-black text-[#08111F] shadow-[4px_4px_0_0_#1E293B]">
                          <Link2 size={14} /> Open file
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
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

      {isLocked && !isFullscreen && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 text-white backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex max-w-md flex-col items-center text-center">
            <Lock className="mb-6 h-16 w-16 text-red-500" />
            <h2 className="mb-4 text-3xl font-black uppercase tracking-tight text-red-500">Focus Lock Active</h2>
            <p className="mb-8 text-lg font-medium text-gray-300">You must be in fullscreen mode to continue working. Escaping is not allowed.</p>
            <button
              onClick={() => {
                document.documentElement.requestFullscreen().catch(() => {});
              }}
              className="candy-button rounded-2xl border-4 border-red-500 bg-red-600 px-8 py-4 text-xl font-bold uppercase tracking-widest text-white hover:bg-red-500"
            >
              Return to Fullscreen
            </button>
          </motion.div>
        </div>
      )}
    </section>
  );
}
