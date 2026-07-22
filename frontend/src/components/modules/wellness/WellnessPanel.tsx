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
  Star,
  Trash2,
  Wind,
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
import { useLanguage } from "@/components/layout/language-context";
import { translations } from "@/lib/translations";

type T = typeof translations.en | typeof translations.bn;
type MoodKey = "awful" | "sad" | "okay" | "good" | "great";

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Computed per-render in WellnessPanel to avoid stale date after midnight

function calcBurnoutRisk(opts: {
  sleepHours: number;
  moodKey: MoodKey | null;
  hydrationPct: number;
  stepsPct: number;
}): { score: number; color: string } {
  let risk = 0;
  if (opts.sleepHours < 5) risk += 35;
  else if (opts.sleepHours < 6.5) risk += 20;
  else if (opts.sleepHours < 7) risk += 10;
  const moodMap: Record<MoodKey, number> = { awful: 30, sad: 20, okay: 10, good: 2, great: 0 };
  if (opts.moodKey) risk += moodMap[opts.moodKey];
  if (opts.hydrationPct < 30) risk += 15;
  else if (opts.hydrationPct < 60) risk += 8;
  if (opts.stepsPct < 30) risk += 10;
  else if (opts.stepsPct < 60) risk += 5;
  risk = Math.min(100, Math.max(0, risk));
  if (risk <= 25) return { score: risk, color: "#34d399" };
  if (risk <= 50) return { score: risk, color: "#fbbf24" };
  if (risk <= 75) return { score: risk, color: "#f97316" };
  return { score: risk, color: "#ef4444" };
}

