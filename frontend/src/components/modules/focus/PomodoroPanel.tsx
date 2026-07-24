"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, Image as ImageIcon, LibraryBig, Link2, Lock, Maximize2, Minimize2, Music2, Pause, PenTool, Play, Plus, Radio, RotateCcw, ShieldAlert, Sparkles, Target, TimerReset, Trash2, Volume2, X, Youtube } from "lucide-react";
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

const LOCAL_BLOCKLIST_KEY = "focusnyx_blocked_domains";

function readLocalBlocklist(): DistractionSite[] {
  try {
    const raw = localStorage.getItem(LOCAL_BLOCKLIST_KEY);
    if (!raw) return INITIAL_DISTRACTION_SITES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DISTRACTION_SITES;
  } catch {
    return INITIAL_DISTRACTION_SITES;
  }
}

// FALLBACK_FOCUS_TASKS removed — tasks are always loaded from the database.

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
  const [customMinutesInput, setCustomMinutesInput] = useState("25");
  const [statusMessage, setStatusMessage] = useState("");
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [blockedSites, setBlockedSites] = useState<DistractionSite[]>(INITIAL_DISTRACTION_SITES);
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

  // Custom Blacklist State (Web Apps & Windows Apps)
  const [newSiteInput, setNewSiteInput] = useState("");
  const [blockedApps, setBlockedApps] = useState<string[]>([
    "discord.exe",
    "spotify.exe",
    "steam.exe",
    "telegram.exe",
    "whatsapp.exe",
  ]);
  const [newAppInput, setNewAppInput] = useState("");

  // Live Distraction Log State
  const [distractionLogs, setDistractionLogs] = useState<Array<{ id: string; type: string; app?: string; url?: string; timestamp: string }>>([]);

  // Poll distraction logs from Companion App (with failure backoff)
  useEffect(() => {
    let isSubscribed = true;
    let timerId: NodeJS.Timeout;

    const poll = async () => {
      let nextInterval = 4000;
      try {
        const res = await fetch("http://localhost:5000/distraction-logs");
        if (res.ok) {
          const data = await res.json();
          if (data.logs && Array.isArray(data.logs) && isSubscribed) {
            setDistractionLogs(data.logs);
          }
        } else {
          nextInterval = 15000;
        }
      } catch {
        nextInterval = 15000;
      }
      if (isSubscribed) {
        timerId = setTimeout(poll, nextInterval);
      }
    };

    poll();
    return () => {
      isSubscribed = false;
      clearTimeout(timerId);
    };
  }, []);

  const [isBlocklistLoaded, setIsBlocklistLoaded] = useState(false);

  useEffect(() => {
    setBlockedSites(readLocalBlocklist());
    setIsBlocklistLoaded(true);
  }, []);

  useEffect(() => {
    if (!isBlocklistLoaded) return;
    try {
      localStorage.setItem(LOCAL_BLOCKLIST_KEY, JSON.stringify(blockedSites));
    } catch {}
    syncBlocklistToAll(blockedSites, blockedApps);
  }, [blockedSites, blockedApps, isBlocklistLoaded]);


  const syncBlocklistToAll = (sites: typeof blockedSites, apps: string[]) => {
    const enabledDomains = sites.filter((s) => s.enabled).map((s) => s.site);
    
    // 1. Extension sync
    window.postMessage(
      {
        type: "FOCUSNYX_WEB_APP_ACTION",
        action: "updateBlocklist",
        blocklist: enabledDomains,
      },
      "*"
    );

    // 2. Companion App sync
    try {
      fetch("http://localhost:5000/update-blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blacklist: apps }),
      }).catch(() => {});
    } catch {}
  };

  const handleAddCustomSite = () => {
    if (!newSiteInput.trim()) return;
    const site = newSiteInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!blockedSites.find((s) => s.site === site)) {
      const nextSites = [...blockedSites, { site, enabled: true, blocked: 0 }];
      setBlockedSites(nextSites);
      syncBlocklistToAll(nextSites, blockedApps);
    }
    setNewSiteInput("");
  };

  const handleRemoveSite = (site: string) => {
    const nextSites = blockedSites.filter((s) => s.site !== site);
    setBlockedSites(nextSites);
    syncBlocklistToAll(nextSites, blockedApps);
  };

  const handleAddCustomApp = () => {
    if (!newAppInput.trim()) return;
    let appName = newAppInput.trim().toLowerCase();
    if (!appName.endsWith(".exe")) appName += ".exe";
    if (blockedApps.includes(appName)) return;
    const nextApps = [...blockedApps, appName];
    setBlockedApps(nextApps);
    setNewAppInput("");
    syncBlocklistToAll(blockedSites, nextApps);
  };

  const handleRemoveApp = (appName: string) => {
    const nextApps = blockedApps.filter((a) => a !== appName);
    setBlockedApps(nextApps);
    syncBlocklistToAll(blockedSites, nextApps);
  };

  const handleVerifyEmergencyPin = () => {
    const storedPin = (() => {
      try { return localStorage.getItem("focusnyxEmergencyPinV1") || "123456"; }
      catch { return "123456"; }
    })();

    if (emergencyPinInput.trim() === storedPin) {
      pause();
      setIsLocked(false);
      notifyExtension("endFocus", durationMinutes, storedPin);
      setShowPinModal(false);
      setEmergencyPinInput("");
      setPinError("");
      setStatusMessage("Focus lock unlocked via Emergency PIN.");
    } else {
      setPinError("Incorrect Emergency PIN. Focus Lock remains active.");
    }
  };
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const dashboard = await getDashboardBootstrap();
        if (dashboard && dashboard.tasks && dashboard.tasks.length > 0) {
          const normalizedTasks: FocusTask[] = dashboard.tasks.map((task: any) => ({
            id: String(task.id),
            title: String(task.title ?? "Untitled task"),
            subject: String(task.subject ?? "Focus"),
            minutes: Number(task.estimate ?? 25),
            xp: Number(task.xp ?? 40),
            status: task.completed ? "done" : "ready",
            subtasks: Array.isArray(task.subtasks)
              ? task.subtasks.map((sub: any, index: number) => ({
                  id: `sub-${task.id}-${index}`,
                  title: String(sub.title || sub),
                  completed: Boolean(sub.completed),
                }))
              : [],
          }));
          setTasks(normalizedTasks);
          setActiveTaskId(normalizedTasks[0]?.id ?? "");
        } else {
          // No tasks returned; clear state
          setTasks([]);
          setActiveTaskId("");
        }
      } catch {
        // fallback: clear tasks
        setTasks([]);
        setActiveTaskId("");
      }
    };
    void fetchTasks();

    try {
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

  const updateTasks = (updater: (current: FocusTask[]) => FocusTask[]) => {
    setTasks((current) => {
      const next = updater(current);
      return next;
    });
  };

  const { minutes, seconds, isRunning, isLocked, setIsLocked, activeTaskId, setActiveTaskId, start, pause, reset, setDuration, syncState } = usePomodoro(durationMinutes, async () => {
    const fallbackXp = Math.max(25, durationMinutes * 4);
    
    // Compute activeTask inside the callback or rely on the latest state
    const currentActiveTask = tasks.find((task) => task.id === activeTaskId) ?? tasks[0] ?? null;

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

      if (currentActiveTask && currentActiveTask.status !== "done") {
        updateTasks((current) => current.map((entry) => (entry.id === currentActiveTask.id ? { ...entry, status: "done" } : entry)));
        if (!currentActiveTask.id.startsWith("focus-local-")) {
          updateTask(currentActiveTask.id, { completed: true }).catch(() => {});
        }
      }

      setStatusMessage(currentActiveTask ? `${copy.sessionComplete}. +${earnedXp} XP for ${currentActiveTask.title}` : `${copy.sessionComplete}. +${earnedXp} XP`);
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

  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? tasks[0] ?? null;

  useEffect(() => {
    setDuration(durationMinutes);
  }, [durationMinutes, setDuration]);

  // Prevent closing the web app if locked
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isLocked) {
        e.preventDefault();
        e.returnValue = "Focus Lock is active. Are you sure you want to exit?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isLocked]);



  // ── Extension & Companion App Bidirectional Synchronization ──
  const notifyExtension = (action: "startFocus" | "endFocus" | "getStatus", durationMins?: number, customPin?: string, remainingSecs?: number) => {
    const enabledDomains = blockedSites.filter((s) => s.enabled).map((s) => s.site);
    
    const storedPin = (() => {
      try { return localStorage.getItem("focusnyxEmergencyPinV1") || "123456"; }
      catch { return "123456"; }
    })();
    const pinToUse = customPin || storedPin;
    const durationMs = (durationMins || durationMinutes) * 60 * 1000;

    const payload = {
      type: "FOCUSNYX_WEB_APP_ACTION",
      action,
      durationMinutes: durationMins || durationMinutes,
      duration: durationMs,
      blocklist: enabledDomains,
      pin: pinToUse,
      timestamp: Date.now(),
      // Send remaining time so extension popup can show live countdown
      remainingSeconds: remainingSecs,
      focusStartTime: action === "startFocus" ? Date.now() : undefined,
      focusDuration: durationMs,
    };

    // 1. PostMessage to window DOM for Extension content script
    window.postMessage(payload, "*");

    // 2. BroadcastChannel for cross-tab sync
    try {
      const syncChannel = new BroadcastChannel("FOCUSNYX_SYNC_CHANNEL");
      syncChannel.postMessage(payload);
      syncChannel.close();
    } catch {}

    // 3. LocalStorage persistence
    try {
      localStorage.setItem("focusnyx_app_focus_state", JSON.stringify(payload));
    } catch {}

    // 4. Direct HTTP API sync to Companion App
    if (action === "startFocus") {
      fetch("http://localhost:5000/start-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: durationMins || durationMinutes, pin: pinToUse }),
      }).catch(() => {});
    } else if (action === "endFocus") {
      fetch("http://localhost:5000/end-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinToUse }),
      }).catch(() => {});
    }
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

    // Polling Companion App & Extension status to maintain 3-way lockstep sync (with failure backoff)
    let isSubscribed = true;
    let timerId: NodeJS.Timeout;

    const checkCompanionStatus = async () => {
      notifyExtension("getStatus");
      let nextInterval = 4000;
      try {
        const res = await fetch("http://localhost:5000/status");
        if (res.ok) {
          const data = await res.json();
          if (data.is_active && isSubscribed) {
            setIsLocked(true);
            if (typeof data.remaining_seconds === "number" && data.remaining_seconds > 0) {
              syncState(data.remaining_seconds, true);
            }
          }
        } else {
          nextInterval = 15000;
        }
      } catch {
        nextInterval = 15000;
      }
      if (isSubscribed) {
        timerId = setTimeout(checkCompanionStatus, nextInterval);
      }
    };

    checkCompanionStatus();

    return () => {
      isSubscribed = false;
      window.removeEventListener("message", handleMessage);
      syncChannel?.close();
      clearTimeout(timerId);
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
    setCustomMinutesInput(String(task.minutes));
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

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || task.status === "done") {
      return;
    }

    // Optimistic update
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

    // Always persist to DB (skip only truly local optimistic tasks not yet saved)
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

    setStatusMessage(`${task.title} ${copy.done.toLowerCase()}. +${task.xp} XP`);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      return;
    }

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
    setDurationMinutes(estimatedMinutes);
    setCustomMinutesInput(String(estimatedMinutes));
    reset(estimatedMinutes);
    setShowAddTask(false);
    setNewTaskTitle("");
    setNewTaskSubject("Focus");
    setNewTaskEstimate("25");
    setNewTaskMicrotasks("Define the goal\nBreak into steps\nStart the first step");

    const toastId = toast.loading("Saving task...");
    try {
      const response = await createTask({
        title: optimisticTask.title,
        subject: optimisticTask.subject,
        estimate: optimisticTask.minutes,
        subtasks: optimisticTask.subtasks.map((subtask) => subtask.title),
      });
      const realTask = response.task as { id: string } | undefined;
      if (realTask?.id) {
        // Replace optimistic ID with real DB ID
        updateTasks((current) => current.map((t) => (t.id === optimisticId ? { ...t, id: realTask.id } : t)));
        if (activeTaskId === optimisticId) {
          setActiveTaskId(realTask.id);
        }
      }
      toast.success(`Task "${optimisticTask.title}" saved!`, { id: toastId });
      setStatusMessage(`${copy.created} ${optimisticTask.title}.`);
    } catch {
      toast.error("Could not save task to server. Will retry when online.", { id: toastId });
      setStatusMessage(copy.localSync);
    }
  };

  const toggleSite = (site: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBlockedSites((current) => {
      const next = current.map((entry) => (entry.site === site ? { ...entry, enabled: !entry.enabled } : entry));
      syncBlocklistToAll(next, blockedApps);
      return next;
    });
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
    // Persist subtask state to DB
    if (!taskId.startsWith("focus-local-")) {
      updateTask(taskId, { subtasks: updatedSubtasks }).catch(() => {});
    }
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
                      setCustomMinutesInput(String(preset));
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
                    value={customMinutesInput}
                    onChange={(event) => {
                      const val = event.target.value;
                      setCustomMinutesInput(val);
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 1 && num <= 180) {
                        setDurationMinutes(num);
                      }
                    }}
                    onBlur={() => {
                      const num = parseInt(customMinutesInput, 10);
                      const nextDuration = !isNaN(num) && num >= 1 ? Math.max(1, Math.min(180, num)) : 25;
                      setCustomMinutesInput(String(nextDuration));
                      setDurationMinutes(nextDuration);
                      reset(nextDuration);
                    }}
                    type="number"
                    min="1"
                    max="180"
                    placeholder="25"
                    className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 text-base shadow-[4px_4px_0_0_#1E293B] outline-none"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button onClick={handleStartFocus} disabled={isRunning} className="candy-button flex h-12 items-center gap-2 px-5 text-sm disabled:opacity-60">
                    <Play size={16} /> {copy.start}
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
                    className="secondary-button flex h-12 items-center gap-2 px-5 text-sm disabled:opacity-60"
                  >
                    <Pause size={16} /> {copy.pause}
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
                    className="secondary-button flex h-12 items-center gap-2 px-5 text-sm"
                  >
                    <RotateCcw size={16} /> {copy.reset}
                  </button>
                  {isLocked && (
                    <button
                      onClick={() => {
                        setPinError("");
                        setEmergencyPinInput("");
                        setShowPinModal(true);
                      }}
                      className="candy-button flex h-12 items-center gap-2 rounded-full border-2 border-red-500 bg-red-600 px-5 text-sm font-black text-white hover:bg-red-500"
                    >
                      <Lock size={16} /> Emergency Exit
                    </button>
                  )}
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

              if (editingTaskId === task.id) {
                return (
                  <div key={task.id} className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                    <input
                      className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm font-bold outline-none"
                      value={editTaskTitle}
                      onChange={(e) => setEditTaskTitle(e.target.value)}
                      placeholder="Task Title"
                    />
                    <div className="mt-2 flex gap-2">
                      <input
                        className="w-1/2 rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
                        value={editTaskSubject}
                        onChange={(e) => setEditTaskSubject(e.target.value)}
                        placeholder="Subject"
                      />
                      <input
                        type="number"
                        className="w-1/2 rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
                        value={editTaskEstimate}
                        onChange={(e) => setEditTaskEstimate(e.target.value)}
                        placeholder="Minutes"
                      />
                    </div>
                    <textarea
                      className="mt-2 w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
                      rows={3}
                      value={editTaskMicrotasks}
                      onChange={(e) => setEditTaskMicrotasks(e.target.value)}
                      placeholder="Microtasks (one per line)"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setEditingTaskId(null)}
                        className="rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-1.5 text-xs font-black"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const updatedTask: FocusTask = {
                            ...task,
                            title: editTaskTitle,
                            subject: editTaskSubject,
                            minutes: Number(editTaskEstimate),
                            subtasks: editTaskMicrotasks
                              .split("\n")
                              .filter(Boolean)
                              .map((title, index) => ({
                                id: task.subtasks[index]?.id ?? `sub-${Date.now()}-${index}`,
                                title,
                                completed: task.subtasks[index]?.completed ?? false,
                              })),
                          };
                          setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
                          setEditingTaskId(null);
                          if (!task.id.startsWith("focus-local-")) {
                            const saveToast = toast.loading("Saving changes...");
                            updateTask(task.id, {
                              title: updatedTask.title,
                              subject: updatedTask.subject,
                              estimate: updatedTask.minutes,
                              subtasks: updatedTask.subtasks,
                            }).then(() => {
                              toast.success("Task updated!", { id: saveToast });
                            }).catch(() => {
                              toast.error("Could not save changes.", { id: saveToast });
                            });
                          } else {
                            toast.success("Task updated!");
                          }
                        }}
                        className="rounded-full border-2 border-[var(--foreground)] bg-[#34D399] px-4 py-1.5 text-xs font-black shadow-[3px_3px_0_0_#1E293B]"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingTaskId(task.id);
                            setEditTaskTitle(task.title);
                            setEditTaskSubject(task.subject);
                            setEditTaskEstimate(String(task.minutes));
                            setEditTaskMicrotasks(task.subtasks.map((s) => s.title).join("\n"));
                          }}
                          className="rounded-full border-2 border-[var(--foreground)] bg-white px-3 py-1.5 text-[10px] font-black shadow-[3px_3px_0_0_#1E293B] hover:bg-[var(--muted)]"
                        >
                          <PenTool size={14} />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setTaskToDeleteId(task.id);
                          }}
                          className="rounded-full border-2 border-[var(--foreground)] bg-white px-3 py-1.5 text-[10px] font-black shadow-[3px_3px_0_0_#1E293B] text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
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
              <h3 className="mt-2 font-display text-2xl font-black">Blocked websites & apps</h3>
            </div>
            <ShieldAlert size={20} className="text-[#F472B6]" />
          </div>

          {/* Web Domains Section */}
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-fg)]">Website Domain Whitelist</p>
            <div className="mt-2 flex gap-2">
              <input
                value={newSiteInput}
                onChange={(e) => setNewSiteInput(e.target.value)}
                placeholder="e.g. twitter.com"
                className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
              />
              <button onClick={handleAddCustomSite} className="candy-button shrink-0 rounded-[14px] border-2 border-[var(--foreground)] px-4 py-2 text-xs font-bold">
                Add Domain
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
              {blockedSites.map((item) => (
                <div
                  key={item.site}
                  className="flex w-full items-center justify-between rounded-[14px] border-2 border-[var(--foreground)] bg-[#FFF7D6] px-3 py-2 text-sm shadow-[3px_3px_0_0_#1E293B]"
                >
                  <div className="flex-1">
                    <span className="font-bold">{item.site}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--foreground)] bg-[#34D399] px-2 py-0.5 text-[10px] font-black text-black">
                      ✓ ALLOWED
                    </span>
                    <button type="button" onClick={() => handleRemoveSite(item.site)} className="text-red-500 hover:text-red-700 p-1" title="Remove from Whitelist (Block)">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Windows Apps Section */}
          <div className="mt-6 border-t-2 border-[var(--foreground)] pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-fg)]">Windows Executables (.exe)</p>
            <div className="mt-2 flex gap-2">
              <input
                value={newAppInput}
                onChange={(e) => setNewAppInput(e.target.value)}
                placeholder="e.g. discord.exe"
                className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
              />
              <button onClick={handleAddCustomApp} className="candy-button shrink-0 rounded-[14px] border-2 border-[var(--foreground)] px-4 py-2 text-xs font-bold">
                Add App
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {blockedApps.map((app) => (
                <span key={app} className="flex items-center gap-1 rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_0_#1E293B]">
                  {app}
                  <button onClick={() => handleRemoveApp(app)} className="ml-1 font-black text-red-500 hover:text-red-700">×</button>
                </span>
              ))}
            </div>
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
                  placeholder="••••"
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
      {distractionLogs.length > 0 && (
        <div className="mt-6 rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-black text-red-500 flex items-center gap-2">
              <ShieldAlert size={20} /> Live Distraction Log ({distractionLogs.length} Blocked)
            </h3>
            <span className="hard-chip px-3 py-1 text-xs font-black bg-red-100 text-red-700">Protected</span>
          </div>
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-1">
            {distractionLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-[14px] border-2 border-[var(--foreground)] bg-[#FDF2F8] px-3 py-2 text-xs font-bold">
                <span className="text-red-700">Killed {log.app || log.url || "Distraction Process"}</span>
                <span className="text-[var(--muted-fg)]">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Just now"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ── Custom Task Delete Confirmation Modal ── */}
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
