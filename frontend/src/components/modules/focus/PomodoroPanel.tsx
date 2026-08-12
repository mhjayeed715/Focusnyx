"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  FileText,
  Image as ImageIcon,
  LibraryBig,
  Link2,
  Lock,
  Maximize2,
  Minimize2,
  Music2,
  Pause,
  PenTool,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  Volume2,
  X,
  Youtube,
  UploadCloud,
} from "lucide-react";
import { useLanguage } from "@/components/layout/language-context";
import { usePomodoro } from "@/hooks/usePomodoro";
import { completePomodoro, createTask, updateTask, deleteTask, getDashboardBootstrap } from "@/lib/backend";
import toast from "react-hot-toast";

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

const LOCAL_PROGRESS_KEY = "focusnyxLocalProgressV1";
const STORAGE_KEY_PIN = "focusnyxEmergencyPinV1";

const initialLocalProgress: LocalProgress = {
  xp: 180,
  focusMinutes: 45,
  sessionsCompleted: 2,
  completedTasks: 3,
};

const presets = [15, 25, 45, 60];

const INITIAL_WHITELISTED_SITES: DistractionSite[] = [
  { site: "google.com", blocked: 0, enabled: true },
  { site: "wikipedia.org", blocked: 0, enabled: true },
  { site: "chatgpt.com", blocked: 0, enabled: true },
  { site: "claude.ai", blocked: 0, enabled: true },
  { site: "github.com", blocked: 0, enabled: true },
];

const WHITELIST_SUGGESTIONS = [
  "google.com",
  "wikipedia.org",
  "chatgpt.com",
  "claude.ai",
  "github.com",
  "stackoverflow.com",
  "notion.so",
  "drive.google.com",
  "canvas.instructure.com",
];