function Section({ title, icon: Icon, accent, children, defaultOpen = true }: {
  title: string; icon: typeof HeartPulse; accent: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white shadow-[6px_6px_0_0_#1E293B]">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]" style={{ background: accent }}>
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

function MoodSection({ entries, onAdd, t }: {
  entries: MoodEntry[];
  onAdd: (mood: MoodKey, note: string) => Promise<void>;
  t: T;
}) {
  const MOODS = [
    { key: "awful" as MoodKey, label: t.awful,   Icon: Frown,     color: "#ef4444" },
    { key: "sad"   as MoodKey, label: t.sad,     Icon: Meh,       color: "#f97316" },
    { key: "okay"  as MoodKey, label: t.okay,    Icon: Smile,     color: "#fbbf24" },
    { key: "good"  as MoodKey, label: t.goodMood,Icon: SmilePlus, color: "#34d399" },
    { key: "great" as MoodKey, label: t.great,   Icon: Laugh,     color: "#8b5cf6" },
  ];
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const todayEntry = entries[0] ?? null;

  const handleSubmit = async () => {
    if (!selectedMood) return;
    setSaving(true);
    try { await onAdd(selectedMood, note.trim()); setSelectedMood(null); setNote(""); setShowForm(false); }
    finally { setSaving(false); }
  };

  return (
    <Section title={t.dailyMoodCheckin} icon={SmilePlus} accent="#8b5cf6">
      {todayEntry ? (
        <div className="mb-4 flex items-center gap-3 rounded-[16px] border-2 border-[var(--border)] bg-[var(--muted)] px-4 py-3">
          {(() => {
            const mood = MOODS.find((m) => m.key === todayEntry.mood);
            const Icon = mood?.Icon ?? Smile;
            return (
              <>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]" style={{ background: mood?.color ?? "#8b5cf6" }}>
                  <Icon size={18} color="#fff" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-black">{t.today_label} <span className="capitalize">{todayEntry.mood}</span></p>
                  {todayEntry.note && <p className="text-xs text-[var(--muted-fg)]">{todayEntry.note}</p>}
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
      <button onClick={() => setShowForm((v) => !v)} className="mb-4 flex items-center gap-2 rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-2.5 text-sm font-bold transition hover:translate-y-[-2px]">
        <Plus size={15} strokeWidth={2.5} />
        {todayEntry ? t.logAgain : t.logMood}
      </button>
      {showForm && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {MOODS.map(({ key, label, Icon, color }) => (
              <button key={key} onClick={() => setSelectedMood(key)} title={label}
                className={`flex flex-1 flex-col items-center gap-1 rounded-[14px] border-2 py-2.5 text-xs font-bold transition hover:translate-y-[-1px] ${selectedMood === key ? "border-[var(--foreground)] shadow-[3px_3px_0_0_#1E293B]" : "border-[var(--border)]"}`}
                style={{ background: selectedMood === key ? color + "20" : "white" }}>
                <Icon size={22} style={{ color }} strokeWidth={2.5} />{label}
              </button>
            ))}
          </div>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.optionalNote}
            className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white" />
          <div className="flex gap-2">
            <button onClick={() => void handleSubmit()} disabled={!selectedMood || saving} className="candy-button flex-1 rounded-[16px] py-3 text-sm font-black disabled:opacity-50">
              {saving ? t.saving : t.saveMood}
            </button>
            <button onClick={() => setShowForm(false)} className="secondary-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] py-3 text-sm font-black">{t.cancel}</button>
          </div>
        </div>
      )}
    </Section>
  );
}

function HydrationSection({ glasses, goal, onUpdate, t }: {
  glasses: number; goal: number; onUpdate: (glasses: number, goal: number) => Promise<void>; t: T;
}) {
  const pct = Math.min(100, Math.round((glasses / goal) * 100));
  const [localGoal, setLocalGoal] = useState(goal);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setLocalGoal(goal); }, [goal]);

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
    <Section title={t.waterIntake} icon={Droplets} accent="#60a5fa">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-4xl font-black">{glasses}<span className="ml-1 text-lg font-bold text-[var(--muted-fg)]">/ {goal} {t.glasses}</span></p>
          <p className="text-xs font-semibold text-[var(--muted-fg)]">{t.autoResets}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void bump(-1)} disabled={glasses <= 0 || saving} className="nav-pill grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-40"><Minus size={16} strokeWidth={2.5} /></button>
          <button onClick={() => void bump(1)} disabled={saving} className="candy-button grid h-10 w-10 shrink-0 place-items-center rounded-full"><Plus size={16} strokeWidth={2.5} /></button>
        </div>
      </div>
      <div className="mb-1 flex items-center justify-between text-xs font-bold">
        <span>{t.ofDailyGoal(pct)}</span>
        {pct >= 100 && <span className="text-[#34d399]">{t.goalReached}</span>}
      </div>
      <div className="h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 100 ? "#34d399" : pct >= 60 ? "#60a5fa" : "#fbbf24" }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: goal }).map((_, i) => (
          <button key={i} onClick={() => void onUpdate(i < glasses ? i : i + 1, localGoal)}
            className={`grid h-9 w-9 place-items-center rounded-[10px] border-2 transition hover:scale-110 ${i < glasses ? "border-[#60a5fa] bg-[#EFF6FF] text-[#3b82f6]" : "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)]"}`}
            title={`Glass ${i + 1}`}><Droplets size={16} strokeWidth={2.5} /></button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.dailyGoal}</label>
        <input type="number" min={1} max={20} value={localGoal} onChange={(e) => setLocalGoal(Math.max(1, Number(e.target.value)))}
          className="w-16 rounded-[10px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-2 py-1 text-sm font-bold outline-none focus:bg-white" />
        <span className="text-xs font-semibold text-[var(--muted-fg)]">{t.glasses}</span>
        <button onClick={() => void saveGoal()} disabled={saving} className="ml-1 rounded-[10px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-1 text-xs font-black hover:bg-[var(--foreground)] hover:text-white transition">{t.save}</button>
      </div>
    </Section>
  );
}

function SleepSection({ sessions, onAdd, t }: {
  sessions: SleepSession[];
  onAdd: (s: { bedtime: string; wakeTime: string; quality: number; durationHours: number }) => Promise<void>;
  t: T;
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
    try { await onAdd({ bedtime, wakeTime, quality, durationHours: duration }); setShowForm(false); }
    finally { setSaving(false); }
  };

  const qualityLabels = ["", "Poor", "Fair", t.okay, t.goodMood, t.great];
  const qualityColors = ["", "#ef4444", "#f97316", "#fbbf24", "#34d399", "#8b5cf6"];
  const latestSession = sessions[0];

  return (
    <Section title={t.sleepQuality} icon={Moon} accent="#6366f1">
      {latestSession && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: t.duration, value: `${latestSession.durationHours}h` },
            { label: t.quality, value: qualityLabels[latestSession.quality] ?? "—" },
            { label: t.bedtime, value: latestSession.bedtime ? latestSession.bedtime.slice(0, 5) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--muted)] p-3 text-center">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
              <p className="mt-1 font-display text-xl font-black">{value}</p>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setShowForm((v) => !v)} className="mb-4 flex items-center gap-2 rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-2.5 text-sm font-bold transition hover:translate-y-[-2px]">
        <Plus size={15} strokeWidth={2.5} />{t.logSleep}
      </button>
      {showForm && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.bedtime}</label>
              <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.wakeTime}</label>
              <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white" />
            </div>
          </div>
          <div className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--muted)] px-4 py-2 text-center">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.calculatedDuration}</p>
            <p className="font-display text-2xl font-black">{duration}h</p>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.quality} — {qualityLabels[quality]}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((q) => (
                <button key={q} onClick={() => setQuality(q)}
                  className={`flex-1 rounded-[12px] border-2 py-2 text-sm font-black transition hover:scale-105 ${quality === q ? "border-[var(--foreground)] text-white shadow-[2px_2px_0_0_#1E293B]" : "border-[var(--border)] bg-white"}`}
                  style={quality === q ? { background: qualityColors[q] } : {}}>{q}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void handleAdd()} disabled={saving} className="candy-button flex-1 rounded-[16px] py-3 text-sm font-black disabled:opacity-50">{saving ? t.saving : t.saveSleep}</button>
            <button onClick={() => setShowForm(false)} className="secondary-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] py-3 text-sm font-black">{t.cancel}</button>
          </div>
        </div>
      )}
    </Section>
  );
}

