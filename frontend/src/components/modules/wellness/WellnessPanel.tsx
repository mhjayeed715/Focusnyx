"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BedDouble,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  FlameKindling,
  Frown,
  HeartPulse,
  Laugh,
  Meh,
  Minus,
  Moon,
  Pill,
  Plus,
  Smile,
  SmilePlus,
  Sun,
  Trash2,
  TrendingUp,
  Wind,
  X,
  Star,
} from "lucide-react";
import {
  getWellnessHydration,
  saveWellnessHydration,
  getWellnessSleepSessions,
  addWellnessSleepSession,
  getWellnessMoodEntries,
  addWellnessMoodEntry,
  getWellnessMedications,
  addWellnessMedication,
  deleteWellnessMedication,
  getMedicationLogs,
  logMedicationTaken,
  getWellnessActivity,
  saveWellnessActivity,
  upsertDailyWellness,
  type SleepSession,
  type MoodEntry,
  type Medication,
} from "@/lib/backend";
import { calculateWellnessScore, getScoreColor } from "@/lib/wellness";
import { WellnessLog } from "./WellnessLog";
import { WellnessSkeleton } from "@/components/ui/PageSkeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

type MoodKey = "awful" | "sad" | "okay" | "good" | "great";

const MOODS: { key: MoodKey; label: string; Icon: typeof Smile; color: string }[] = [
  { key: "awful",  label: "Awful",  Icon: Frown,     color: "#ef4444" },
  { key: "sad",    label: "Sad",    Icon: Meh,       color: "#f97316" },
  { key: "okay",   label: "Okay",   Icon: Smile,     color: "#fbbf24" },
  { key: "good",   label: "Good",   Icon: SmilePlus, color: "#34d399" },
  { key: "great",  label: "Great",  Icon: Laugh,     color: "#8b5cf6" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

function calcBurnoutRisk(opts: {
  sleepHours: number;
  moodKey: MoodKey | null;
  hydrationPct: number;
  stepsPct: number;
}): { score: number; label: string; color: string } {
  let risk = 0;
  // sleep: 8h ideal
  if (opts.sleepHours < 5) risk += 35;
  else if (opts.sleepHours < 6.5) risk += 20;
  else if (opts.sleepHours < 7) risk += 10;

  // mood
  const moodMap: Record<MoodKey, number> = { awful: 30, sad: 20, okay: 10, good: 2, great: 0 };
  if (opts.moodKey) risk += moodMap[opts.moodKey];

  // hydration
  if (opts.hydrationPct < 30) risk += 15;
  else if (opts.hydrationPct < 60) risk += 8;

  // steps
  if (opts.stepsPct < 30) risk += 10;
  else if (opts.stepsPct < 60) risk += 5;

  risk = Math.min(100, Math.max(0, risk));
  if (risk <= 25) return { score: risk, label: "Low — You're doing great!", color: "#34d399" };
  if (risk <= 50) return { score: risk, label: "Moderate — Rest more & hydrate.", color: "#fbbf24" };
  if (risk <= 75) return { score: risk, label: "High — Slow down & recharge.", color: "#f97316" };
  return { score: risk, label: "Critical — Take a break now!", color: "#ef4444" };
}

// ─── Section wrappers ─────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  accent,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: typeof HeartPulse;
  accent: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white shadow-[6px_6px_0_0_#1E293B]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5"
      >
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]"
            style={{ background: accent }}
          >
            <Icon size={18} color="#fff" strokeWidth={2.5} />
          </span>
          <p className="font-display text-lg font-black">{title}</p>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="border-t-2 border-[var(--border)] p-5">{children}</div>}
    </div>
  );
}

// ─── Mood Section ──────────────────────────────────────────────────────────────

