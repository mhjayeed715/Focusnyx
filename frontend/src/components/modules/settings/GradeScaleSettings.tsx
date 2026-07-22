"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, RotateCcw, CheckCircle2 } from "lucide-react";

type GradeScaleItem = {
  id: string;
  grade: string;
  description: string;
  points: number;
  minPercentage: number;
  rangeLabel: string;
};

// Must match exactly what academic/page.tsx uses
const STORAGE_KEY = "academicGradeScaleV1";

const DEFAULTS: GradeScaleItem[] = [
  { id: "g-1",  grade: "A+", description: "Excellent",             points: 4,    minPercentage: 80, rangeLabel: "80 and above" },
  { id: "g-2",  grade: "A",  description: "Very Good",             points: 3.75, minPercentage: 75, rangeLabel: "75-79" },
  { id: "g-3",  grade: "A-", description: "Good Plus",             points: 3.5,  minPercentage: 70, rangeLabel: "70-74" },
  { id: "g-4",  grade: "B+", description: "Good",                  points: 3.25, minPercentage: 65, rangeLabel: "65-69" },
  { id: "g-5",  grade: "B",  description: "Good",                  points: 3,    minPercentage: 60, rangeLabel: "60-64" },
  { id: "g-6",  grade: "B-", description: "Good minus",            points: 2.75, minPercentage: 55, rangeLabel: "55-59" },
  { id: "g-7",  grade: "C+", description: "Quite satisfactory",    points: 2.5,  minPercentage: 50, rangeLabel: "50-54" },
  { id: "g-8",  grade: "C",  description: "Barely satisfactory",   points: 2.25, minPercentage: 45, rangeLabel: "45-49" },
  { id: "g-9",  grade: "D",  description: "Barely adequate/Weak",  points: 2,    minPercentage: 40, rangeLabel: "40-44" },
  { id: "g-10", grade: "F",  description: "Fail",                  points: 0,    minPercentage: 0,  rangeLabel: "below 40" },
];

function load(): GradeScaleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GradeScaleItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULTS;
}

function save(data: GradeScaleItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function GradeScaleSettings() {
  const [scale, setScale] = useState<GradeScaleItem[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setScale(load()); }, []);

  const update = (updated: GradeScaleItem[]) => {
    setScale(updated);
    save(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const updateRow = (index: number, field: keyof GradeScaleItem, value: string | number) => {
    const next = scale.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      // keep minPercentage in sync with rangeLabel first number
      if (field === "rangeLabel" && typeof value === "string") {
        const m = value.match(/\d+/);
        if (m) updated.minPercentage = Number(m[0]);
      }
      return updated;
    });
    update(next);
  };

  const deleteRow = (index: number) => update(scale.filter((_, i) => i !== index));

  const addRow = () => update([
    ...scale,
    { id: `g-${Date.now()}`, grade: "", description: "", points: 0, minPercentage: 0, rangeLabel: "" },
  ]);

  const reset = () => update([...DEFAULTS]);

  return (
    <section className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#FFF7D6]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Grade Scale</p>
          <h2 className="mt-0.5 font-display text-xl font-black">Configure Your Scale</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-fg)]">Changes instantly affect CGPA tracker &amp; final marks calculator</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-black text-[#34d399]">
              <CheckCircle2 size={13} strokeWidth={2.5} /> Saved
            </span>
          )}
          <button
            onClick={reset}
            title="Reset to default"
            className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-1.5 text-xs font-black hover:bg-white transition"
          >
            <RotateCcw size={12} strokeWidth={2.5} /> Reset
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border-2 border-[var(--foreground)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--muted)]">
            <tr className="border-b-2 border-[var(--foreground)]">
              <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide">Grade</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide">Description</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide">GPA Pts</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide">Marks Range</th>
              <th className="px-3 py-2 text-left text-xs font-black uppercase tracking-wide">Min%</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {scale.map((item, i) => (
              <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-2 py-1.5">
                  <input
                    value={item.grade}
                    onChange={e => updateRow(i, "grade", e.target.value)}
                    className="w-14 rounded-[8px] border-2 border-[var(--foreground)] bg-white px-2 py-1 text-sm font-black outline-none focus:bg-[#FAFAFA]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={item.description}
                    onChange={e => updateRow(i, "description", e.target.value)}
                    className="w-full min-w-[120px] rounded-[8px] border-2 border-[var(--border)] bg-white px-2 py-1 text-sm outline-none focus:border-[var(--foreground)] focus:bg-[#FAFAFA]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={item.points}
                    onChange={e => updateRow(i, "points", Number(e.target.value))}
                    className="w-16 rounded-[8px] border-2 border-[var(--foreground)] bg-white px-2 py-1 text-sm font-bold outline-none focus:bg-[#FAFAFA]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={item.rangeLabel}
                    onChange={e => updateRow(i, "rangeLabel", e.target.value)}
                    placeholder="e.g. 75-79"
                    className="w-full min-w-[90px] rounded-[8px] border-2 border-[var(--border)] bg-white px-2 py-1 text-sm outline-none focus:border-[var(--foreground)] focus:bg-[#FAFAFA]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.minPercentage}
                    onChange={e => updateRow(i, "minPercentage", Number(e.target.value))}
                    className="w-14 rounded-[8px] border-2 border-[var(--foreground)] bg-white px-2 py-1 text-sm font-bold outline-none focus:bg-[#FAFAFA]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => deleteRow(i)}
                    className="grid h-7 w-7 place-items-center rounded-[8px] border-2 border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)] hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-2 rounded-[12px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-2 text-sm font-black hover:bg-white transition"
      >
        <Plus size={14} strokeWidth={2.5} /> Add Grade Row
      </button>

      <p className="mt-3 text-xs text-[var(--muted-fg)]">
        💡 <strong>Min%</strong> drives the "Final Marks Needed" calculator — set it to the minimum total marks% required to achieve that grade at your institution.
      </p>
    </section>
  );
}