function ActivitySection({ steps, goal, onUpdate, t }: {
  steps: number; goal: number; onUpdate: (steps: number, goal: number) => Promise<void>; t: T;
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
    <Section title={t.dailyActivity} icon={Activity} accent="#34d399" defaultOpen={false}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-4xl font-black">{steps.toLocaleString()}<span className="ml-1 text-lg font-bold text-[var(--muted-fg)]">{t.steps.toLowerCase()}</span></p>
          <p className="text-xs font-semibold text-[var(--muted-fg)]">{t.stepGoal}: {goal.toLocaleString()}</p>
        </div>
        <span className="rounded-full border-2 border-[var(--foreground)] px-3 py-1 text-sm font-black text-white" style={{ background: pct >= 100 ? "#34d399" : pct >= 60 ? "#fbbf24" : "#f97316" }}>{pct}%</span>
      </div>
      <div className="mb-4 h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 100 ? "#34d399" : pct >= 60 ? "#fbbf24" : "#f97316" }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.todaysSteps}</label>
          <input type="number" min={0} value={inputSteps} onChange={(e) => setInputSteps(e.target.value)} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.stepGoal}</label>
          <input type="number" min={500} step={500} value={inputGoal} onChange={(e) => setInputGoal(e.target.value)} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white" />
        </div>
      </div>
      <button onClick={() => void handleSave()} disabled={saving} className="candy-button mt-3 w-full rounded-[16px] py-3 text-sm font-black disabled:opacity-50">{saving ? t.saving : t.updateActivity}</button>
    </Section>
  );
}