function MoodSection({
  entries,
  onAdd,
}: {
  entries: MoodEntry[];
  onAdd: (mood: MoodKey, note: string) => Promise<void>;
}) {
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const todayEntry = entries[0] ?? null;

  const handleSubmit = async () => {
    if (!selectedMood) return;
    setSaving(true);
    try {
      await onAdd(selectedMood, note.trim());
      setSelectedMood(null);
      setNote("");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Daily Mood Check-in" icon={SmilePlus} accent="#8b5cf6">
      {/* Today's mood */}
      {todayEntry ? (
        <div className="mb-4 flex items-center gap-3 rounded-[16px] border-2 border-[var(--border)] bg-[var(--muted)] px-4 py-3">
          {(() => {
            const mood = MOODS.find((m) => m.key === todayEntry.mood);
            const Icon = mood?.Icon ?? Smile;
            return (
              <>
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]"
                  style={{ background: mood?.color ?? "#8b5cf6" }}
                >
                  <Icon size={18} color="#fff" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-black">
                    Today: <span className="capitalize">{todayEntry.mood}</span>
                  </p>
                  {todayEntry.note && (
                    <p className="text-xs text-[var(--muted-fg)]">{todayEntry.note}</p>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      <button
        onClick={() => setShowForm((v) => !v)}
        className="mb-4 flex items-center gap-2 rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-2.5 text-sm font-bold transition hover:translate-y-[-2px]"
      >
        <Plus size={15} strokeWidth={2.5} />
        {todayEntry ? "Log again" : "Log mood"}
      </button>

      {showForm && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {MOODS.map(({ key, label, Icon, color }) => (
              <button
                key={key}
                onClick={() => setSelectedMood(key)}
                title={label}
                className={`flex flex-1 flex-col items-center gap-1 rounded-[14px] border-2 py-2.5 text-xs font-bold transition hover:translate-y-[-1px] ${
                  selectedMood === key
                    ? "border-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]"
                    : "border-[var(--border)]"
                }`}
                style={{ background: selectedMood === key ? color + "20" : "white" }}
              >
                <Icon size={22} style={{ color }} strokeWidth={2.5} />
                {label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (e.g. rough day at uni)..."
            className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void handleSubmit()}
              disabled={!selectedMood || saving}
              className="candy-button flex-1 rounded-[16px] py-3 text-sm font-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Mood"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="secondary-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] py-3 text-sm font-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Hydration Section ─────────────────────────────────────────────────────────

function HydrationSection({
  glasses,
  goal,
  onUpdate,
}: {
  glasses: number;
  goal: number;
  onUpdate: (glasses: number, goal: number) => Promise<void>;
}) {
  const pct = Math.min(100, Math.round((glasses / goal) * 100));
  const [localGoal, setLocalGoal] = useState(goal);
  const [saving, setSaving] = useState(false);

  const bump = async (delta: number) => {
    const next = Math.max(0, glasses + delta);
    setSaving(true);
    try { await onUpdate(next, localGoal); } finally { setSaving(false); }
  };

  const saveGoal = async () => {
    if (localGoal < 1) return;
    setSaving(true);
    try { await onUpdate(glasses, localGoal); } finally { setSaving(false); }
  };

  return (
    <Section title="Water Intake" icon={Droplets} accent="#60a5fa">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-4xl font-black">
            {glasses}
            <span className="ml-1 text-lg font-bold text-[var(--muted-fg)]">/ {goal} glasses</span>
          </p>
          <p className="text-xs font-semibold text-[var(--muted-fg)]">auto-resets daily at midnight</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void bump(-1)}
            disabled={glasses <= 0 || saving}
            className="nav-pill grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-40"
          >
            <Minus size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => void bump(1)}
            disabled={saving}
            className="candy-button grid h-10 w-10 shrink-0 place-items-center rounded-full"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-1 flex items-center justify-between text-xs font-bold">
        <span>{pct}% of daily goal</span>
        {pct >= 100 && <span className="text-[#34d399]">🎉 Goal reached!</span>}
      </div>
      <div className="h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? "#34d399" : pct >= 60 ? "#60a5fa" : "#fbbf24",
          }}
        />
      </div>

      {/* Glass grid */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: goal }).map((_, i) => (
          <button
            key={i}
            onClick={() => void onUpdate(i < glasses ? i : i + 1, localGoal)}
            className={`grid h-9 w-9 place-items-center rounded-[10px] border-2 transition hover:scale-110 ${
              i < glasses
                ? "border-[#60a5fa] bg-[#EFF6FF] text-[#3b82f6]"
                : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)]"
            }`}
            title={`Glass ${i + 1}`}
          >
            <Droplets size={16} strokeWidth={2.5} />
          </button>
        ))}
      </div>

      {/* Goal edit */}
      <div className="mt-4 flex items-center gap-2">
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">
          Daily Goal:
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={localGoal}
          onChange={(e) => setLocalGoal(Math.max(1, Number(e.target.value)))}
          className="w-16 rounded-[10px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-2 py-1 text-sm font-bold outline-none focus:bg-white"
        />
        <span className="text-xs font-semibold text-[var(--muted-fg)]">glasses</span>
        <button
          onClick={() => void saveGoal()}
          disabled={saving}
          className="ml-1 rounded-[10px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-1 text-xs font-black hover:bg-[var(--foreground)] hover:text-white transition"
        >
          Save
        </button>
      </div>
    </Section>
  );
}

// ─── Sleep Section ─────────────────────────────────────────────────────────────

function SleepSection({
  sessions,
  onAdd,
}: {
  sessions: SleepSession[];
  onAdd: (s: { bedtime: string; wakeTime: string; quality: number; durationHours: number }) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState(3);
  const [saving, setSaving] = useState(false);

  const calcDuration = (b: string, w: string) => {
    const [bh, bm] = b.split(":").map(Number);
    const [wh, wm] = w.split(":").map(Number);
    let diff = (wh * 60 + wm) - (bh * 60 + bm);
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  };

  const duration = calcDuration(bedtime, wakeTime);

  const handleAdd = async () => {
    setSaving(true);
    try {
      await onAdd({ bedtime, wakeTime, quality, durationHours: duration });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const qualityLabels = ["", "Poor", "Fair", "Okay", "Good", "Great"];
  const qualityColors = ["", "#ef4444", "#f97316", "#fbbf24", "#34d399", "#8b5cf6"];

  const latestSession = sessions[0];

  return (
    <Section title="Sleep Quality" icon={Moon} accent="#6366f1">
      {latestSession && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: "Duration", value: `${latestSession.durationHours}h` },
            { label: "Quality", value: qualityLabels[latestSession.quality] ?? "—" },
            {
              label: "Bedtime",
              value: latestSession.bedtime
                ? latestSession.bedtime.slice(0, 5)
                : "—",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--muted)] p-3 text-center"
            >
              <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
              <p className="mt-1 font-display text-xl font-black">{value}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowForm((v) => !v)}
        className="mb-4 flex items-center gap-2 rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-2.5 text-sm font-bold transition hover:translate-y-[-2px]"
      >
        <Plus size={15} strokeWidth={2.5} />
        Log Sleep
      </button>

      {showForm && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">
                Bedtime
              </label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">
                Wake Time
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-center">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">Calculated Duration</p>
            <p className="font-display text-2xl font-black">{duration}h</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">
              Quality — {qualityLabels[quality]}
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`flex-1 rounded-[12px] border-2 py-2 text-sm font-black transition hover:scale-105 ${
                    quality === q
                      ? "border-[var(--foreground)] text-white shadow-[2px_2px_0_0_#1E293B]"
                      : "border-[var(--border)] bg-white"
                  }`}
                  style={quality === q ? { background: qualityColors[q] } : {}}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void handleAdd()}
              disabled={saving}
              className="candy-button flex-1 rounded-[16px] py-3 text-sm font-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Sleep"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="secondary-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] py-3 text-sm font-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Activity Section ──────────────────────────────────────────────────────────

function ActivitySection({
  steps,
  goal,
  onUpdate,
}: {
  steps: number;
  goal: number;
  onUpdate: (steps: number, goal: number) => Promise<void>;
}) {
  const [inputSteps, setInputSteps] = useState(String(steps));
  const [inputGoal, setInputGoal] = useState(String(goal));
  const [saving, setSaving] = useState(false);
  const pct = Math.min(100, Math.round((steps / goal) * 100));

  const handleSave = async () => {
    const s = Math.max(0, Number(inputSteps));
    const g = Math.max(1, Number(inputGoal));
    setSaving(true);
    try { await onUpdate(s, g); } finally { setSaving(false); }
  };

  return (
    <Section title="Daily Activity" icon={Activity} accent="#34d399" defaultOpen={false}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-4xl font-black">
            {steps.toLocaleString()}
            <span className="ml-1 text-lg font-bold text-[var(--muted-fg)]">steps</span>
          </p>
          <p className="text-xs font-semibold text-[var(--muted-fg)]">Goal: {goal.toLocaleString()} steps</p>
        </div>
        <span
          className="rounded-full border-2 border-[var(--foreground)] px-3 py-1 text-sm font-black text-white"
          style={{ background: pct >= 100 ? "#34d399" : pct >= 60 ? "#fbbf24" : "#f97316" }}
        >
          {pct}%
        </span>
      </div>

      <div className="mb-4 h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? "#34d399" : pct >= 60 ? "#fbbf24" : "#f97316",
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">
            Today's Steps
          </label>
          <input
            type="number"
            min={0}
            value={inputSteps}
            onChange={(e) => setInputSteps(e.target.value)}
            className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">
            Step Goal
          </label>
          <input
            type="number"
            min={500}
            step={500}
            value={inputGoal}
            onChange={(e) => setInputGoal(e.target.value)}
            className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
          />
        </div>
      </div>
      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="candy-button mt-3 w-full rounded-[16px] py-3 text-sm font-black disabled:opacity-50"
      >
        {saving ? "Saving..." : "Update Activity"}
      </button>
    </Section>
  );
}

// ─── Medications Section ───────────────────────────────────────────────────────

function MedicationsSection({
  medications,
  logs,
  onAdd,
  onDelete,
  onToggleTaken,
}: {
  medications: Medication[];
  logs: Record<string, boolean>;
  onAdd: (m: { name: string; dosage?: string; frequency?: string; timeOfDay?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleTaken: (id: string, taken: boolean) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("morning");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), dosage: dosage.trim() || undefined, timeOfDay });
      setName(""); setDosage(""); setTimeOfDay("morning");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const timeIcons: Record<string, string> = { morning: "🌅", afternoon: "☀️", evening: "🌆", night: "🌙" };

  return (
    <Section title="Medications & Supplements" icon={Pill} accent="#f472b6" defaultOpen={false}>
      {medications.length === 0 && (
        <p className="mb-3 text-sm font-semibold text-[var(--muted-fg)]">
          No medications tracked yet.
        </p>
      )}

      <div className="mb-4 space-y-2">
        {medications.map((med) => {
          const taken = logs[med.id] ?? false;
          return (
            <div
              key={med.id}
              className={`flex items-center gap-3 rounded-[16px] border-2 px-4 py-3 transition ${
                taken ? "border-[#34d399] bg-[#ECFDF5]" : "border-[var(--border)] bg-white"
              }`}
            >
              <span className="text-lg">{timeIcons[med.timeOfDay] ?? "💊"}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-black">{med.name}</p>
                {med.dosage && (
                  <p className="text-xs text-[var(--muted-fg)]">{med.dosage} · {med.timeOfDay}</p>
                )}
              </div>
              <button
                onClick={() => void onToggleTaken(med.id, !taken)}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition ${
                  taken
                    ? "border-[#34d399] bg-[#34d399] text-white"
                    : "border-[var(--border)] bg-[var(--muted)]"
                }`}
              >
                <CheckCircle2 size={15} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => void onDelete(med.id)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={13} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowForm((v) => !v)}
        className="mb-3 flex items-center gap-2 rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-2.5 text-sm font-bold transition hover:translate-y-[-2px]"
      >
        <Plus size={15} strokeWidth={2.5} />
        Add Medication
      </button>

      {showForm && (
        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Medication or supplement name"
            className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
          />
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="Dosage e.g. 500mg (optional)"
            className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
          />
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">Time of Day</p>
            <div className="flex gap-2">
              {["morning", "afternoon", "evening", "night"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeOfDay(t)}
                  className={`flex-1 rounded-[12px] border-2 py-1.5 text-xs font-bold capitalize transition ${
                    timeOfDay === t
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  {timeIcons[t]} {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void handleAdd()}
              disabled={!name.trim() || saving}
              className="candy-button flex-1 rounded-[16px] py-3 text-sm font-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="secondary-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] py-3 text-sm font-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

// ─── Burnout Risk Card ─────────────────────────────────────────────────────────

function BurnoutCard({
  sleepHours,
  moodKey,
  hydrationPct,
  stepsPct,
}: {
  sleepHours: number;
  moodKey: MoodKey | null;
  hydrationPct: number;
  stepsPct: number;
}) {
  const risk = calcBurnoutRisk({ sleepHours, moodKey, hydrationPct, stepsPct });

  return (
    <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]"
          style={{ background: risk.color }}
        >
          <FlameKindling size={18} color="#fff" strokeWidth={2.5} />
        </span>
        <div>
          <p className="font-display text-lg font-black">Burnout Risk</p>
          <p className="text-xs font-semibold" style={{ color: risk.color }}>{risk.label}</p>
        </div>
        <span
          className="ml-auto font-display text-3xl font-black"
          style={{ color: risk.color }}
        >
          {risk.score}%
        </span>
      </div>

      {/* Risk bar */}
      <div className="mb-4 h-5 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${risk.score}%`, background: risk.color }}
        />
      </div>

      {/* Factors */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Sleep", value: sleepHours > 0 ? `${sleepHours}h` : "—", icon: Moon, good: sleepHours >= 7 },
          { label: "Mood", value: moodKey ? moodKey : "—", icon: Smile, good: moodKey === "good" || moodKey === "great" },
          { label: "Hydration", value: `${Math.round(hydrationPct)}%`, icon: Droplets, good: hydrationPct >= 60 },
          { label: "Activity", value: `${Math.round(stepsPct)}%`, icon: Activity, good: stepsPct >= 60 },
        ].map(({ label, value, icon: Icon, good }) => (
          <div
            key={label}
            className={`rounded-[14px] border-2 p-3 text-center ${
              good ? "border-[#34d399] bg-[#ECFDF5]" : "border-[var(--border)] bg-[var(--muted)]"
            }`}
          >
            <Icon size={14} className="mx-auto mb-1" style={{ color: good ? "#34d399" : "#94a3b8" }} />
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
            <p className="mt-0.5 text-sm font-black capitalize">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function WellnessPanel() {
  // ── Hydration ──
  const [hydration, setHydration] = useState({ glasses: 0, goal: 8 });

  // ── Sleep ──
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([]);

  // ── Mood ──
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);

  // ── Medications ──
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medLogs, setMedLogs] = useState<Record<string, boolean>>({});

  // ── Activity ──
  const [activity, setActivity] = useState({ steps: 0, goal: 10000 });

  // ── Loading ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logRefreshKey, setLogRefreshKey] = useState(0);

  // ── Init ──
  useEffect(() => {
    const load = async () => {
      try {
        const [h, s, m, meds, logs, a] = await Promise.all([
          getWellnessHydration(TODAY),
          getWellnessSleepSessions(TODAY),
          getWellnessMoodEntries(TODAY),
          getWellnessMedications(),
          getMedicationLogs(TODAY),
          getWellnessActivity(TODAY),
        ]);
        setHydration(h);
        setSleepSessions(s.sessions);
        setMoodEntries(m.entries);
        setMedications(meds.medications);
        setMedLogs(logs.logs);
        setActivity(a);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wellness data.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // ── Snapshot upsert (called after any metric update) ──
  const syncDailySnapshot = async (overrides: {
    sleepHours?: number;
    moodKey?: string | null;
    hydrationGlasses?: number;
    hydrationGoal?: number;
    steps?: number;
    stepsGoal?: number;
  }) => {
    const currentSleep = overrides.sleepHours ?? sleepSessions[0]?.durationHours ?? 0;
    const currentMood = overrides.moodKey !== undefined ? overrides.moodKey : (moodEntries[0]?.mood ?? null);
    const currentGlasses = overrides.hydrationGlasses ?? hydration.glasses;
    const currentHydGoal = overrides.hydrationGoal ?? hydration.goal;
    const currentSteps = overrides.steps ?? activity.steps;
    const currentStepsGoal = overrides.stepsGoal ?? activity.goal;
    await upsertDailyWellness({
      date: TODAY,
      sleepHours: currentSleep,
      moodKey: currentMood,
      hydrationGlasses: currentGlasses,
      hydrationGoal: currentHydGoal,
      steps: currentSteps,
      stepsGoal: currentStepsGoal,
    });
    setLogRefreshKey((k) => k + 1);
  };

  // ── Handlers ──
  const handleUpdateHydration = async (glasses: number, goal: number) => {
    await saveWellnessHydration(glasses, goal, TODAY);
    setHydration({ glasses, goal });
    await syncDailySnapshot({ hydrationGlasses: glasses, hydrationGoal: goal });
  };

  const handleAddSleep = async (s: {
    bedtime: string;
    wakeTime: string;
    quality: number;
    durationHours: number;
  }) => {
    const { id } = await addWellnessSleepSession({ ...s, date: TODAY });
    const newSession: SleepSession = {
      id,
      logDate: TODAY,
      bedtime: s.bedtime,
      wakeTime: s.wakeTime,
      quality: s.quality,
      durationHours: s.durationHours,
    };
    setSleepSessions((prev) => [newSession, ...prev]);
    await syncDailySnapshot({ sleepHours: s.durationHours });
  };

  const handleAddMood = async (mood: MoodKey, note: string) => {
    const { id } = await addWellnessMoodEntry(mood, note || undefined, TODAY);
    const newEntry: MoodEntry = { id, logDate: TODAY, mood, note: note || null };
    setMoodEntries((prev) => [newEntry, ...prev]);
    await syncDailySnapshot({ moodKey: mood });
  };

  const handleAddMedication = async (m: {
    name: string;
    dosage?: string;
    frequency?: string;
    timeOfDay?: string;
  }) => {
    const { id } = await addWellnessMedication(m);
    const newMed: Medication = {
      id,
      name: m.name,
      dosage: m.dosage ?? null,
      frequency: m.frequency ?? "daily",
      timeOfDay: m.timeOfDay ?? "morning",
      isActive: true,
    };
    setMedications((prev) => [...prev, newMed]);
  };

  const handleDeleteMedication = async (id: string) => {
    await deleteWellnessMedication(id);
    setMedications((prev) => prev.filter((m) => m.id !== id));
  };

  const handleToggleMedTaken = async (id: string, taken: boolean) => {
    await logMedicationTaken(id, taken, TODAY);
    setMedLogs((prev) => ({ ...prev, [id]: taken }));
  };

  const handleUpdateActivity = async (steps: number, goal: number) => {
    await saveWellnessActivity(steps, goal, TODAY);
    setActivity({ steps, goal });
    await syncDailySnapshot({ steps, stepsGoal: goal });
  };

  // ── Derived values for burnout & wellness calc ──
  const latestSleepHours = sleepSessions[0]?.durationHours ?? 0;
  const latestMoodKey = (moodEntries[0]?.mood as MoodKey | undefined) ?? null;
  const hydrationPct = hydration.goal > 0 ? Math.min(100, (hydration.glasses / hydration.goal) * 100) : 0;
  const stepsPct = activity.goal > 0 ? Math.min(100, (activity.steps / activity.goal) * 100) : 0;
  const wellnessScore = calculateWellnessScore({ sleepHours: latestSleepHours, moodKey: latestMoodKey, hydrationPct, stepsPct });
  const wellnessColor = getScoreColor(wellnessScore);

  // ── Render ──
  if (loading) {
    return <WellnessSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-[20px] border-2 border-red-300 bg-red-50 p-6 text-center">
        <p className="font-black text-red-600">Failed to load wellness data</p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
        <p className="mt-2 text-xs text-red-400">
          Make sure the wellness tables are created in Supabase using the SQL migration file.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wellness Score */}
      <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]"
            style={{ background: wellnessColor }}
          >
            <Star size={18} color="#fff" strokeWidth={2.5} />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg font-black">Wellness Score</p>
            <p className="text-xs font-semibold" style={{ color: wellnessColor }}>
              {wellnessScore >= 80 ? "Excellent — Keep it up!" : wellnessScore >= 55 ? "Good — A few areas to improve." : wellnessScore >= 30 ? "Fair — Focus on sleep & hydration." : "Needs Attention — Start with small wins."}
            </p>
          </div>
          <span className="font-display text-3xl font-black" style={{ color: wellnessColor }}>
            {wellnessScore}<span className="text-base font-bold text-[var(--muted-fg)]">/100</span>
          </span>
        </div>
        <div className="mt-4 h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${wellnessScore}%`, background: wellnessColor }}
          />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { label: "Sleep", pts: Math.round(latestSleepHours >= 8 ? 30 : latestSleepHours >= 5 ? ((latestSleepHours - 5) / 3) * 30 : 0), max: 30 },
            { label: "Mood", pts: latestMoodKey ? ({ awful: 0, sad: 5, okay: 12, good: 17, great: 20 }[latestMoodKey] ?? 0) : 0, max: 20 },
            { label: "Hydration", pts: Math.round(hydrationPct / 100 * 25), max: 25 },
            { label: "Steps", pts: Math.round(stepsPct / 100 * 25), max: 25 },
          ].map(({ label, pts, max }) => (
            <div key={label} className="rounded-[12px] border-2 border-[var(--border)] bg-[var(--muted)] py-2">
              <p className="font-black uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
              <p className="mt-0.5 font-display text-base font-black">{Math.round(pts)}<span className="text-[10px] font-semibold text-[var(--muted-fg)]">/{max}</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Burnout Risk */}
      <BurnoutCard
        sleepHours={latestSleepHours}
        moodKey={latestMoodKey}
        hydrationPct={hydrationPct}
        stepsPct={stepsPct}
      />

      {/* Today's summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Sleep",
            value: latestSleepHours > 0 ? `${latestSleepHours}h` : "—",
            icon: BedDouble,
            color: "#6366f1",
          },
          {
            label: "Mood",
            value: latestMoodKey ? latestMoodKey.charAt(0).toUpperCase() + latestMoodKey.slice(1) : "—",
            icon: SmilePlus,
            color: "#8b5cf6",
          },
          {
            label: "Water",
            value: `${hydration.glasses}/${hydration.goal}`,
            icon: Droplets,
            color: "#60a5fa",
          },
          {
            label: "Steps",
            value: activity.steps > 0 ? activity.steps.toLocaleString() : "—",
            icon: Activity,
            color: "#34d399",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]"
          >
            <div
              className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--foreground)]"
              style={{ background: color }}
            >
              <Icon size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
            <p className="mt-1 font-display text-xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {/* Mood */}
      <MoodSection entries={moodEntries} onAdd={handleAddMood} />

      {/* Hydration */}
      <HydrationSection
        glasses={hydration.glasses}
        goal={hydration.goal}
        onUpdate={handleUpdateHydration}
      />

      {/* Sleep */}
      <SleepSection sessions={sleepSessions} onAdd={handleAddSleep} />

      {/* Activity */}
      <ActivitySection
        steps={activity.steps}
        goal={activity.goal}
        onUpdate={handleUpdateActivity}
      />

      {/* Medications */}
      <MedicationsSection
        medications={medications}
        logs={medLogs}
        onAdd={handleAddMedication}
        onDelete={handleDeleteMedication}
        onToggleTaken={handleToggleMedTaken}
      />

      {/* 7-Day Log */}
      <WellnessLog refreshKey={logRefreshKey} />

      {/* Study-rest balance tip */}
      <div className="rounded-[24px] border-2 border-dashed border-[var(--foreground)] bg-[#FFF7D6] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#fbbf24]">
            <Wind size={18} color="#fff" strokeWidth={2.5} />
          </span>
          <div>
            <p className="font-display text-base font-black">Study–Rest Balance Tip</p>
            <p className="mt-1 text-sm text-[var(--muted-fg)]">
              {latestSleepHours < 6
                ? "⚠️ You're running low on sleep. Try the 52-17 rule: 52 min focused study, 17 min rest."
                : latestMoodKey === "awful" || latestMoodKey === "sad"
                ? "💙 Rough day? Give yourself permission to do light reading only. Recovery is productive."
                : hydrationPct < 50
                ? "💧 You're under-hydrated! Drink a glass of water every 30 mins during study sessions."
                : "✅ You're in good shape today! Use deep work blocks of 90 min with 20 min breaks."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