const COMMON_APPS = [
  { name: "Discord", exe: "discord.exe", iconUrl: "https://www.google.com/s2/favicons?domain=discord.com&sz=64" },
  { name: "Spotify", exe: "spotify.exe", iconUrl: "https://www.google.com/s2/favicons?domain=spotify.com&sz=64" },
  { name: "Steam", exe: "steam.exe", iconUrl: "https://www.google.com/s2/favicons?domain=steampowered.com&sz=64" },
  { name: "Telegram", exe: "telegram.exe", iconUrl: "https://www.google.com/s2/favicons?domain=telegram.org&sz=64" },
  { name: "WhatsApp", exe: "whatsapp.exe", iconUrl: "https://www.google.com/s2/favicons?domain=whatsapp.com&sz=64" },
  { name: "Chrome", exe: "chrome.exe", iconUrl: "https://www.google.com/s2/favicons?domain=google.com&sz=64" },
  { name: "Edge", exe: "msedge.exe", iconUrl: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=64" },
  { name: "VS Code", exe: "code.exe", iconUrl: "https://www.google.com/s2/favicons?domain=code.visualstudio.com&sz=64" },
];

const SOUND_PRESETS = [
  { key: "rain", label: "Rain 🌧️", icon: Radio },
  { key: "lofi", label: "Lofi 🎵", icon: Music2 },
  { key: "white", label: "White Noise 🌊", icon: Sparkles },
  { key: "none", label: "Mute 🔇", icon: Volume2 },
] as const;

function notifyExtension(type: string, payload?: any) {
  if (typeof window !== "undefined") {
    window.postMessage({ type: "FOCUSNYX_WEB_APP_ACTION", action: type, payload }, "*");
  }
}

function syncBlocklistToAll(sites: DistractionSite[], apps: string[]) {
  const whitelistedSites = sites.filter((s) => s.enabled).map((s) => s.site);
  notifyExtension("syncBlocklist", { whitelistedSites, blockedApps: apps });

  if (typeof window !== "undefined") {
    fetch("http://localhost:38124/api/blocked-apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apps }),
    }).catch(() => {});
  }
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: AudioNode | null = null;

  startRain(volume: number) {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime((volume / 100) * 0.15, this.ctx.currentTime);
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
      this.source = whiteNoise;
    } catch {
      // AudioContext fallback
    }
  }

  startWhiteNoise(volume: number) {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime((volume / 100) * 0.08, this.ctx.currentTime);
      noise.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      this.source = noise;
    } catch {
      // fallback
    }
  }

  startLofi(volume: number) {
    this.stop();
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime((volume / 100) * 0.1, this.ctx.currentTime);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      this.source = osc;
    } catch {
      // fallback
    }
  }

  stop() {
    if (this.source) {
      try {
        (this.source as any).stop?.();
      } catch {}
      this.source = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
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

async function fileToResource(file: File): Promise<StudyResource> {
  const url = URL.createObjectURL(file);
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const type: StudyResourceType = isImage ? "image" : "pdf";

  return {
    id: `resource-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: file.name,
    link: url,
    source: "file",
    mimeType: file.type || (isPdf ? "application/pdf" : isImage ? "image/png" : "application/octet-stream"),
  };
}

function readLocalProgress(): LocalProgress {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
    if (!raw) return initialLocalProgress;
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

function parseMicrotasks(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
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
  const { lang, interactionMode } = useLanguage();
  const isAdhd = interactionMode === "adhd";
  const [showCustomization, setShowCustomization] = useState(false);
  const copy = lang === "bn"
    ? {
        header: "ফোকাস ইঞ্জিন",
        title: "পোমোডোরো + হাইপারফোকাস টাইমার",
        description: "প্রিসেট বেছে নিন অথবা নিজের সময় সেট করুন।",
        chips: ["XP রিওয়ার্ড", "ব্যাজ", "ডিস্ট্র্যাকশন ট্র্যাকিং", "টাস্ক লিস্ট"],
        customDuration: "কাস্টম সময়",
        start: "শুরু",
        pause: "থামান",
        reset: "রিসেট",
        running: "চলছে",
        ready: "শুরু করার জন্য প্রস্তুত",
        badges: "আনলকড ব্যাজ",
        nextBadge: "পরবর্তী ব্যাজ",
        whitelist: "অনুমোদিত সাইট",
        siteCount: "সক্রিয় ডোমেইন",
        whitelistedSites: "অনুমোদিত ওয়েবসাইটের তালিকা",
        blockNote: "ফোকাস চলাকালীন কেবল অনুমোদিত সাইটই ব্রাউজ করা যাবে।",
        customDomain: "কাস্টম ডোমেইন (যেমন: github.com)",
        addWhitelist: "হোয়াইটলিস্ট যোগ করুন",
        accessible: "অনুমোদিত",
        taskList: "টাস্ক লিস্ট",
        currentQueue: "চলতি কাজের তালিকা",
        total: "মোট",
        addTask: "+ কাজ যোগ করুন",
        complete: "সম্পন্ন",
        done: "সম্পন্ন",
        progress: "কাজের অগ্রগতি",
        studyResources: "স্টাডি রিসোর্স",
        resourceLibrary: "রিসোর্স লাইব্রেরি",
        addYoutube: "ইউটিউব ভিডিও বা লিংক যোগ করুন",
        onlineResources: "অনলাইন রিসোর্স",
        allResources: "সব রিসোর্স",
        noResources: "এখনও কোন রিসোর্স যোগ করা হয়নি।",
        noResourcesDesc: "পড়ার জন্য ইউটিউব লিংক, পিডিএফ বা ছবি যোগ করুন।",
        uploadFile: "পিডিএফ বা ছবি আপলোড করুন",
        selected: "নির্বাচিত",
        modalTitle: "নতুন ফোকাস টাস্ক যোগ করুন",
        taskTitle: "কাজের শিরোনাম",
        subject: "বিষয় (যেমন: গণিত)",
        minutes: "আনুমানিক সময় (মিনিট)",
        microtasks: "মাইক্রোটাস্ক (প্রতি লাইনে একটি)",
        xpNote: "মাইক্রোটাস্কে ভাগ করলে প্রতি ধাপে বাড়তি XP পাবেন।",
        cancel: "বাতিল",
        createTask: "টাস্ক তৈরি করুন",
        totalXpLabel: "মোট অর্জিত XP",
        sessionsCount: "ফোকাস সেশন",
        totalMinutes: "মোট মিনিট",
        completedCount: "সম্পন্ন কাজ",
        localSync: "Task created locally and will sync when the backend is available.",
        created: "Created",
        loaded: "Loaded",
        sessionComplete: "Session complete",
        blockedLabel: "blocked",
        unblocked: "Unblocked",
        xpText: "Longer deep-work blocks give more XP than short check-ins.",
        allUnlocked: "All unlocked",
      }
    : {
        header: "Focus Engine",
        title: "Pomodoro + Hyperfocus Timer",
        description: "Choose a preset or set your own timer length.",
        chips: ["XP rewards", "Badges", "Distraction tracking", "Task list"],
        customDuration: "Custom duration",
        start: "Start",
        pause: "Pause",
        reset: "Reset",
        running: "Running",
        ready: "Ready to launch",
        badges: "Unlocked badges",
        nextBadge: "Next badge target",
        whitelist: "Whitelisted sites",
        siteCount: "Active domains",
        whitelistedSites: "Allowed websites whitelist",
        blockNote: "All other sites are blocked during active focus sessions.",
        customDomain: "Custom domain (e.g. github.com)",
        addWhitelist: "Add Whitelist",
        accessible: "ACCESSIBLE",
        taskList: "Task list",
        currentQueue: "Current queue",
        total: "Total",
        addTask: "+ Add Task",
        complete: "Complete",
        done: "Done",
        progress: "Task progress",
        studyResources: "Study resources",
        resourceLibrary: "Resource library",
        addYoutube: "Add YouTube video or link",
        onlineResources: "Online resources",
        allResources: "All resources",
        noResources: "No resources added yet.",
        noResourcesDesc: "Add a YouTube link, PDF, or image to study from.",
        uploadFile: "Upload PDF or image",
        selected: "Selected",
        modalTitle: "Add new focus task",
        taskTitle: "Task title",
        subject: "Subject (e.g. Math)",
        minutes: "Estimated minutes",
        microtasks: "Microtasks (one per line)",
        xpNote: "Splitting tasks into steps increases XP payouts per completed step.",
        cancel: "Cancel",
        createTask: "Create Task",
        totalXpLabel: "Total XP Earned",
        sessionsCount: "Focus Sessions",
        totalMinutes: "Total Minutes",
        completedCount: "Tasks Completed",
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
  const [customMinutesInput, setCustomMinutesInput] = useState("25");
  const [statusMessage, setStatusMessage] = useState("");
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [blockedSites, setBlockedSites] = useState<DistractionSite[]>(INITIAL_WHITELISTED_SITES);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSubject, setNewTaskSubject] = useState("Focus");
  const [newTaskEstimate, setNewTaskEstimate] = useState("25");
  const [newTaskMicrotasks, setNewTaskMicrotasks] = useState("Define the goal\nBreak into steps\nStart the first step");
  const [totalXp, setTotalXp] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  const [isDragging, setIsDragging] = useState(false);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskSubject, setEditTaskSubject] = useState("");
  const [editTaskEstimate, setEditTaskEstimate] = useState("");
  const [editTaskMicrotasks, setEditTaskMicrotasks] = useState("");
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Emergency PIN Modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [emergencyPinInput, setEmergencyPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // Custom Whitelist / Blacklist State
  const [newSiteInput, setNewSiteInput] = useState("");
  const [blockedApps, setBlockedApps] = useState<string[]>([
    "discord.exe",
    "spotify.exe",
    "steam.exe",
    "telegram.exe",
    "whatsapp.exe",
  ]);
  const [newAppInput, setNewAppInput] = useState("");
  const [isGuardControlsOpen, setIsGuardControlsOpen] = useState(false);

  // Live Distraction Log State & Detected Desktop Apps
  const [distractionLogs, setDistractionLogs] = useState<Array<{ id: string; type: string; app?: string; url?: string; timestamp: string }>>([]);
  const [browserDistractionLogs, setBrowserDistractionLogs] = useState<Array<{ id: string; type: string; domain: string; timestamp: string }>>([]);
  const [detectedDesktopApps, setDetectedDesktopApps] = useState<Array<{ name: string; exe: string; running: boolean }>>([]);
  const [isCompanionActive, setIsCompanionActive] = useState<boolean>(false);

  // Load tasks & profile from Supabase on mount
  useEffect(() => {
    let isSubscribed = true;
    const loadBootstrapData = async () => {
      try {
        const data = await getDashboardBootstrap();
        if (!isSubscribed) return;

        if (data.tasks && data.tasks.length > 0) {
          const formattedTasks: FocusTask[] = data.tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            subject: t.subject || "Focus",
            minutes: Number(t.estimate) || 25,
            xp: Number(t.xp) || Math.max(20, (Number(t.estimate) || 25) * 4),
            status: t.completed ? "done" : "ready",
            subtasks: (t.subtasks || []).map((st: any, idx: number) => ({
              id: st.id || `sub-${Date.now()}-${idx}`,
              title: typeof st === "string" ? st : st.title || "",
              completed: typeof st === "object" ? Boolean(st.completed) : false,
            })),
          }));
          setTasks(formattedTasks);
          const firstReady = formattedTasks.find((t) => t.status !== "done");
          if (firstReady) {
            setActiveTaskId(firstReady.id);
          }
        }
      } catch {
        // Fallback default tasks if offline
      }
    };
    loadBootstrapData();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const activeTask = useMemo(() => {
    return tasks.find((t) => t.id === activeTaskId) || tasks.find((t) => t.status !== "done") || tasks[0] || null;
  }, [tasks, activeTaskId]);

  const [isLocked, setIsLocked] = useState(false);

  const onPomodoroComplete = async () => {
    setIsLocked(false);
    notifyExtension("stopFocus");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const duration = durationMinutes;
    const earnedXp = Math.max(60, duration * 4);

    const currentProgress = readLocalProgress();
    const nextProgress: LocalProgress = {
      xp: currentProgress.xp + earnedXp,
      focusMinutes: currentProgress.focusMinutes + duration,
      sessionsCompleted: currentProgress.sessionsCompleted + 1,
      completedTasks: currentProgress.completedTasks + (activeTask?.status === "done" ? 1 : 0),
    };

    writeLocalProgress(nextProgress);
    setTotalXp((current) => current + earnedXp);

    if (activeTask && activeTask.status !== "done") {
      updateTasks((current) => current.map((entry) => (entry.id === activeTask.id ? { ...entry, status: "done" } : entry)));
      if (!activeTask.id.startsWith("focus-local-") && !activeTask.id.startsWith("starter-")) {
        updateTask(activeTask.id, { completed: true }).catch(() => {});
      }
    }

    toast.success(`🎉 Focus session completed! +${earnedXp} XP earned!`);

    try {
      await completePomodoro(duration);
    } catch {
      // Local sync fallback
    }
  };

  const { minutes, seconds, isRunning, start, pause, reset } = usePomodoro(durationMinutes, onPomodoroComplete);

  const handleStartFocus = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Fullscreen not supported
    }
    setIsLocked(true);
    start();
    notifyExtension("startFocus", durationMinutes);
  };

  const handlePauseFocus = () => {
    pause();
    notifyExtension("pauseFocus");
  };

  const handleResetFocus = () => {
    reset(durationMinutes);
    setIsLocked(false);
    notifyExtension("stopFocus");
  };

  const handleVerifyEmergencyPin = () => {
    const savedPin = localStorage.getItem(STORAGE_KEY_PIN) || "123456";
    if (emergencyPinInput.trim() === savedPin) {
      setShowPinModal(false);
      setIsLocked(false);
      handlePauseFocus();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      toast.success("Emergency PIN verified. Focus lock disengaged.");
    } else {
      setPinError("Invalid Emergency PIN. Please try again.");
    }
  };

  const updateTasks = (updater: (current: FocusTask[]) => FocusTask[]) => {
    setTasks((current) => {
      const next = updater(current);
      notifyExtension("syncTasks", toSharedTaskShape(next));
      return next;
    });
  };

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;

    updateTasks((current) => current.map((entry) => (entry.id === taskId ? { ...entry, status: "done" } : entry)));
    setTotalXp((current) => current + task.xp);

    if (!taskId.startsWith("focus-local-") && !taskId.startsWith("starter-")) {
      try {
        await updateTask(taskId, { completed: true });
        toast.success(`✓ "${task.title}" completed! +${task.xp} XP`);
      } catch {
        toast.error("Could not sync completion to server.");
      }
    } else {
      toast.success(`✓ "${task.title}" marked done! +${task.xp} XP`);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const estimatedMinutes = Math.max(5, Number(newTaskEstimate) || 25);
    const subtasks = parseMicrotasks(newTaskMicrotasks);
    const optimisticId = `focus-local-${Date.now()}`;
    const optimisticTask: FocusTask = {
      id: optimisticId,
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
    setShowAddTask(false);
    setNewTaskTitle("");
    setNewTaskSubject("Focus");
    setNewTaskEstimate("25");

    try {
      const response = await createTask({
        title: optimisticTask.title,
        subject: optimisticTask.subject,
        estimate: optimisticTask.minutes,
        subtasks: optimisticTask.subtasks.map((s) => s.title),
      });
      const realTask = response.task as { id: string } | undefined;
      if (realTask?.id) {
        updateTasks((current) => current.map((t) => (t.id === optimisticId ? { ...t, id: realTask.id } : t)));
      }
      toast.success(`Task "${optimisticTask.title}" saved!`);
    } catch {
      toast.error("Saved locally. Will sync when online.");
    }
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    let updatedSubtasks: FocusSubtask[] = [];
    updateTasks((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        updatedSubtasks = task.subtasks.map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask,
        );
        return { ...task, subtasks: updatedSubtasks };
      }),
    );
    if (!taskId.startsWith("focus-local-")) {
      updateTask(taskId, { subtasks: updatedSubtasks }).catch(() => {});
    }
  };

  // Multi-file batch upload handler
  const handleResourceFilesUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const newResources: StudyResource[] = [];
    for (const file of fileArray) {
      const resource = await fileToResource(file);
      newResources.push(resource);
    }
    setResources((current) => [...newResources, ...current]);
    if (newResources.length > 0) {
      setSelectedResourceIndex(0);
      setSelectedFileName(newResources[0].title);
      setSelectedFileUrl(newResources[0].link);
      setSelectedMimeType(newResources[0].mimeType || fileArray[0].type || "application/octet-stream");
      setResourceType(newResources[0].type);
      toast.success(`✓ Uploaded ${newResources.length} study material${newResources.length > 1 ? "s" : ""}`);
      setStatusMessage(`Added ${newResources.length} resource${newResources.length > 1 ? "s" : ""} to study materials.`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleResourceFilesUpload(e.dataTransfer.files);
    }
  };

  const addResource = () => {
    if (!resourceLink.trim()) return;
    const nextResource: StudyResource = {
      id: `resource-${Date.now()}`,
      type: resourceType,
      title: resourceTitle.trim() || (resourceType === "youtube" ? "YouTube Video" : "Online Resource"),
      link: resourceLink.trim(),
      source: "link",
      mimeType: resourceType === "youtube" ? "video/youtube" : resourceType === "pdf" ? "application/pdf" : "image/",
    };
    setResources((current) => [nextResource, ...current]);
    setSelectedResourceIndex(0);
    setSelectedFileName(nextResource.title);
    setSelectedFileUrl(resourceType === "youtube" ? getYouTubeEmbedUrl(nextResource.link) : nextResource.link);
    setSelectedMimeType(nextResource.mimeType || "application/octet-stream");
    setResourceTitle("");
    setResourceLink("");
    toast.success(`✓ Link added to study resources.`);
  };

  const removeResource = (resourceId: string) => {
    setResources((current) => {
      const next = current.filter((r) => r.id !== resourceId);
      const removed = current.find((r) => r.id === resourceId);
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
    const res = resources[nextIndex];
    setSelectedResourceIndex(nextIndex);
    setSelectedFileName(res.title);
    setSelectedFileUrl(res.type === "youtube" ? getYouTubeEmbedUrl(res.link) : res.link);
    setSelectedMimeType(res.type === "youtube" ? "video/youtube" : res.type === "pdf" ? "application/pdf" : res.mimeType || "image/");
  };

  const handleAddCustomSite = () => {
    const raw = newSiteInput.trim().toLowerCase();
    if (!raw) return;
    const clean = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (blockedSites.some((s) => s.site === clean)) {
      toast.error(`${clean} is already in the whitelist.`);
      return;
    }
    const nextSites = [...blockedSites, { site: clean, enabled: true, blocked: 0 }];
    setBlockedSites(nextSites);
    setNewSiteInput("");
    syncBlocklistToAll(nextSites, blockedApps);
    toast.success(`✓ Added ${clean} to whitelist`);
  };

  const handleRemoveSite = (site: string) => {
    const nextSites = blockedSites.filter((s) => s.site !== site);
    setBlockedSites(nextSites);
    syncBlocklistToAll(nextSites, blockedApps);
  };

  const handleAddCustomApp = () => {
    const raw = newAppInput.trim().toLowerCase();
    if (!raw) return;
    const exe = raw.endsWith(".exe") ? raw : `${raw}.exe`;
    if (blockedApps.includes(exe)) {
      toast.error(`${exe} is already blocked.`);
      return;
    }
    const nextApps = [...blockedApps, exe];
    setBlockedApps(nextApps);
    setNewAppInput("");
    syncBlocklistToAll(blockedSites, nextApps);
    toast.success(`🚫 Added ${exe} to blocked apps`);
  };

  const handleRemoveApp = (app: string) => {
    const nextApps = blockedApps.filter((a) => a !== app);
    setBlockedApps(nextApps);
    syncBlocklistToAll(blockedSites, nextApps);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      toast.error("Fullscreen is not supported by your browser.");
    }
  };

  const completedTaskCount = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);

  return (
    <section className="space-y-6">
      {/* Sleek Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border-2 border-[var(--foreground)] bg-white px-6 py-4 shadow-[6px_6px_0_0_#1E293B]">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[2px_2px_0_0_#1E293B]">
            <TimerReset size={20} strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="font-display text-2xl font-black">{copy.title}</h2>
            <p className="text-xs font-bold text-[var(--muted-fg)]">
              {isAdhd ? "⚡ ADHD Hyperfocus Mode — Reduced Clutter & Pre-filled Defaults" : "Standard Workstation Mode"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="secondary-button flex h-10 items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-white px-4 text-xs font-bold shadow-[3px_3px_0_0_#1E293B]"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
          <button
            onClick={handleStartFocus}
            disabled={isRunning}
            className="candy-button flex h-10 items-center gap-2 rounded-full border-2 border-[var(--foreground)] px-5 text-xs font-black disabled:opacity-60"
          >
            <Play size={14} /> {copy.start}
          </button>
        </div>
      </div>

      {/* Primary 2-Column Workstation Grid (Timer Left | Study Materials Right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── LEFT COLUMN: Timer & Focal Task & Ambient Sound ── */}
        <div className="space-y-6">
          {/* Timer Panel */}
          <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
            {/* Active Focal Task Header */}
            {activeTask ? (
              <div className="mb-5 rounded-[22px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-4 shadow-[4px_4px_0_0_#1E293B]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Current Focal Task</span>
                  <span className="hard-chip px-2.5 py-0.5 text-[10px] font-black">+{activeTask.xp} XP</span>
                </div>
                <p className="mt-1 font-display text-lg font-black text-[var(--foreground)]">{activeTask.title}</p>
                <p className="text-xs font-semibold text-[var(--muted-fg)]">{activeTask.subject} • {activeTask.minutes}m estimate</p>

                {activeTask.subtasks.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-[var(--foreground)]/20 pt-2.5">
                    {activeTask.subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => toggleSubtask(activeTask.id, sub.id)}
                        className="flex items-center gap-2 text-xs cursor-pointer font-bold"
                      >
                        <span className={`grid h-3.5 w-3.5 place-items-center rounded-full border border-[var(--foreground)] ${sub.completed ? "bg-[#34D399]" : "bg-white"}`}>
                          {sub.completed ? <CheckCircle2 size={8} strokeWidth={3} className="text-white" /> : null}
                        </span>
                        <span className={sub.completed ? "line-through text-[var(--muted-fg)]" : ""}>{sub.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Big Timer Circle */}
            <div className="grid place-items-center rounded-[26px] border-2 border-[var(--foreground)] bg-[#F8FAFC] p-6 shadow-[4px_4px_0_0_#1E293B]">
              <div className="relative grid h-32 w-32 place-items-center rounded-full border-4 border-[var(--foreground)] bg-white shadow-[4px_4px_0_0_#8B5CF6]">
                <p className="font-display text-4xl font-black leading-none tracking-tight">
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)]">
                {isRunning ? "🔥 Deep Focus Session Active" : "Ready to Start"}
              </p>
              {statusMessage ? <p className="mt-2 text-xs font-bold text-purple-700">{statusMessage}</p> : null}

              {/* Timer Actions */}
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleStartFocus}
                  disabled={isRunning}
                  className="candy-button flex h-11 items-center gap-2 px-5 text-xs font-black disabled:opacity-60"
                >
                  <Play size={15} /> {copy.start}
                </button>
                <button
                  onClick={() => {
                    if (isLocked) {
                      setPinError("");
                      setEmergencyPinInput("");
                      setShowPinModal(true);
                    } else {
                      handlePauseFocus();
                    }
                  }}
                  disabled={!isRunning}
                  className="secondary-button flex h-11 items-center gap-2 px-5 text-xs font-bold disabled:opacity-60"
                >
                  <Pause size={15} /> {copy.pause}
                </button>
                <button
                  onClick={() => {
                    if (isLocked) {
                      setPinError("");
                      setEmergencyPinInput("");
                      setShowPinModal(true);
                    } else {
                      handleResetFocus();
                    }
                  }}
                  className="secondary-button flex h-11 items-center gap-2 px-4 text-xs font-bold"
                >
                  <RotateCcw size={15} /> {copy.reset}
                </button>
                {isLocked && (
                  <button
                    onClick={() => {
                      setPinError("");
                      setEmergencyPinInput("");
                      setShowPinModal(true);
                    }}
                    className="candy-button flex h-11 items-center gap-2 rounded-full border-2 border-red-500 bg-red-600 px-4 text-xs font-black text-white hover:bg-red-500"
                  >
                    <Lock size={15} /> Emergency Exit
                  </button>
                )}
              </div>
            </div>

            {/* Preset Customization Toggle */}
            {isAdhd && !showCustomization ? (
              <div className="mt-4 flex items-center justify-between rounded-[18px] border-2 border-[var(--foreground)] bg-[#ECFDF5] px-4 py-2.5 text-xs">
                <span className="font-bold text-emerald-900">⚡ ADHD Defaults: 25m Focus / 5m Break</span>
                <button
                  onClick={() => setShowCustomization(true)}
                  className="font-black text-purple-700 underline hover:text-purple-900"
                >
                  Customize
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-[22px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4">
                {isAdhd && showCustomization ? (
                  <div className="mb-2 text-right">
                    <button onClick={() => setShowCustomization(false)} className="text-xs font-bold text-[var(--muted-fg)] underline">
                      Hide customizer
                    </button>
                  </div>
                ) : null}
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)] mb-2">Duration Presets</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => {
                        setDurationMinutes(preset);
                        setCustomMinutesInput(String(preset));
                        reset(preset);
                      }}
                      className={`rounded-full border-2 border-[var(--foreground)] px-3.5 py-1.5 text-xs font-black shadow-[2px_2px_0_0_#1E293B] ${durationMinutes === preset ? "bg-[var(--foreground)] text-white" : "bg-white"}`}
                    >
                      {preset} min
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ambient Focus Sound (Compact Strip) */}
          <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Music2 size={18} className="text-[#8B5CF6]" />
                <h3 className="font-display text-base font-black">Ambient Focus Sound</h3>
              </div>
              <div className="flex items-center gap-2 w-32">
                <Volume2 size={14} className="text-[var(--muted-fg)] shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={focusVolume}
                  onChange={(e) => setFocusVolume(Number(e.target.value) || 0)}
                  className="w-full accent-[#8B5CF6]"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SOUND_PRESETS.map((sound) => {
                const Icon = sound.icon;
                const active = focusSound === sound.key;
                return (
                  <button
                    key={sound.key}
                    onClick={() => setFocusSound(sound.key)}
                    className={`flex flex-col items-center justify-center rounded-[16px] border-2 p-2.5 text-center text-xs font-bold transition shadow-[2px_2px_0_0_#1E293B] ${
                      active ? "border-[#8B5CF6] bg-[#F3E8FF] text-purple-900 font-black shadow-[3px_3px_0_0_#8B5CF6]" : "border-[var(--foreground)] bg-white hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={16} className="mb-1" />
                    <span className="truncate w-full text-[11px]">{sound.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Study Resources & Interactive Viewer (TOP WORKSTATION) ── */}
        <div className="space-y-6">
          <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8B5CF6]">Study Materials</p>
                <h3 className="mt-1 font-display text-2xl font-black">Resource Viewer & Attachments</h3>
              </div>
              <LibraryBig size={22} className="text-[#8B5CF6]" />
            </div>

            {/* Interactive Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-[22px] border-2 border-dashed p-5 text-center transition-all ${
                isDragging
                  ? "border-purple-600 bg-purple-50 scale-[1.01] shadow-[4px_4px_0_0_#8B5CF6]"
                  : "border-[var(--foreground)] bg-[#FAFAFA] hover:bg-purple-50/50"
              }`}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,image/*"
                className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                onChange={(e) => void handleResourceFilesUpload(e.target.files)}
              />
              <div className="grid place-items-center">
                <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F3E8FF] text-[#8B5CF6] shadow-[2px_2px_0_0_#1E293B] mb-2">
                  <UploadCloud size={22} strokeWidth={2.5} />
                </span>
                <p className="font-display text-base font-black text-[var(--foreground)]">
                  {isDragging ? "Drop Files Here Now!" : "Drag & Drop Multiple Files Here"}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--muted-fg)]">
                  Supports PDF, Images, DOC, DOCX, TXT (Select multiple files at once)
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--foreground)] bg-white px-4 py-1.5 text-xs font-black shadow-[2px_2px_0_0_#1E293B]">
                  <Plus size={13} /> Browse Files
                </span>
              </div>
            </div>

            {/* YouTube / Online Link Adder */}
            <div className="mt-4 rounded-[20px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-4 shadow-[3px_3px_0_0_#1E293B]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)] mb-2">Add Web / YouTube Link</p>
              <div className="flex gap-2">
                <input
                  value={resourceLink}
                  onChange={(e) => setResourceLink(e.target.value)}
                  placeholder="Paste YouTube or Web PDF link..."
                  className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-xs font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={addResource}
                  className="candy-button shrink-0 rounded-[14px] border-2 border-[var(--foreground)] px-4 py-2 text-xs font-black"
                >
                  Add Link
                </button>
              </div>
            </div>

            {/* Attached Resources Bar & Navigation */}
            {resources.length > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)]">
                    Attached Resources ({resources.length})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResourceNavigation("prev")}
                      disabled={resources.length <= 1}
                      className="rounded-full border-2 border-[var(--foreground)] p-1 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-bold">{selectedResourceIndex + 1} / {resources.length}</span>
                    <button
                      onClick={() => handleResourceNavigation("next")}
                      disabled={resources.length <= 1}
                      className="rounded-full border-2 border-[var(--foreground)] p-1 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                  {resources.map((res, idx) => {
                    const isSelected = idx === selectedResourceIndex;
                    const ResourceIcon = res.type === "youtube" ? Youtube : res.type === "pdf" ? FileText : ImageIcon;
                    return (
                      <div
                        key={res.id}
                        onClick={() => {
                          setSelectedResourceIndex(idx);
                          setSelectedFileName(res.title);
                          setSelectedFileUrl(res.link);
                          setSelectedMimeType(res.mimeType || "application/octet-stream");
                        }}
                        className={`flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs font-bold cursor-pointer transition ${
                          isSelected
                            ? "border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-[2px_2px_0_0_#1E293B]"
                            : "border-[var(--foreground)] bg-white text-[var(--foreground)] hover:bg-slate-50"
                        }`}
                      >
                        <ResourceIcon size={12} />
                        <span className="truncate max-w-[120px]">{res.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeResource(res.id);
                          }}
                          className="ml-1 text-xs hover:text-red-300 font-black"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Live Viewer Window */}
                {selectedFileUrl ? (
                  <div className="mt-3 overflow-hidden rounded-[20px] border-2 border-[var(--foreground)] bg-slate-900 shadow-[4px_4px_0_0_#1E293B]">
                    {selectedMimeType === "video/youtube" ? (
                      <iframe
                        title={selectedFileName || "YouTube"}
                        src={selectedFileUrl}
                        className="w-full h-[320px] bg-black"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : selectedMimeType.startsWith("image/") ? (
                      <img src={selectedFileUrl} alt={selectedFileName} className="w-full h-[320px] object-contain bg-slate-950" />
                    ) : selectedMimeType === "application/pdf" ? (
                      <iframe title={selectedFileName} src={selectedFileUrl} className="w-full h-[380px] bg-white" />
                    ) : (
                      <div className="p-6 text-center text-white">
                        <FileText size={32} className="mx-auto mb-2 text-purple-400" />
                        <p className="font-bold text-sm">{selectedFileName}</p>
                        <p className="text-xs text-slate-300 mt-1">Resource active. Click to view in new browser tab.</p>
                        <a href={selectedFileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6] px-4 py-1.5 text-xs font-black text-white">
                          <Link2 size={12} /> Open Document
                        </a>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── LOWER SECTION: Task Queue & Whitelist Blocker Guard Controls ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Queue Container */}
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.taskList}</p>
              <h3 className="mt-1 font-display text-2xl font-black">{copy.currentQueue}</h3>
            </div>
            <button
              onClick={() => setShowAddTask(true)}
              className="flex h-9 items-center gap-1.5 rounded-full border-2 border-[var(--foreground)] bg-[#FBBF24] px-3.5 text-xs font-black shadow-[3px_3px_0_0_#1E293B]"
            >
              <Plus size={14} strokeWidth={2.5} />
              {copy.addTask}
            </button>
          </div>

          {/* Task List Items */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {tasks.map((task) => {
              const isActive = task.id === activeTaskId;
              const isDone = task.status === "done";
              const isExpanded = expandedTaskId === task.id;

              return (
                <div key={task.id} className={`rounded-[20px] border-2 border-[var(--foreground)] p-3.5 shadow-[3px_3px_0_0_#1E293B] transition ${isActive ? "bg-[#FFF7D6]" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                      <p className={`font-bold text-sm ${isDone ? "line-through text-[var(--muted-fg)]" : ""}`}>{task.title}</p>
                      <p className="mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">{task.subject} • {task.minutes} min</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hard-chip px-2.5 py-1 text-[10px] font-black">+{task.xp} XP</span>
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        disabled={isDone}
                        className="rounded-full border-2 border-[var(--foreground)] bg-white px-3 py-1 text-xs font-black shadow-[2px_2px_0_0_#1E293B] disabled:opacity-50"
                      >
                        {isDone ? copy.done : copy.complete}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Whitelisted Sites & Desktop App Blocker Guard */}
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border-2 border-[var(--foreground)] bg-[#F3E8FF] p-2.5 shadow-[2px_2px_0_0_#1E293B]">
                <ShieldAlert size={20} className="text-[#8B5CF6]" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Focus Guard Controls</p>
                <h3 className="font-display text-lg font-black mt-0.5">Website Whitelist & App Shield</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsGuardControlsOpen((prev) => !prev)}
              className="secondary-button flex items-center gap-1.5 rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-1.5 text-xs font-black shadow-[2px_2px_0_0_#1E293B]"
            >
              {isGuardControlsOpen ? "Collapse" : "Edit Guard"}
              {isGuardControlsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Collapsible Whitelist & Blocker Section */}
          {isGuardControlsOpen ? (
            <div className="mt-4 border-t-2 border-[var(--foreground)] pt-4 space-y-4">
              {/* Website Whitelist Input */}
              <div>
                <p className="text-xs font-bold text-[var(--muted-fg)] uppercase mb-2">Whitelisted Domains</p>
                <div className="flex gap-2">
                  <input
                    value={newSiteInput}
                    onChange={(e) => setNewSiteInput(e.target.value)}
                    placeholder="domain (e.g. github.com)"
                    className="w-full rounded-[12px] border-2 border-[var(--foreground)] px-3 py-1.5 text-xs font-bold outline-none"
                  />
                  <button onClick={handleAddCustomSite} className="candy-button rounded-[12px] border-2 border-[var(--foreground)] px-3 py-1.5 text-xs font-bold">
                    Add Domain
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {blockedSites.map((item) => (
                    <span key={item.site} className="inline-flex items-center gap-1 rounded-full border border-[var(--foreground)] bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-bold">
                      ✓ {item.site}
                      <button onClick={() => handleRemoveSite(item.site)} className="text-red-500 hover:text-red-700 ml-1 font-black">×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Desktop App Blocker Input */}
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs font-bold text-[var(--muted-fg)] uppercase mb-2">Blocked Windows Apps</p>
                <div className="flex gap-2">
                  <input
                    value={newAppInput}
                    onChange={(e) => setNewAppInput(e.target.value)}
                    placeholder="app exe (e.g. discord.exe)"
                    className="w-full rounded-[12px] border-2 border-[var(--foreground)] px-3 py-1.5 text-xs font-bold outline-none"
                  />
                  <button onClick={handleAddCustomApp} className="candy-button rounded-[12px] border-2 border-[var(--foreground)] px-3 py-1.5 text-xs font-bold">
                    Block App
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {blockedApps.map((app) => (
                    <span key={app} className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-800">
                      🚫 {app}
                      <button onClick={() => handleRemoveApp(app)} className="text-red-600 hover:text-red-900 ml-1 font-black">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs font-semibold text-[var(--muted-fg)]">
              Shield Active: {blockedSites.length} websites whitelisted • {blockedApps.length} desktop apps blocked
            </p>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
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

      {/* Emergency Exit PIN Modal */}
      {showPinModal && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-black text-red-600 flex items-center gap-2">
                    <Lock size={20} /> Emergency Exit PIN
                  </h3>
                  <button onClick={() => setShowPinModal(false)} className="font-black text-gray-400 hover:text-black">✕</button>
                </div>
                <p className="text-xs font-semibold text-[var(--muted-fg)] mb-4">
                  Enter your Emergency PIN to disengage Focus Lock.
                </p>
                <input
                  type="password"
                  maxLength={6}
                  value={emergencyPinInput}
                  onChange={(e) => setEmergencyPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full rounded-[16px] border-2 border-[var(--foreground)] bg-[#FFF7D6] px-4 py-3 text-center text-2xl font-black tracking-widest outline-none mb-3"
                />
                {pinError && <p className="text-xs font-bold text-red-500 mb-3 text-center">{pinError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowPinModal(false)} className="secondary-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] py-3 font-bold text-sm">
                    Cancel
                  </button>
                  <button onClick={handleVerifyEmergencyPin} className="candy-button flex-1 rounded-[16px] border-2 border-red-600 bg-red-600 py-3 font-bold text-sm text-white">
                    Unlock Session
                  </button>
                </div>
              </motion.div>
            </div>,
            document.body
          )
        : null}

      {/* Live Distraction Tracker Log Card */}
      {(distractionLogs.length > 0 || browserDistractionLogs.length > 0) && (
        <div className="mt-6 rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-black text-red-500 flex items-center gap-2">
              <ShieldAlert size={20} /> Live Distraction Log ({distractionLogs.length + browserDistractionLogs.length} Blocked)
            </h3>
            <span className="hard-chip px-3 py-1 text-xs font-black bg-red-100 text-red-700">Protected</span>
          </div>
          {distractionLogs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)] mb-2">💻 Desktop App Blocks</p>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {distractionLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-[14px] border-2 border-[var(--foreground)] bg-[#FDF2F8] px-3 py-2 text-xs font-bold">
                    <span className="text-red-700">💻 Killed: {log.app || log.url || "Distraction Process"}</span>
                    <span className="text-[var(--muted-fg)]">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Just now"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {browserDistractionLogs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)] mb-2">🌐 Browser Site Blocks</p>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {browserDistractionLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-[14px] border-2 border-[var(--foreground)] bg-[#E0F2FE] px-3 py-2 text-xs font-bold">
                    <span className="text-sky-700">🌐 Blocked: {log.domain}</span>
                    <span className="text-[var(--muted-fg)]">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Just now"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Delete Confirmation Modal */}
      {taskToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
            <h3 className="font-display text-xl font-black">Delete Task?</h3>
            <p className="mt-2 text-sm font-semibold text-[var(--muted-fg)]">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setTaskToDeleteId(null)}
                className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = taskToDeleteId;
                  setTaskToDeleteId(null);
                  deleteTask(id)
                    .then(() => {
                      setTasks((prev) => prev.filter((t) => t.id !== id));
                    })
                    .catch(() => {
                      setTasks((prev) => prev.filter((t) => t.id !== id));
                    });
                }}
                className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] bg-red-500 text-white px-4 py-3 font-bold text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