function MedicationsSection({ medications, logs, onAdd, onDelete, onToggleTaken, t }: {
  medications: Medication[];
  logs: Record<string, boolean>;
  onAdd: (m: { name: string; dosage?: string; frequency?: string; timeOfDay?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleTaken: (id: string, taken: boolean) => Promise<void>;
  t: T;
}) {
  const ALL_TIMES = ["morning", "noon", "evening", "night"] as const;
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["morning"]);
  const [saving, setSaving] = useState(false);

  const toggleTime = (tod: string) => setSelectedTimes(prev =>
    prev.includes(tod) ? (prev.length > 1 ? prev.filter(t => t !== tod) : prev) : [...prev, tod]
  );

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Create one entry per selected time
      for (const tod of selectedTimes) {
        await onAdd({ name: name.trim(), dosage: dosage.trim() || undefined, timeOfDay: tod });
      }
      setName(""); setDosage(""); setSelectedTimes(["morning"]); setShowForm(false);
    } finally { setSaving(false); }
  };

  const timeIcons: Record<string, string> = { morning: "🌅", noon: "☀️", evening: "🌆", night: "🌙" };
  const timeLabels: Record<string, string> = { morning: t.morning, noon: t.noon, evening: t.evening, night: t.night };

  return (
    <Section title={t.medicationsSupplements} icon={Pill} accent="#f472b6" defaultOpen={false}>
      {medications.length === 0 && <p className="mb-3 text-sm font-semibold text-[var(--muted-fg)]">{t.noMedsYet}</p>}
      <div className="mb-4 space-y-2">
        {medications.map((med) => {
          const taken = logs[med.id] ?? false;
          return (
            <div key={med.id} className={`flex items-center gap-3 rounded-[16px] border-2 px-4 py-3 transition ${taken ? "border-[#34d399] bg-[#ECFDF5]" : "border-[var(--border)] bg-white"}`}>
              <span className="text-lg">{timeIcons[med.timeOfDay] ?? "💊"}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-black">{med.name}</p>
                {med.dosage && <p className="text-xs text-[var(--muted-fg)]">{med.dosage} · {timeLabels[med.timeOfDay] ?? med.timeOfDay}</p>}
                {!med.dosage && <p className="text-xs text-[var(--muted-fg)]">{timeLabels[med.timeOfDay] ?? med.timeOfDay}</p>}
              </div>
              <button onClick={() => void onToggleTaken(med.id, !taken)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition ${taken ? "border-[#34d399] bg-[#34d399] text-white" : "border-[var(--border)] bg-[var(--muted)]"}`}>
                <CheckCircle2 size={15} strokeWidth={2.5} />
              </button>
              <button onClick={() => void onDelete(med.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-500">
                <Trash2 size={13} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>
      <button onClick={() => setShowForm((v) => !v)} className="mb-3 flex items-center gap-2 rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-2.5 text-sm font-bold transition hover:translate-y-[-2px]">
        <Plus size={15} strokeWidth={2.5} />{t.addMedication}
      </button>
      {showForm && (
        <div className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.medicationName} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white" />
          <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder={t.dosage} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white" />
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.timeOfDay} <span className="normal-case font-semibold text-[var(--muted-fg)]">(select all that apply)</span></p>
            <div className="flex gap-2">
              {ALL_TIMES.map((tod) => (
                <button key={tod} onClick={() => toggleTime(tod)}
                  className={`flex-1 rounded-[12px] border-2 py-1.5 text-xs font-bold capitalize transition ${selectedTimes.includes(tod) ? "border-[var(--foreground)] bg-[var(--foreground)] text-white" : "border-[var(--border)] bg-white"}`}>
                  {timeIcons[tod]} {timeLabels[tod]}
                </button>
              ))}
            </div>
            {selectedTimes.length > 1 && (
              <p className="mt-1 text-xs text-[var(--muted-fg)] font-semibold">{selectedTimes.length}x daily: {selectedTimes.map(tod => timeLabels[tod]).join(", ")}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => void handleAdd()} disabled={!name.trim() || saving} className="candy-button flex-1 rounded-[16px] py-3 text-sm font-black disabled:opacity-50">{saving ? t.saving : t.add}</button>
            <button onClick={() => setShowForm(false)} className="secondary-button flex-1 rounded-[16px] border-2 border-[var(--foreground)] py-3 text-sm font-black">{t.cancel}</button>
          </div>
        </div>
      )}
    </Section>
  );
}

function BurnoutCard({ sleepHours, moodKey, hydrationPct, stepsPct, t }: {
  sleepHours: number; moodKey: MoodKey | null; hydrationPct: number; stepsPct: number; t: T;
}) {
  const risk = calcBurnoutRisk({ sleepHours, moodKey, hydrationPct, stepsPct });
  const riskLabel = risk.score <= 25 ? t.burnoutLow : risk.score <= 50 ? t.burnoutModerate : risk.score <= 75 ? t.burnoutHigh : t.burnoutCritical;

  return (
    <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]" style={{ background: risk.color }}>
          <FlameKindling size={18} color="#fff" strokeWidth={2.5} />
        </span>
        <div>
          <p className="font-display text-lg font-black">{t.burnoutRisk}</p>
          <p className="text-xs font-semibold" style={{ color: risk.color }}>{riskLabel}</p>
        </div>
        <span className="ml-auto font-display text-3xl font-black" style={{ color: risk.color }}>{risk.score}%</span>
      </div>
      <div className="mb-4 h-5 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${risk.score}%`, background: risk.color }} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t.sleep,     value: sleepHours > 0 ? `${sleepHours}h` : "—", icon: Moon,     good: sleepHours >= 7 },
          { label: t.mood,      value: moodKey ?? "—",                           icon: Smile,    good: moodKey === "good" || moodKey === "great" },
          { label: t.hydration, value: `${Math.round(hydrationPct)}%`,           icon: Droplets, good: hydrationPct >= 60 },
          { label: t.activity,  value: `${Math.round(stepsPct)}%`,               icon: Activity, good: stepsPct >= 60 },
        ].map(({ label, value, icon: Icon, good }) => (
          <div key={label} className={`rounded-[14px] border-2 p-3 text-center ${good ? "border-[#34d399] bg-[#ECFDF5]" : "border-[var(--border)] bg-[var(--muted)]"}`}>
            <Icon size={14} className="mx-auto mb-1" style={{ color: good ? "#34d399" : "#94a3b8" }} />
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
            <p className="mt-0.5 text-sm font-black capitalize">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WellnessPanel() {
  const { lang } = useLanguage();
  const t = translations[lang];

  const [hydration, setHydration] = useState({ glasses: 0, goal: 8 });
  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medLogs, setMedLogs] = useState<Record<string, boolean>>({});
  const [activity, setActivity] = useState({ steps: 0, goal: 10000 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logRefreshKey, setLogRefreshKey] = useState(0);
  const today = localDateStr();

  useEffect(() => {
    const load = async () => {
      try {
        const [h, s, m, meds, logs, a] = await Promise.all([
          getWellnessHydration(today),
          getWellnessSleepSessions(today),
          getWellnessMoodEntries(today),
          getWellnessMedications(),
          getMedicationLogs(today),
          getWellnessActivity(today),
        ]);
        setHydration(h); setSleepSessions(s.sessions); setMoodEntries(m.entries);
        setMedications(meds.medications); setMedLogs(logs.logs); setActivity(a);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wellness data.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const syncDailySnapshot = async (overrides: { sleepHours?: number; moodKey?: string | null; hydrationGlasses?: number; hydrationGoal?: number; steps?: number; stepsGoal?: number; }) => {
    await upsertDailyWellness({
      date: today,
      sleepHours: overrides.sleepHours ?? sleepSessions[0]?.durationHours ?? 0,
      moodKey: overrides.moodKey !== undefined ? overrides.moodKey : (moodEntries[0]?.mood ?? null),
      hydrationGlasses: overrides.hydrationGlasses ?? hydration.glasses,
      hydrationGoal: overrides.hydrationGoal ?? hydration.goal,
      steps: overrides.steps ?? activity.steps,
      stepsGoal: overrides.stepsGoal ?? activity.goal,
    });
    setLogRefreshKey((k) => k + 1);
  };

  const handleUpdateHydration = async (glasses: number, goal: number) => {
    await saveWellnessHydration(glasses, goal, today); setHydration({ glasses, goal });
    await syncDailySnapshot({ hydrationGlasses: glasses, hydrationGoal: goal });
  };
  const handleAddSleep = async (s: { bedtime: string; wakeTime: string; quality: number; durationHours: number }) => {
    const { id } = await addWellnessSleepSession({ ...s, date: today });
    setSleepSessions((prev) => [{ id, logDate: today, bedtime: s.bedtime, wakeTime: s.wakeTime, quality: s.quality, durationHours: s.durationHours }, ...prev]);
    await syncDailySnapshot({ sleepHours: s.durationHours });
  };
  const handleAddMood = async (mood: MoodKey, note: string) => {
    const { id } = await addWellnessMoodEntry(mood, note || undefined, today);
    setMoodEntries((prev) => [{ id, logDate: today, mood, note: note || null }, ...prev]);
    await syncDailySnapshot({ moodKey: mood });
  };
  const handleAddMedication = async (m: { name: string; dosage?: string; frequency?: string; timeOfDay?: string }) => {
    const { id } = await addWellnessMedication(m);
    setMedications((prev) => [...prev, { id, name: m.name, dosage: m.dosage ?? null, frequency: m.frequency ?? "daily", timeOfDay: m.timeOfDay ?? "morning", isActive: true }]);
  };
  const handleDeleteMedication = async (id: string) => {
    await deleteWellnessMedication(id); setMedications((prev) => prev.filter((m) => m.id !== id));
  };
  const handleToggleMedTaken = async (id: string, taken: boolean) => {
    await logMedicationTaken(id, taken, today); setMedLogs((prev) => ({ ...prev, [id]: taken }));
  };
  const handleUpdateActivity = async (steps: number, goal: number) => {
    await saveWellnessActivity(steps, goal, today); setActivity({ steps, goal });
    await syncDailySnapshot({ steps, stepsGoal: goal });
  };

  const latestSleepHours = sleepSessions[0]?.durationHours ?? 0;
  const latestMoodKey = (moodEntries[0]?.mood as MoodKey | undefined) ?? null;
  const hydrationPct = hydration.goal > 0 ? Math.min(100, (hydration.glasses / hydration.goal) * 100) : 0;
  const stepsPct = activity.goal > 0 ? Math.min(100, (activity.steps / activity.goal) * 100) : 0;
  const wellnessScore = calculateWellnessScore({ sleepHours: latestSleepHours, moodKey: latestMoodKey, hydrationPct, stepsPct });
  const wellnessColor = getScoreColor(wellnessScore);

  if (loading) return <WellnessSkeleton />;

  if (error) {
    return (
      <div className="rounded-[20px] border-2 border-red-300 bg-red-50 p-6 text-center">
        <p className="font-black text-red-600">{t.failedToLoad}</p>
        <p className="mt-1 text-sm text-red-500">{error}</p>
        <p className="mt-2 text-xs text-red-400">{t.checkMigration}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wellness Score */}
      <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)]" style={{ background: wellnessColor }}>
            <Star size={18} color="#fff" strokeWidth={2.5} />
          </span>
          <div className="flex-1">
            <p className="font-display text-lg font-black">{t.wellnessScore}</p>
            <p className="text-xs font-semibold" style={{ color: wellnessColor }}>
              {wellnessScore >= 80 ? t.excellent : wellnessScore >= 55 ? t.good : wellnessScore >= 30 ? t.fair : t.needsAttention}
            </p>
          </div>
          <span className="font-display text-3xl font-black" style={{ color: wellnessColor }}>{wellnessScore}<span className="text-base font-bold text-[var(--muted-fg)]">/100</span></span>
        </div>
        <div className="mt-4 h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${wellnessScore}%`, background: wellnessColor }} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { label: t.sleep,     pts: Math.round(latestSleepHours >= 8 ? 30 : latestSleepHours >= 5 ? ((latestSleepHours - 5) / 3) * 30 : 0), max: 30 },
            { label: t.mood,      pts: latestMoodKey ? ({ awful: 0, sad: 5, okay: 12, good: 17, great: 20 }[latestMoodKey] ?? 0) : 0, max: 20 },
            { label: t.hydration, pts: Math.round(hydrationPct / 100 * 25), max: 25 },
            { label: t.steps,     pts: Math.round(stepsPct / 100 * 25), max: 25 },
          ].map(({ label, pts, max }) => (
            <div key={label} className="rounded-[12px] border-2 border-[var(--border)] bg-[var(--muted)] py-2">
              <p className="font-black uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
              <p className="mt-0.5 font-display text-base font-black">{Math.round(pts)}<span className="text-[10px] font-semibold text-[var(--muted-fg)]">/{max}</span></p>
            </div>
          ))}
        </div>
      </div>

      <BurnoutCard sleepHours={latestSleepHours} moodKey={latestMoodKey} hydrationPct={hydrationPct} stepsPct={stepsPct} t={t} />

      {/* Today's summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: t.sleep,  value: latestSleepHours > 0 ? `${latestSleepHours}h` : "—", icon: BedDouble, color: "#6366f1" },
          { label: t.mood,   value: latestMoodKey ? latestMoodKey.charAt(0).toUpperCase() + latestMoodKey.slice(1) : "—", icon: SmilePlus, color: "#8b5cf6" },
          { label: t.water,  value: `${hydration.glasses}/${hydration.goal}`, icon: Droplets, color: "#60a5fa" },
          { label: t.steps,  value: activity.steps > 0 ? activity.steps.toLocaleString() : "—", icon: Activity, color: "#34d399" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--foreground)]" style={{ background: color }}>
              <Icon size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
            <p className="mt-1 font-display text-xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <MoodSection entries={moodEntries} onAdd={handleAddMood} t={t} />
      <HydrationSection glasses={hydration.glasses} goal={hydration.goal} onUpdate={handleUpdateHydration} t={t} />
      <SleepSection sessions={sleepSessions} onAdd={handleAddSleep} t={t} />
      <ActivitySection steps={activity.steps} goal={activity.goal} onUpdate={handleUpdateActivity} t={t} />
      <MedicationsSection medications={medications} logs={medLogs} onAdd={handleAddMedication} onDelete={handleDeleteMedication} onToggleTaken={handleToggleMedTaken} t={t} />

      <WellnessLog refreshKey={logRefreshKey} />

      {/* Study-rest balance tip */}
      <div className="rounded-[24px] border-2 border-dashed border-[var(--foreground)] bg-[#FFF7D6] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#fbbf24]">
            <Wind size={18} color="#fff" strokeWidth={2.5} />
          </span>
          <div>
            <p className="font-display text-base font-black">{t.studyRestTip}</p>
            <p className="mt-1 text-sm text-[var(--muted-fg)]">
              {latestSleepHours < 6 ? t.tipLowSleep
                : latestMoodKey === "awful" || latestMoodKey === "sad" ? t.tipBadMood
                : hydrationPct < 50 ? t.tipLowHydration
                : t.tipGood}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
