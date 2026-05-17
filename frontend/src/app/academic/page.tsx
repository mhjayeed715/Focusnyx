"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, GraduationCap, Sparkles, Target, TimerReset } from "lucide-react";

const studySteps = [
  "Set a semester target in plain language",
  "Break the next exam into tiny tasks",
  "Track CGPA movement without manual spreadsheets",
  "Keep revision slots visible across the week",
];

export default function AcademicPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl rounded-[32px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Smart Academic Forge</p>
            <h1 className="mt-2 font-display text-4xl font-black sm:text-5xl">Plan the semester without the mess.</h1>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]">
            <Sparkles size={18} strokeWidth={2.5} />
          </span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_0_#1E293B]">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#FBBF24] text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B]">
                <GraduationCap size={18} strokeWidth={2.5} />
              </span>
              <div>
                <p className="font-display text-2xl font-black">Academic momentum</p>
                <p className="text-sm text-[var(--muted-fg)]">Study plans, reminders, and exam prep in one view.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {studySteps.map((step) => (
                <div key={step} className="flex items-center gap-3 rounded-[20px] border-2 border-[var(--foreground)] bg-white px-4 py-3 shadow-[4px_4px_0_0_#1E293B]">
                  <CheckCircle2 size={18} strokeWidth={2.5} className="text-[#34D399]" />
                  <span className="font-semibold">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[#FDF2F8] p-5 shadow-[4px_4px_0_0_#1E293B]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
                  <TimerReset size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-display text-xl font-black">Revision slots</p>
                  <p className="text-sm text-[var(--muted-fg)]">Plan two blocks for today and one for tomorrow.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-5 shadow-[4px_4px_0_0_#1E293B]">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#34D399] text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B]">
                  <Target size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-display text-xl font-black">CGPA tracking</p>
                  <p className="text-sm text-[var(--muted-fg)]">Keep your target visible while you work.</p>
                </div>
              </div>
            </div>

            <Link href="/dashboard" className="candy-button inline-flex h-14 items-center justify-center gap-2 px-6 text-base">
              Go to Dashboard
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
          <span className="hard-chip px-4 py-2">Subject hours</span>
          <span className="hard-chip px-4 py-2">Exam countdown</span>
          <span className="hard-chip px-4 py-2">Task breakdowns</span>
          <span className="hard-chip px-4 py-2">Bangla-first planning</span>
        </div>
      </section>
    </main>
  );
}