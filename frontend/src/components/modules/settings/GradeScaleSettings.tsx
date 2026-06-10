import React, { useEffect, useState } from 'react';

// Utility functions for localStorage handling of grade scale
const STORAGE_KEY = 'gradeScale';
function loadGradeScale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
function saveGradeScale(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function GradeScaleSettings() {
  const [gradeScale, setGradeScale] = useState<Array<{ id: string; grade: string; points: number; rangeLabel: string }>>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setGradeScale(loadGradeScale());
  }, []);

  // Persist changes
  useEffect(() => {
    saveGradeScale(gradeScale);
  }, [gradeScale]);

  // Helper to add a new grade entry
  const addGrade = () => {
    const newEntry = {
      id: `g-${Date.now()}`,
      grade: '',
      points: 0,
      rangeLabel: '',
    };
    setGradeScale((prev) => [...prev, newEntry]);
  };

  return (
    <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#FFF7D6] w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">
            Grade Scale Settings
          </p>
          <h2 className="mt-1 font-display text-2xl font-black">Configure Scale</h2>
        </div>
        <span className="rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6] px-3 py-1 text-xs font-black">
          {gradeScale.length} Grades
        </span>
      </div>

      <div className="mt-4 max-h-60 overflow-auto rounded-[14px] border-2 border-[var(--foreground)] bg-white">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-[var(--muted)] border-b-2 border-[var(--foreground)]">
            <tr>
              <th className="px-3 py-2 text-left font-black">Grade</th>
              <th className="px-3 py-2 text-left font-black">GPA Point</th>
              <th className="px-3 py-2 text-left font-black">Marks Range</th>
            </tr>
          </thead>
          <tbody>
            {gradeScale.map((item, index) => (
              <tr key={item.id} className="border-b-2 border-[var(--border)] last:border-b-0">
                <td className="px-3 py-2">
                  <input
                    value={item.grade}
                    onChange={(e) =>
                      setGradeScale((prev) =>
                        prev.map((entry, i) => (i === index ? { ...entry, grade: e.target.value } : entry))
                      )
                    }
                    className="w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 py-1.5 font-semibold outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={item.points}
                    onChange={(e) =>
                      setGradeScale((prev) =>
                        prev.map((entry, i) => (i === index ? { ...entry, points: Number(e.target.value) || 0 } : entry))
                      )
                    }
                    className="w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 py-1.5 font-semibold outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={item.rangeLabel}
                    onChange={(e) =>
                      setGradeScale((prev) =>
                        prev.map((entry, i) => {
                          if (i !== index) return entry;
                          const minMatch = e.target.value.match(/\d+/);
                          return {
                            ...entry,
                            rangeLabel: e.target.value,
                            minPercentage: minMatch ? Number(minMatch[0]) : entry.minPercentage,
                          };
                        })
                      )
                    }
                    className="w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 py-1.5 font-semibold outline-none"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
{/* Predefined Grade Ranges */}
<section className="mt-6">
  <h3 className="text-lg font-display font-black mb-2">Standard Grade Scale</h3>
  <table className="min-w-full text-sm border border-[var(--foreground)]">
    <thead className="bg-[var(--muted)] border-b-2 border-[var(--foreground)]">
      <tr>
        <th className="px-3 py-2 text-left font-black">Grade</th>
        <th className="px-3 py-2 text-left font-black">Description</th>
        <th className="px-3 py-2 text-left font-black">GPA Point</th>
        <th className="px-3 py-2 text-left font-black">Marks Range</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">A+</td><td className="px-3 py-2">Excellent</td><td className="px-3 py-2">4.00</td><td className="px-3 py-2">80 and above</td></tr>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">A</td><td className="px-3 py-2">Very Good</td><td className="px-3 py-2">3.75</td><td className="px-3 py-2">75-79</td></tr>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">A-</td><td className="px-3 py-2">Good Plus</td><td className="px-3 py-2">3.50</td><td className="px-3 py-2">70-74</td></tr>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">B+</td><td className="px-3 py-2">Good</td><td className="px-3 py-2">3.25</td><td className="px-3 py-2">65-69</td></tr>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">B</td><td className="px-3 py-2">Good</td><td className="px-3 py-2">3.00</td><td className="px-3 py-2">60-64</td></tr>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">B-</td><td className="px-3 py-2">Good minus</td><td className="px-3 py-2">2.75</td><td className="px-3 py-2">55-59</td></tr>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">C+</td><td className="px-3 py-2">Quite satisfactory</td><td className="px-3 py-2">2.50</td><td className="px-3 py-2">50-54</td></tr>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">C</td><td className="px-3 py-2">Barely satisfactory</td><td className="px-3 py-2">2.25</td><td className="px-3 py-2">45-49</td></tr>
      <tr className="border-b border-[var(--border)]"><td className="px-3 py-2">D</td><td className="px-3 py-2">Barely adequate/Weak</td><td className="px-3 py-2">2.00</td><td className="px-3 py-2">40-44</td></tr>
      <tr><td className="px-3 py-2">F</td><td className="px-3 py-2">Fail</td><td className="px-3 py-2">0</td><td className="px-3 py-2">below 40</td></tr>
    </tbody>
  </table>
</section>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={addGrade} className="candy-button px-3 py-1 text-sm">
          Add Grade
        </button>
      </div>
    </section>
  );
}
