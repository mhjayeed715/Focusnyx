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
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  Volume2,
  X,
  Youtube,
  UploadCloud,
  Flame,
  Laptop,
  Globe,
  Zap,
  XCircle,
} from "lucide-react";
import { useLanguage } from "@/components/layout/language-context";
import { usePomodoro } from "@/hooks/usePomodoro";
import { completePomodoro, createTask, updateTask, deleteTask, getDashboardBootstrap } from "@/lib/backend";
import { createClient } from "@/lib/supabase/client";
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
  { key: "rain", label: "Rain", icon: Radio },
  { key: "lofi", label: "Lofi", icon: Music2 },
  { key: "white", label: "White Noise", icon: Sparkles },
  { key: "none", label: "Mute", icon: Volume2 },
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
  private currentAudio: HTMLAudioElement | null = null;
  private currentSoundType: string | null = null;

  play(soundType: "rain" | "white" | "lofi", volume: number) {
    const soundMap: Record<string, string> = {
      rain: "/audios/rain.mp3",
      white: "/audios/whitesound.mp3",
      lofi: "/audios/lofi.mp3",
    };

    const url = soundMap[soundType];
    if (!url) {
      this.stop();
      return;
    }

    const vol = Math.max(0, Math.min(1, volume / 100));

    if (this.currentAudio && this.currentSoundType === soundType) {
      this.currentAudio.volume = vol;
      if (this.currentAudio.paused) {
        this.currentAudio.play().catch(() => {});
      }
      return;
    }

    this.stop();

    try {
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = vol;
      audio.play().catch(() => {});
      this.currentAudio = audio;
      this.currentSoundType = soundType;
    } catch {
      // Audio autoplay fallback
    }
  }

  setVolume(volume: number) {
    if (this.currentAudio) {
      this.currentAudio.volume = Math.max(0, Math.min(1, volume / 100));
    }
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
      this.currentSoundType = null;
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
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getYouTubeWatchUrl(url: string): string {
  const videoId = extractYouTubeId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
}

function getYouTubeEmbedUrl(url: string): string {
  const videoId = extractYouTubeId(url);
  if (!videoId) return url;
  const origin = typeof window !== "undefined" && window.location.origin ? encodeURIComponent(window.location.origin) : "";
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&enablejsapi=1${origin ? `&origin=${origin}` : ""}`;
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
        addTask: "Add Task",
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
  const [newTaskMicrotasks, setNewTaskMicrotasks] = useState("");
  const [newTaskAttachFocus, setNewTaskAttachFocus] = useState(false);
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
  const [isViewerMaximized, setIsViewerMaximized] = useState(false);

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

  // Prompt Set PIN Modal state for new users
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState("");
  const [setPinModalError, setSetPinModalError] = useState("");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (showSetPinModal) {
      setNewPinInput("");
      setSetPinModalError("");
    }
  }, [showSetPinModal]);

  useEffect(() => {
    if (showPinModal) {
      setEmergencyPinInput("");
      setPinError("");
    }
  }, [showPinModal]);

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

        if (data.profile) {
          setProfile(data.profile);
        }

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

  const { minutes, seconds, isRunning, isLocked, start, pause, reset, setIsLocked } = usePomodoro(durationMinutes, async () => {
    setIsLocked(false);
    notifyExtension("stopFocus");
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const duration = durationMinutes;
    const sessionXp = Math.max(60, duration * 4);
    let totalAwardedXp = sessionXp;
    let taskWasCompleted = false;

    if (activeTask && activeTask.status !== "done") {
      taskWasCompleted = true;
      totalAwardedXp += activeTask.xp;
      updateTasks((current) =>
        current.map((entry) => {
          if (entry.id !== activeTask.id) return entry;
          return {
            ...entry,
            status: "done",
            subtasks: entry.subtasks.map((st) => ({ ...st, completed: true })),
          };
        })
      );

      if (!activeTask.id.startsWith("focus-local-") && !activeTask.id.startsWith("starter-")) {
        updateTask(activeTask.id, { completed: true }).catch(() => {});
      }

      toast.success(`Focus session finished! Task "${activeTask.title}" auto-completed! +${totalAwardedXp} XP earned!`);
    } else {
      toast.success(`Focus session completed! +${sessionXp} XP earned!`);
    }

    const currentProgress = readLocalProgress();
    const nextProgress: LocalProgress = {
      xp: currentProgress.xp + totalAwardedXp,
      focusMinutes: currentProgress.focusMinutes + duration,
      sessionsCompleted: currentProgress.sessionsCompleted + 1,
      completedTasks: currentProgress.completedTasks + (taskWasCompleted ? 1 : 0),
    };

    writeLocalProgress(nextProgress);
    setTotalXp((current) => current + totalAwardedXp);

    const nextReadyTask = tasks.find((t) => t.id !== activeTask?.id && t.status !== "done");
    if (nextReadyTask) {
      setActiveTaskId(nextReadyTask.id);
    }

    try {
      await completePomodoro(duration);
    } catch {
      // Local sync fallback
    }
  });

  // Audio Engine instance ref & playback manager
  const audioEngineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    return () => {
      audioEngineRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!audioEngineRef.current) return;
    if (!isRunning || focusSound === "none") {
      audioEngineRef.current.stop();
    } else {
      audioEngineRef.current.play(focusSound, focusVolume);
    }
  }, [isRunning, focusSound, focusVolume]);

  const handleStartFocus = async () => {
    const rawSavedPin = profile?.emergencyPin || (profile?.id ? localStorage.getItem(`focusnyxEmergencyPinV1_${profile.id}`) : null) || localStorage.getItem(STORAGE_KEY_PIN);
    const savedPin = (rawSavedPin && rawSavedPin.trim() !== "123456" && rawSavedPin.trim().length === 6 && /^\d+$/.test(rawSavedPin.trim())) ? rawSavedPin.trim() : null;

    if (!savedPin) {
      setNewPinInput("");
      setSetPinModalError("");
      setShowSetPinModal(true);
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // Fullscreen not supported
    }
    setIsLocked(true);
    start();
    notifyExtension("startFocus", { durationMinutes, pin: savedPin });
  };

  const handleSaveAndStartFocus = async () => {
    const pinVal = newPinInput.trim();
    if (pinVal.length !== 6 || !/^\d+$/.test(pinVal)) {
      setSetPinModalError("Please enter a valid 6-digit numeric Emergency PIN.");
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_PIN, pinVal);
      if (profile?.id) {
        localStorage.setItem(`focusnyxEmergencyPinV1_${profile.id}`, pinVal);
      }
      notifyExtension("syncPin", { pin: pinVal });

      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb.from("profiles").update({ emergency_pin: pinVal }).eq("id", user.id);
      }

      setProfile((prev: any) => prev ? { ...prev, emergencyPin: pinVal } : { emergencyPin: pinVal });
      setShowSetPinModal(false);
      toast.success("Emergency PIN set successfully!");

      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {}
      setIsLocked(true);
      start();
      notifyExtension("startFocus", { durationMinutes, pin: pinVal });
    } catch {
      toast.error("Failed to set PIN. Please try again.");
    }
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
    const savedPin = profile?.emergencyPin || (profile?.id ? localStorage.getItem(`focusnyxEmergencyPinV1_${profile.id}`) : null) || localStorage.getItem(STORAGE_KEY_PIN);
    if (savedPin && emergencyPinInput.trim() === savedPin.trim()) {
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

    if (taskId === activeTaskId) {
      toast.error("Focus tasks auto-complete when the focus timer finishes! Manual completion is disabled.");
      return;
    }

    updateTasks((current) => current.map((entry) => (entry.id === taskId ? { ...entry, status: "done" } : entry)));
    setTotalXp((current) => current + task.xp);

    if (!taskId.startsWith("focus-local-") && !taskId.startsWith("starter-")) {
      try {
        await updateTask(taskId, { completed: true });
        toast.success(`Completed "${task.title}"! +${task.xp} XP`);
      } catch {
        toast.error("Could not sync completion to server.");
      }
    } else {
      toast.success(`Marked "${task.title}" done! +${task.xp} XP`);
    }
  };

  const handleStartEditTask = (task: FocusTask) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskSubject(task.subject);
    setEditTaskEstimate(task.minutes ? String(task.minutes) : "");
    setEditTaskMicrotasks(task.subtasks.map((s) => s.title).join("\n"));
  };

  const handleSaveEditTask = async () => {
    if (!editingTaskId || !editTaskTitle.trim()) return;
    const estimatedMinutes = Math.max(0, Number(editTaskEstimate) || 0);
    const subtasksText = parseMicrotasks(editTaskMicrotasks);

    updateTasks((current) =>
      current.map((t) => {
        if (t.id !== editingTaskId) return t;
        return {
          ...t,
          title: editTaskTitle.trim(),
          subject: editTaskSubject.trim() || "Focus",
          minutes: estimatedMinutes,
          xp: estimatedMinutes > 0 ? Math.max(20, estimatedMinutes * 4) : 20,
          subtasks: subtasksText.map((st, idx) => ({
            id: t.subtasks[idx]?.id || `sub-edit-${Date.now()}-${idx}`,
            title: st,
            completed: t.subtasks[idx]?.completed || false,
          })),
        };
      })
    );

    if (!editingTaskId.startsWith("focus-local-") && !editingTaskId.startsWith("starter-")) {
      try {
        await updateTask(editingTaskId, {
          title: editTaskTitle.trim(),
          subject: editTaskSubject.trim() || "Focus",
          estimate: estimatedMinutes,
          subtasks: subtasksText,
        });
        toast.success("Task updated!");
      } catch {
        toast.error("Saved edit locally.");
      }
    } else {
      toast.success("Task updated!");
    }

    setEditingTaskId(null);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const estimatedMinutes = Math.max(0, Number(newTaskEstimate) || (isAdhd ? 25 : 0));
    const subtasks = parseMicrotasks(newTaskMicrotasks);
    const optimisticId = `focus-local-${Date.now()}`;
    const optimisticTask: FocusTask = {
      id: optimisticId,
      title: newTaskTitle.trim(),
      subject: newTaskSubject.trim() || "Focus",
      minutes: estimatedMinutes,
      xp: estimatedMinutes > 0 ? Math.max(20, estimatedMinutes * 4) : 20,
      status: "ready",
      subtasks: subtasks.map((subtask, index) => ({
        id: `focus-local-${Date.now()}-${index}`,
        title: subtask,
        completed: false,
      })),
    };

    updateTasks((current) => [optimisticTask, ...current]);
    if (isAdhd || newTaskAttachFocus) {
      setActiveTaskId(optimisticTask.id);
    }
    setShowAddTask(false);
    setNewTaskTitle("");
    setNewTaskSubject("Focus");
    setNewTaskEstimate(isAdhd ? "25" : "");
    setNewTaskMicrotasks("");

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
      toast.success(`Task "${optimisticTask.title}" created!`);
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
      toast.success(`Uploaded ${newResources.length} study material${newResources.length > 1 ? "s" : ""}`);
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
    const isYoutube = resourceType === "youtube" || Boolean(extractYouTubeId(resourceLink.trim()));
    const finalType: StudyResourceType = isYoutube ? "youtube" : resourceType;
    const watchUrl = isYoutube ? getYouTubeWatchUrl(resourceLink.trim()) : resourceLink.trim();

    const nextResource: StudyResource = {
      id: `resource-${Date.now()}`,
      type: finalType,
      title: resourceTitle.trim() || (isYoutube ? "YouTube Video" : "Online Resource"),
      link: watchUrl,
      source: "link",
      mimeType: isYoutube ? "video/youtube" : finalType === "pdf" ? "application/pdf" : "image/",
    };
    setResources((current) => [nextResource, ...current]);
    setSelectedResourceIndex(0);
    setSelectedFileName(nextResource.title);
    setSelectedFileUrl(watchUrl);
    setSelectedMimeType(nextResource.mimeType || "application/octet-stream");
    setResourceTitle("");
    setResourceLink("");
    toast.success(`Link added to study resources.`);
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
    setSelectedFileUrl(res.type === "youtube" ? getYouTubeWatchUrl(res.link) : res.link);
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
    toast.success(`Added ${clean} to whitelist`);
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
    toast.success(`Added ${exe} to blocked apps`);
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
            <p className="text-xs font-bold text-[var(--muted-fg)] flex items-center gap-1.5 mt-0.5">
              <Zap size={13} className="text-[#8B5CF6]" />
              {isAdhd ? "ADHD Hyperfocus Mode — Reduced Clutter & Pre-filled Defaults" : "Standard Workstation Mode"}
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
              <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)] flex items-center gap-1.5">
                {isRunning ? (
                  <>
                    <Flame size={14} className="text-amber-500 fill-amber-500" /> Deep Focus Session Active
                  </>
                ) : (
                  "Ready to Start"
                )}
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
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Zap size={13} className="text-emerald-700" /> ADHD Defaults: 25m Focus / 5m Break
                </span>
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
                    <span className="truncate w-full text-[11px] font-bold">{sound.label}</span>
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
                <h3 className="mt-1 font-display text-2xl font-black">Resource Reader & Library</h3>
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

                {/* Spacious Live Resource Reader Window */}
                {selectedFileUrl ? (
                  <div className="mt-3 overflow-hidden rounded-[22px] border-2 border-[var(--foreground)] bg-slate-900 shadow-[6px_6px_0_0_#1E293B]">
                    {/* Header Bar with Maximize Reader option */}
                    <div className="flex items-center justify-between border-b-2 border-slate-700 bg-slate-800 px-4 py-2.5 text-white">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="rounded-full border border-purple-400 bg-purple-900/60 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-200">
                          {selectedMimeType === "video/youtube" ? "YouTube" : selectedMimeType?.split("/")[1]?.toUpperCase() || "DOCUMENT"}
                        </span>
                        <p className="truncate text-xs font-bold text-slate-200" title={selectedFileName}>
                          {selectedFileName || "Resource Reader"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={selectedMimeType === "video/youtube" ? getYouTubeWatchUrl(selectedFileUrl) : selectedFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-full border border-slate-600 bg-slate-700 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-600"
                        >
                          <Link2 size={12} /> Open Link
                        </a>
                        <button
                          type="button"
                          onClick={() => setIsViewerMaximized(true)}
                          className="flex items-center gap-1.5 rounded-full border border-purple-500 bg-[#8B5CF6] px-3.5 py-1 text-[11px] font-black text-white hover:bg-purple-600 shadow-[2px_2px_0_0_#000]"
                        >
                          <Maximize2 size={12} /> Maximize Reader
                        </button>
                      </div>
                    </div>

                    {/* High-Resolution Viewer Area */}
                    {selectedMimeType === "video/youtube" ? (
                      <iframe
                        title={selectedFileName || "YouTube"}
                        src={getYouTubeEmbedUrl(selectedFileUrl)}
                        className="w-full h-[480px] bg-black"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : selectedMimeType.startsWith("image/") ? (
                      <div className="grid place-items-center h-[520px] bg-slate-950 p-4">
                        <img src={selectedFileUrl} alt={selectedFileName} className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : selectedMimeType === "application/pdf" ? (
                      <iframe title={selectedFileName} src={selectedFileUrl} className="w-full h-[620px] bg-white" />
                    ) : (
                      <div className="p-8 text-center text-white h-[400px] grid place-items-center">
                        <div>
                          <FileText size={40} className="mx-auto mb-3 text-purple-400" />
                          <p className="font-bold text-base">{selectedFileName}</p>
                          <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                            Document loaded. Click Open Link to view or print in full detail.
                          </p>
                          <a
                            href={selectedFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-[#8B5CF6] px-5 py-2 text-xs font-black text-white shadow-[3px_3px_0_0_#1E293B]"
                          >
                            <Link2 size={14} /> Open Full Document
                          </a>
                        </div>
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
                <div key={task.id} className={`rounded-[20px] border-2 border-[var(--foreground)] p-3.5 shadow-[3px_3px_0_0_#1E293B] transition ${isActive ? "bg-[#FFF7D6] border-purple-600" : "bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                      <div className="flex items-center gap-2">
                        <p className={`font-bold text-sm ${isDone ? "line-through text-[var(--muted-fg)]" : ""}`}>{task.title}</p>
                        {isActive && !isDone && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500 bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-900">
                            <Target size={10} className="text-purple-700" /> Focus Task
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">
                        {task.subject} • {task.minutes} min {isActive ? "• Auto-completes on timer finish" : "• Normal Task (Manual completion)"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="hard-chip px-2 py-0.5 text-[10px] font-black">+{task.xp} XP</span>

                      {/* Set / Unset Active Focus Task in Standard Mode */}
                      {!isDone && !isAdhd && (
                        isActive ? (
                          <button
                            type="button"
                            onClick={() => setActiveTaskId(null)}
                            className="rounded-full border-2 border-purple-600 bg-purple-600 px-2 py-0.5 text-[10px] font-black text-white shadow-[2px_2px_0_0_#1E293B] hover:bg-purple-700"
                            title="Detach from Pomodoro Timer"
                          >
                            <Target size={11} className="inline mr-0.5" /> Unset
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTaskId(task.id)}
                            className="rounded-full border-2 border-[var(--foreground)] bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-900 shadow-[2px_2px_0_0_#1E293B] hover:bg-purple-200"
                            title="Attach to Pomodoro Timer"
                          >
                            <Target size={11} className="inline mr-0.5" /> Focus
                          </button>
                        )
                      )}

                      {/* Edit Task Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditTask(task);
                        }}
                        className="rounded-full border-2 border-[var(--foreground)] bg-white p-1 text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0_0_#1E293B]"
                        title="Edit Task"
                      >
                        <PenTool size={13} />
                      </button>

                      {/* Delete Task Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskToDeleteId(task.id);
                        }}
                        className="rounded-full border-2 border-[var(--foreground)] bg-white p-1 text-red-500 hover:bg-red-50 shadow-[2px_2px_0_0_#1E293B]"
                        title="Delete Task"
                      >
                        <Trash2 size={13} />
                      </button>

                      {/* Complete Task Button for Normal Tasks / Locked for Focus Tasks */}
                      {isActive && !isDone ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border-2 border-purple-500 bg-purple-100 px-2.5 py-0.5 text-xs font-black text-purple-950 shadow-[2px_2px_0_0_#1E293B]"
                          title="Focus tasks auto-complete when the timer finishes. Cannot be manually completed."
                        >
                          <Lock size={12} className="text-purple-700" /> Focus Task
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={isDone}
                          title={isDone ? "Task Completed" : "Mark normal task done"}
                          className={`rounded-full border-2 border-[var(--foreground)] px-3 py-0.5 text-xs font-black shadow-[2px_2px_0_0_#1E293B] ${
                            isDone ? "bg-slate-100 text-slate-400 opacity-60" : "bg-emerald-400 text-black hover:bg-emerald-300"
                          }`}
                        >
                          {isDone ? copy.done : copy.complete}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Whitelisted Sites & Desktop App Blocker Guard */}
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border-2 border-[var(--foreground)] bg-[#F3E8FF] p-2.5 shadow-[2px_2px_0_0_#1E293B]">
                <ShieldAlert size={22} className="text-[#8B5CF6]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Focus Guard Controls</p>
                  <span className="rounded-full border border-emerald-400 bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                    Active Guard
                  </span>
                </div>
                <h3 className="font-display text-lg font-black mt-0.5">Whitelisted Sites & App Blocker</h3>
                <p className="text-xs text-[var(--muted-fg)] font-semibold mt-0.5">
                  {blockedSites.filter((s) => s.enabled).length} whitelisted sites • {blockedApps.length} desktop apps blocked
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsGuardControlsOpen((prev) => !prev)}
                className="candy-button inline-flex items-center gap-1.5 rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3.5 py-2 text-xs font-black shadow-[3px_3px_0_0_#1E293B]"
              >
                {isGuardControlsOpen ? (
                  <>
                    <span>Collapse</span>
                    <ChevronUp size={16} />
                  </>
                ) : (
                  <>
                    <span>Quick Edit</span>
                    <ChevronDown size={16} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Whitelist & Blocker Controls */}
          {isGuardControlsOpen && (
            <div className="mt-5 border-t-2 border-[var(--foreground)] pt-4 space-y-6">
              {/* Web Domains Whitelist Section */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-fg)]">Allowed Websites Whitelist</p>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    🔒 All other sites blocked during Focus Mode
                  </span>
                </div>

                {/* Quick Add Suggestions with Domain Favicons */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-bold text-[var(--muted-fg)] self-center mr-1">Suggestions:</span>
                  {WHITELIST_SUGGESTIONS.map((site) => {
                    const isAdded = blockedSites.some((s) => s.site === site);
                    return (
                      <button
                        key={site}
                        type="button"
                        disabled={isAdded}
                        onClick={() => {
                          if (!isAdded) {
                            const nextSites = [...blockedSites, { site, enabled: true, blocked: 0 }];
                            setBlockedSites(nextSites);
                            syncBlocklistToAll(nextSites, blockedApps);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--foreground)] px-2.5 py-1 text-[11px] font-bold transition ${
                          isAdded
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300"
                            : "bg-[#FFF7D6] text-[var(--foreground)] hover:opacity-90 hover:shadow-[2px_2px_0_0_#1E293B] shadow-[1px_1px_0_0_#1E293B]"
                        }`}
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${site}&sz=32`}
                          alt=""
                          className="h-3.5 w-3.5 rounded-sm object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                        />
                        <span>{isAdded ? `✓ ${site}` : `+ ${site}`}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={newSiteInput}
                    onChange={(e) => setNewSiteInput(e.target.value)}
                    placeholder="Custom domain (e.g. github.com)"
                    className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
                  />
                  <button onClick={handleAddCustomSite} className="candy-button shrink-0 rounded-[14px] border-2 border-[var(--foreground)] px-4 py-2 text-xs font-bold">
                    Add Whitelist
                  </button>
                </div>

                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {blockedSites.map((item) => (
                    <div
                      key={item.site}
                      className="flex w-full items-center justify-between rounded-[14px] border-2 border-[var(--foreground)] bg-[#ECFDF5] px-3 py-2 text-sm shadow-[3px_3px_0_0_#1E293B]"
                    >
                      <div className="flex-1 flex items-center gap-2.5">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${item.site}&sz=64`}
                          alt={item.site}
                          className="h-5 w-5 rounded-sm object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>";
                          }}
                        />
                        <span className="font-bold">{item.site}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[var(--foreground)] bg-[#34D399] px-2 py-0.5 text-[10px] font-black text-black">
                          ✓ ACCESSIBLE
                        </span>
                        <button type="button" onClick={() => handleRemoveSite(item.site)} className="text-red-500 hover:text-red-700 p-1" title="Remove from Whitelist">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Windows App Selection Grid Section */}
              <div className="border-t-2 border-[var(--foreground)] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-fg)]">Windows Apps to Block</p>
                    {isCompanionActive && (
                      <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live Companion connected ({detectedDesktopApps.length} desktop apps detected)
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                    Terminated automatically during Focus Mode
                  </span>
                </div>

                {/* Live Detected User Desktop Apps Grid (if Companion is running) */}
                {detectedDesktopApps.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-black uppercase text-[var(--muted-fg)]">Desktop Apps Running on PC:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                      {detectedDesktopApps.map((app) => {
                        const isBlocked = blockedApps.includes(app.exe);
                        const matchedPreset = COMMON_APPS.find((preset) => preset.exe.toLowerCase() === app.exe.toLowerCase());
                        return (
                          <button
                            key={app.exe}
                            type="button"
                            onClick={() => {
                              if (isBlocked) {
                                handleRemoveApp(app.exe);
                              } else {
                                const nextApps = [...blockedApps, app.exe];
                                setBlockedApps(nextApps);
                                syncBlocklistToAll(blockedSites, nextApps);
                              }
                            }}
                            className={`flex items-center gap-2.5 rounded-[14px] border-2 border-[var(--foreground)] p-2 text-left text-xs font-bold transition-all ${
                              isBlocked
                                ? "bg-[#FEE2E2] border-red-500 text-red-900 shadow-[2px_2px_0_0_#991B1B]"
                                : "bg-white text-[var(--foreground)] hover:bg-slate-50 shadow-[2px_2px_0_0_#1E293B]"
                            }`}
                          >
                            {matchedPreset ? (
                              <img src={matchedPreset.iconUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />
                            ) : (
                              <span className="text-base shrink-0"><Laptop size={16} /></span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-black text-xs" title={app.name}>{app.name}</p>
                              <p className={`text-[10px] font-bold ${isBlocked ? "text-red-700" : app.running ? "text-emerald-700" : "text-slate-500"}`}>
                                {isBlocked ? "Blocked" : app.running ? "Running Now" : "Allowed"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Visual Common App Presets Grid */}
                <div className="mt-4">
                  <p className="text-[11px] font-black uppercase text-[var(--muted-fg)] mb-2">Popular Distraction App Presets:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COMMON_APPS.map((app) => {
                      const isBlocked = blockedApps.includes(app.exe);
                      return (
                        <button
                          key={app.exe}
                          type="button"
                          onClick={() => {
                            if (isBlocked) {
                              handleRemoveApp(app.exe);
                            } else {
                              const nextApps = [...blockedApps, app.exe];
                              setBlockedApps(nextApps);
                              syncBlocklistToAll(blockedSites, nextApps);
                            }
                          }}
                          className={`flex items-center gap-2.5 rounded-[14px] border-2 border-[var(--foreground)] p-2.5 text-left text-xs font-bold transition-all ${
                            isBlocked
                              ? "bg-[#FEE2E2] border-red-500 text-red-900 shadow-[3px_3px_0_0_#991B1B]"
                              : "bg-white text-[var(--foreground)] hover:bg-slate-50 shadow-[2px_2px_0_0_#1E293B]"
                          }`}
                        >
                          <img
                            src={app.iconUrl}
                            alt={app.name}
                            className="h-5 w-5 shrink-0 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-black text-xs">{app.name}</p>
                            <p className={`text-[10px] font-bold ${isBlocked ? "text-red-700" : "text-slate-500"}`}>
                              {isBlocked ? "Blocked" : "Allowed"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom App Name Input */}
                <div className="mt-4 flex gap-2">
                  <input
                    value={newAppInput}
                    onChange={(e) => setNewAppInput(e.target.value)}
                    placeholder="Custom app (e.g. discord or photoshop)"
                    className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
                  />
                  <button onClick={handleAddCustomApp} className="candy-button shrink-0 rounded-[14px] border-2 border-[var(--foreground)] px-4 py-2 text-xs font-bold">
                    Add App
                  </button>
                </div>

                {/* Active Blocked Apps Tags */}
                {blockedApps.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-200 pt-3">
                    <span className="text-[11px] font-bold text-[var(--muted-fg)] self-center mr-1">Active Blocked Apps:</span>
                    {blockedApps.map((app) => (
                      <span key={app} className="flex items-center gap-1 rounded-full border-2 border-[var(--foreground)] bg-[#FEE2E2] px-2.5 py-0.5 text-xs font-bold text-red-800 shadow-[2px_2px_0_0_#1E293B]">
                        🚫 {app}
                        <button onClick={() => handleRemoveApp(app)} className="ml-1 font-black text-red-600 hover:text-red-900">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maximized Reader Modal Overlay */}
      {isViewerMaximized && selectedFileUrl && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-[94vw] h-[92vh] max-w-7xl rounded-[28px] border-4 border-[var(--foreground)] bg-slate-900 shadow-[10px_10px_0_0_#1E293B] flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between border-b-2 border-slate-700 bg-slate-800 px-6 py-4 text-white shrink-0">
                  <div className="flex items-center gap-3">
                    <LibraryBig size={22} className="text-purple-400" />
                    <div>
                      <p className="font-display text-lg font-black text-white">{selectedFileName || "Document Reader"}</p>
                      <p className="text-xs text-slate-300">Focused Study Workspace</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={selectedMimeType === "video/youtube" ? getYouTubeWatchUrl(selectedFileUrl) : selectedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-purple-400 bg-purple-900/80 px-4 py-2 text-xs font-black text-purple-200 hover:bg-purple-800"
                    >
                      <Link2 size={14} /> Open in Browser Tab
                    </a>
                    <button
                      onClick={() => setIsViewerMaximized(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-500 font-black text-white shadow-[2px_2px_0_0_#000]"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-950 p-2 overflow-hidden">
                  {selectedMimeType === "video/youtube" ? (
                    <iframe
                      title={selectedFileName || "YouTube"}
                      src={getYouTubeEmbedUrl(selectedFileUrl)}
                      className="w-full h-full bg-black rounded-[16px]"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  ) : selectedMimeType.startsWith("image/") ? (
                    <div className="grid place-items-center h-full w-full bg-slate-950 p-4">
                      <img src={selectedFileUrl} alt={selectedFileName} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : selectedMimeType === "application/pdf" ? (
                    <iframe title={selectedFileName} src={selectedFileUrl} className="w-full h-full bg-white rounded-[16px]" />
                  ) : (
                    <div className="grid place-items-center h-full w-full p-8 text-center text-white">
                      <div>
                        <FileText size={56} className="mx-auto mb-4 text-purple-400" />
                        <p className="font-bold text-xl">{selectedFileName}</p>
                        <a
                          href={selectedFileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-white bg-[#8B5CF6] px-6 py-3 text-sm font-black text-white"
                        >
                          <Link2 size={16} /> Open Document
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>,
            document.body
          )
        : null}

      {/* Edit Task Modal */}
      {editingTaskId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl font-black">Edit Task</h3>
              <button onClick={() => setEditingTaskId(null)} className="rounded-full border-2 border-[var(--foreground)] p-2">
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)]">Task Title</label>
                <input
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3 shadow-[4px_4px_0_0_#1E293B] outline-none mt-1 font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)]">Subject / Category</label>
                <input
                  value={editTaskSubject}
                  onChange={(e) => setEditTaskSubject(e.target.value)}
                  placeholder="Subject (e.g. Math, Coding)"
                  className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3 shadow-[4px_4px_0_0_#1E293B] outline-none mt-1 font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)]">
                  {isAdhd ? "Estimated Focus Minutes" : "Estimated Minutes (Optional)"}
                </label>
                <input
                  value={editTaskEstimate}
                  onChange={(e) => setEditTaskEstimate(e.target.value)}
                  type="number"
                  min="0"
                  placeholder={isAdhd ? "25" : "25 (Optional)"}
                  className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3 shadow-[4px_4px_0_0_#1E293B] outline-none mt-1 font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-[var(--muted-fg)]">Microtasks / Subtasks (One per line)</label>
                <textarea
                  value={editTaskMicrotasks}
                  onChange={(e) => setEditTaskMicrotasks(e.target.value)}
                  rows={4}
                  placeholder="Define the goal&#10;Break into steps"
                  className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3 shadow-[4px_4px_0_0_#1E293B] outline-none mt-1 text-sm font-medium"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingTaskId(null)}
                  className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold text-sm"
                >
                  Cancel
                </button>
                <button onClick={handleSaveEditTask} className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold text-sm">
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}

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
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none font-bold text-sm"
              />
              <input
                value={newTaskSubject}
                onChange={(event) => setNewTaskSubject(event.target.value)}
                placeholder={copy.subject}
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none font-bold text-sm"
              />
              <input
                value={newTaskEstimate}
                onChange={(event) => setNewTaskEstimate(event.target.value)}
                type="number"
                min="0"
                placeholder={isAdhd ? "Estimated Focus Minutes (Default: 25)" : "Estimated Minutes (Optional)"}
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none font-bold text-sm"
              />

              {isAdhd ? (
                <div className="flex items-center gap-2.5 rounded-[16px] border-2 border-[var(--foreground)] bg-[#F3E8FF] p-3 text-xs font-black text-purple-950 shadow-[2px_2px_0_0_#1E293B]">
                  <input type="checkbox" checked disabled className="h-4 w-4 rounded accent-purple-600 cursor-not-allowed" />
                  <span className="flex-1">Attach to Focus Timer (Auto-completes on Timer Finish — Always ON in ADHD Mode)</span>
                  <Lock size={14} className="text-purple-700 shrink-0" />
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={newTaskAttachFocus}
                    onChange={(e) => setNewTaskAttachFocus(e.target.checked)}
                    className="h-4 w-4 rounded border-2 border-[var(--foreground)] accent-purple-600"
                  />
                  <span>Attach to Focus Timer (Auto-completes on Timer Finish)</span>
                </label>
              )}

              <textarea
                value={newTaskMicrotasks}
                onChange={(event) => setNewTaskMicrotasks(event.target.value)}
                rows={5}
                placeholder={"Microtasks (one per line, e.g.:\nDefine the goal\nBreak into steps\nStart the first step)"}
                className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 shadow-[4px_4px_0_0_#1E293B] outline-none placeholder:text-slate-400 font-medium text-sm"
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
                  name="focusnyx_exit_pin_no_autofill"
                  id="focusnyx_exit_pin_no_autofill"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
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

      {/* Prompt Set Emergency PIN Modal for New Users */}
      {showSetPinModal && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-black text-[var(--foreground)] flex items-center gap-2">
                    <ShieldCheck size={22} className="text-[#8B5CF6]" /> Set Emergency PIN
                  </h3>
                  <button onClick={() => setShowSetPinModal(false)} className="font-black text-gray-400 hover:text-black">✕</button>
                </div>
                <p className="text-xs font-semibold text-[var(--muted-fg)] mb-4 leading-relaxed">
                  Before starting your first Focus Lock session, please set a <strong>6-digit Emergency PIN</strong>. You will need this PIN if you need to disengage focus mode early.
                </p>
                <input
                  type="password"
                  name="focusnyx_new_pin_no_autofill"
                  id="focusnyx_new_pin_no_autofill"
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-lpignore="true"
                  data-form-type="other"
                  maxLength={6}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 849201"
                  className="w-full rounded-[16px] border-2 border-[var(--foreground)] bg-[#F3E8FF] px-4 py-3 text-center text-2xl font-black tracking-widest outline-none mb-3"
                />
                {setPinModalError && <p className="text-xs font-bold text-red-500 mb-3 text-center">{setPinModalError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowSetPinModal(false)} className="secondary-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] py-3 font-bold text-sm">
                    Cancel
                  </button>
                  <button onClick={handleSaveAndStartFocus} className="candy-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] bg-[#8B5CF6] py-3 font-bold text-sm text-white">
                    Set & Start Focus
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
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)] mb-2 flex items-center gap-1.5">
                <Laptop size={13} className="text-slate-600" /> Desktop App Blocks
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {distractionLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-[14px] border-2 border-[var(--foreground)] bg-[#FDF2F8] px-3 py-2 text-xs font-bold">
                    <span className="text-red-700 flex items-center gap-1.5">
                      <Laptop size={13} /> Killed: {log.app || log.url || "Distraction Process"}
                    </span>
                    <span className="text-[var(--muted-fg)]">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Just now"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {browserDistractionLogs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted-fg)] mb-2 flex items-center gap-1.5">
                <Globe size={13} className="text-sky-600" /> Browser Site Blocks
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {browserDistractionLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-[14px] border-2 border-[var(--foreground)] bg-[#E0F2FE] px-3 py-2 text-xs font-bold">
                    <span className="text-sky-700 flex items-center gap-1.5">
                      <Globe size={13} /> Blocked: {log.domain}
                    </span>
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
