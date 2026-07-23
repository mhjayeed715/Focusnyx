"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getAcademicCourses,
  createAcademicSemester,
  deleteAcademicSemester,
  getAcademicSemesters,
  replaceAcademicCourses,
  getAcademicExams,
  createAcademicExam,
  deleteAcademicExam,
  getStudyPlan,
  saveStudyPlan,
} from "@/lib/backend";
import { trackGroqCall } from "@/lib/ai/groq";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpenCheck,
  GraduationCap,
  NotebookPen,
  Plus,
  Target,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AcademicSkeleton } from "@/components/ui/PageSkeleton";
import { useLanguage } from "@/components/layout/language-context";
import { translations } from "@/lib/translations";

type GradeScaleItem = {
  id: string;
  grade: string;
  description: string;
  points: number;
  minPercentage: number;
  rangeLabel: string;
};

type Course = {
  id: string;
  name: string;
  credits: number;
  grade: string;
  targetGrade: string;
  midMarks: number;
  midMarksRaw?: string;
};

type SemesterCgpa = { id: string; value: number };

type ExamItem = { id: string; title: string; date: string; time?: string };
type AssignmentItem = { id: string; title: string; date: string; time?: string };

const STORAGE_ASSIGNMENTS = "academicAssignmentsV1";

const GRADE_SCALE_DEFAULT: GradeScaleItem[] = [
  { id: "g-1",  grade: "A+", description: "Excellent",            points: 4,    minPercentage: 80, rangeLabel: "80 and above" },
  { id: "g-2",  grade: "A",  description: "Very Good",            points: 3.75, minPercentage: 75, rangeLabel: "75-79" },
  { id: "g-3",  grade: "A-", description: "Good Plus",            points: 3.5,  minPercentage: 70, rangeLabel: "70-74" },
  { id: "g-4",  grade: "B+", description: "Good",                 points: 3.25, minPercentage: 65, rangeLabel: "65-69" },
  { id: "g-5",  grade: "B",  description: "Good",                 points: 3,    minPercentage: 60, rangeLabel: "60-64" },
  { id: "g-6",  grade: "B-", description: "Good minus",           points: 2.75, minPercentage: 55, rangeLabel: "55-59" },
  { id: "g-7",  grade: "C+", description: "Quite satisfactory",   points: 2.5,  minPercentage: 50, rangeLabel: "50-54" },
  { id: "g-8",  grade: "C",  description: "Barely satisfactory",  points: 2.25, minPercentage: 45, rangeLabel: "45-49" },
  { id: "g-9",  grade: "D",  description: "Barely adequate/Weak", points: 2,    minPercentage: 40, rangeLabel: "40-44" },
  { id: "g-10", grade: "F",  description: "Fail",                 points: 0,    minPercentage: 0,  rangeLabel: "below 40" },
];

const STORAGE_GRADE_SCALE = "academicGradeScaleV1";
const STORAGE_TARGET_CGPA = "academicTargetCgpaV1";
const STORAGE_STUDY_PLAN  = "academicStudyPlanV1";

// Returns a human-readable countdown string
function timeUntil(dateText: string, timeText?: string): string {
  const now    = new Date();
  const target = new Date(dateText + "T" + (timeText || "23:59") + ":00");
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Passed";
  const mins  = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m left`;
  const days  = Math.floor(hours / 24);
  const remH  = hours % 24;
  return remH > 0 ? `${days}d ${remH}h left` : `${days}d left`;
}

function isUrgent(dateText: string, timeText?: string): boolean {
  const target = new Date(dateText + "T" + (timeText || "23:59") + ":00");
  const diff   = target.getTime() - Date.now();
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
}

function createCourseId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = (key: string) => {
    if (!listBuffer.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag key={key} className={listType === "ol" ? "my-2 ml-5 list-decimal space-y-1" : "my-2 ml-5 list-disc space-y-1"}>
        {listBuffer.map((item, i) => <li key={i} className="text-sm leading-6"><InlineMarkdown text={item} /></li>)}
      </Tag>
    );
    listBuffer = []; listType = null;
  };

  lines.forEach((line, i) => {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    const blank = line.trim() === "";
    if (h1 || h2 || h3 || blank) flushList(`flush-${i}`);
    if (h1) elements.push(<h2 key={i} className="mt-4 mb-1 font-display text-xl font-black">{h1[1]}</h2>);
    else if (h2) elements.push(<h3 key={i} className="mt-3 mb-1 font-display text-base font-black">{h2[1]}</h3>);
    else if (h3) elements.push(<h4 key={i} className="mt-2 mb-0.5 text-sm font-black">{h3[1]}</h4>);
    else if (olMatch) { if (listType === "ul") flushList(`flush-ol-${i}`); listType = "ol"; listBuffer.push(olMatch[1]); }
    else if (ulMatch) { if (listType === "ol") flushList(`flush-ul-${i}`); listType = "ul"; listBuffer.push(ulMatch[1]); }
    else if (blank) { if (elements.length) elements.push(<div key={`sp-${i}`} className="h-2" />); }
    else { flushList(`flush-p-${i}`); elements.push(<p key={i} className="text-sm leading-6"><InlineMarkdown text={line} /></p>); }
  });
  flushList("final");
  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function AcademicPage() {
  const { lang } = useLanguage();
  const t = translations[lang];

  const [coursesExpanded, setCoursesExpanded] = useState(false);
  const [semestersExpanded, setSemestersExpanded] = useState(false);
  const [studyPlan, setStudyPlan] = useState("");
  const [studyPlanLoading, setStudyPlanLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "">("");
  const studyPlanReadyRef = useRef(false);
  const [gradeScale, setGradeScale] = useState<GradeScaleItem[]>(GRADE_SCALE_DEFAULT);
  const [saveNotice, setSaveNotice] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseCredits, setNewCourseCredits] = useState("3");
  const [newCourseGrade, setNewCourseGrade] = useState("A+");
  const [targetCgpa, setTargetCgpa] = useState("3.90");
  const [remainingSemesters, setRemainingSemesters] = useState("2");
  const [previousSemesters, setPreviousSemesters] = useState<SemesterCgpa[]>([]);
  const [newSemesterCgpa, setNewSemesterCgpa] = useState("3.5");
  const [newSemesterNumber, setNewSemesterNumber] = useState("");
  const [coursesPersistenceReady, setCoursesPersistenceReady] = useState(false);
  const courseSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const initialLoadDoneRef = useRef(false);

  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate]   = useState("");
  const [examTime, setExamTime]   = useState("");
  const [examList, setExamList]   = useState<ExamItem[]>([]);

  const [deadlineTab, setDeadlineTab]         = useState<"exam" | "assignment">("exam");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDate, setAssignmentDate]   = useState("");
  const [assignmentTime, setAssignmentTime]   = useState("");
  const [assignmentList, setAssignmentList]   = useState<AssignmentItem[]>([]);

  const [planError, setPlanError]         = useState("");
  const [planViewMode, setPlanViewMode]   = useState<"edit" | "preview">("edit");
  const [planOriginal, setPlanOriginal]   = useState("");

  // ── Load ──
  useEffect(() => {
    const load = async () => {
      try {
        const savedScale = localStorage.getItem(STORAGE_GRADE_SCALE);
        if (savedScale) {
          const parsed = JSON.parse(savedScale) as Array<Partial<GradeScaleItem>>;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGradeScale(parsed.map((item, index) => {
              const fb = GRADE_SCALE_DEFAULT[index] ?? GRADE_SCALE_DEFAULT[GRADE_SCALE_DEFAULT.length - 1];
              return {
                id: String(item.id ?? fb.id), grade: String(item.grade ?? fb.grade),
                description: String(item.description ?? fb.description), points: Number(item.points ?? fb.points),
                minPercentage: Number(item.minPercentage ?? fb.minPercentage), rangeLabel: String(item.rangeLabel ?? fb.rangeLabel),
              };
            }));
          }
        }
        const savedTarget = localStorage.getItem(STORAGE_TARGET_CGPA);
        if (savedTarget) setTargetCgpa(savedTarget);
        const localPlan = localStorage.getItem(STORAGE_STUDY_PLAN);
        if (localPlan) setStudyPlan(localPlan);
        const savedRemaining = localStorage.getItem("academicRemainingSemestersV1");
        if (savedRemaining) setRemainingSemesters(savedRemaining);

        const [remoteSemesters, remoteCourses, remoteExams, remotePlan] = await Promise.allSettled([
          getAcademicSemesters(), getAcademicCourses(), getAcademicExams(), getStudyPlan(),
        ]);
        if (remoteSemesters.status === "fulfilled" && Array.isArray(remoteSemesters.value.semesters))
          setPreviousSemesters(remoteSemesters.value.semesters.map((s) => ({ id: s.id, value: s.cgpa })));
        if (remoteCourses.status === "fulfilled" && Array.isArray(remoteCourses.value.courses)) {
          setCourses(remoteCourses.value.courses.map((c) => ({
            id: c.id, name: c.name, credits: Math.max(1, Number(c.credits) || 3),
            grade: c.grade, targetGrade: c.targetGrade, midMarks: Math.max(0, Math.min(40, Number(c.midMarks) || 0)),
          })));
          initialLoadDoneRef.current = true; setCoursesPersistenceReady(false);
        } else { initialLoadDoneRef.current = true; }
        if (remoteExams.status === "fulfilled" && Array.isArray(remoteExams.value.exams))
          setExamList(remoteExams.value.exams.map((e) => ({ id: e.id, title: e.title, date: e.date })));
        try {
          const saved = localStorage.getItem(STORAGE_ASSIGNMENTS);
          if (saved) setAssignmentList(JSON.parse(saved) as AssignmentItem[]);
        } catch {}
        if (remotePlan.status === "fulfilled" && remotePlan.value?.content) setStudyPlan(remotePlan.value.content);
        setTimeout(() => { studyPlanReadyRef.current = true; }, 0);
      } catch {}
    };
    void load();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const raw = localStorage.getItem(STORAGE_GRADE_SCALE);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Array<Partial<GradeScaleItem>>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGradeScale(parsed.map((item, index) => {
            const fb = GRADE_SCALE_DEFAULT[index] ?? GRADE_SCALE_DEFAULT[GRADE_SCALE_DEFAULT.length - 1];
            return { id: String(item.id ?? fb.id), grade: String(item.grade ?? fb.grade), description: String(item.description ?? fb.description), points: Number(item.points ?? fb.points), minPercentage: Number(item.minPercentage ?? fb.minPercentage), rangeLabel: String(item.rangeLabel ?? fb.rangeLabel) };
          }));
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!coursesPersistenceReady || !initialLoadDoneRef.current) return;
    courseSaveQueueRef.current = courseSaveQueueRef.current.catch(() => undefined).then(async () => { await replaceAcademicCourses(courses); }).catch(() => undefined);
  }, [coursesPersistenceReady, courses]);

  useEffect(() => {
    if (!studyPlanReadyRef.current) return;
    try { localStorage.setItem(STORAGE_STUDY_PLAN, studyPlan); } catch {}
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      saveStudyPlan(studyPlan).then(() => setSaveStatus("saved")).catch(() => setSaveStatus("error"));
    }, 1000);
    return () => clearTimeout(timer);
  }, [studyPlan]);

  useEffect(() => { try { localStorage.setItem(STORAGE_TARGET_CGPA, targetCgpa); } catch {} }, [targetCgpa]);
  useEffect(() => { try { localStorage.setItem("academicRemainingSemestersV1", remainingSemesters); } catch {} }, [remainingSemesters]);

  const pointsByGrade = useMemo(() => gradeScale.reduce<Record<string, number>>((acc, item) => { acc[item.grade.trim().toUpperCase()] = Number(item.points) || 0; return acc; }, {}), [gradeScale]);
  const totalCredits  = useMemo(() => courses.reduce((sum, c) => sum + c.credits, 0), [courses]);
  const cgpa = useMemo(() => {
    if (totalCredits === 0) return 0;
    return courses.reduce((sum, c) => sum + (pointsByGrade[c.grade.trim().toUpperCase()] ?? 0) * c.credits, 0) / totalCredits;
  }, [courses, pointsByGrade, totalCredits]);

  const getAiConfig = async () => {
    if (typeof window === "undefined") return { provider: "groq", apiKey: "" };
    let provider = localStorage.getItem("academicAiProviderV1") || "groq";
    let apiKey = provider === "gemini" ? (localStorage.getItem("academicAiKeyGeminiV1") || "") : (localStorage.getItem("academicAiKeyGroqV1") || "");

    if (!apiKey) {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data: profile } = await sb
            .from("profiles")
            .select("groq_api_key, gemini_api_key, ai_provider")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            if (profile.groq_api_key) {
              apiKey = profile.groq_api_key;
              localStorage.setItem("academicAiKeyGroqV1", profile.groq_api_key);
            }
            if (profile.gemini_api_key) {
              localStorage.setItem("academicAiKeyGeminiV1", profile.gemini_api_key);
            }
            if (profile.ai_provider) {
              provider = profile.ai_provider;
              localStorage.setItem("academicAiProviderV1", profile.ai_provider);
            }
          }
        }
      } catch {}
    }

    return { provider, apiKey };
  };

  const targetValue = Number(targetCgpa) || 0;
  const previousTotal = useMemo(() => previousSemesters.reduce((sum, s) => sum + s.value, 0), [previousSemesters]);
  const previousAverageCgpa = previousSemesters.length > 0 ? previousTotal / previousSemesters.length : 0;
  const overallWithCurrent  = (previousTotal + cgpa) / Math.max(1, previousSemesters.length + 1);

  const requiredPerSemesterLabel = useMemo(() => {
    const compCount = previousSemesters.length;
    const remCount  = Math.max(1, Number(remainingSemesters) || 1);
    const req = (targetValue * (compCount + remCount) - previousTotal) / remCount;
    if (compCount === 0) return { value: targetValue, status: "neutral" };
    if (req > 4.0) return { value: req, status: "impossible" };
    if (req <= 0)  return { value: 0,   status: "secured" };
    if (req > 3.8) return { value: req, status: "challenging" };
    return { value: req, status: "achievable" };
  }, [targetValue, previousSemesters, remainingSemesters, previousTotal]);

  const upcomingExams = useMemo(() => [...examList].sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))), [examList]);

  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    setCourses((prev) => [...prev, { id: createCourseId(), name: newCourseName.trim(), credits: Math.max(1, Number(newCourseCredits) || 3), grade: newCourseGrade, targetGrade: newCourseGrade, midMarks: 0 }]);
    setCoursesPersistenceReady(true); setNewCourseName(""); setNewCourseCredits("3"); setNewCourseGrade("A+");
  };
  const handleDeleteCourse = (id: string) => { setCourses((prev) => prev.filter((c) => c.id !== id)); setCoursesPersistenceReady(true); };
  const handleCourseTargetGradeChange = (courseId: string, targetGrade: string) => { setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, targetGrade } : c)); setCoursesPersistenceReady(true); };
  const handleCourseMidMarksChange = (courseId: string, value: string) => { const num = value === "" ? 0 : Math.max(0, Math.min(40, Number(value))); setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, midMarks: num, midMarksRaw: value } : c)); setCoursesPersistenceReady(true); };

  const getNeededFinalForCourse = (course: Course) => {
    const desired = gradeScale.find((item) => item.grade.trim().toUpperCase() === course.targetGrade.trim().toUpperCase());
    const mid = Math.max(0, Math.min(40, course.midMarks || 0));
    const raw = (desired?.minPercentage ?? 0) - mid;
    return { neededFinal: Math.max(0, raw), secured: raw <= 0, impossible: raw > 60, color: (mid >= 30 ? "green" : mid < 20 ? "red" : "orange") as "green" | "orange" | "red" };
  };

  const addPreviousSemester = () => {
    const value = Number(newSemesterCgpa);
    if (!Number.isFinite(value)) return;
    const trimmed = newSemesterNumber.trim();
    const semesterNoValue = trimmed === "" ? undefined : Number(trimmed);
    createAcademicSemester({ 
      cgpa: Math.max(0, Math.min(4, value)), 
      semesterNo: semesterNoValue !== undefined && Number.isFinite(semesterNoValue) ? Math.max(1, Math.round(semesterNoValue)) : undefined 
    })
      .then((result) => { setPreviousSemesters((prev) => [...prev, { id: result.semester.id, value: result.semester.cgpa }]); setNewSemesterCgpa("3.5"); setNewSemesterNumber(""); })
      .catch(() => {});
  };
  const removePreviousSemester = (id: string) => { deleteAcademicSemester(id).then(() => setPreviousSemesters((prev) => prev.filter((s) => s.id !== id))).catch(() => {}); };

  const handleAddExam = () => {
    if (!examTitle.trim() || !examDate) return;
    const today = new Date().toISOString().split("T")[0];
    if (examDate < today) return;
    const tempId = `temp-${Date.now()}`;
    const item: ExamItem = { id: tempId, title: examTitle.trim(), date: examDate, time: examTime || undefined };
    setExamList((prev) => [...prev, item]); setExamTitle(""); setExamDate(""); setExamTime("");
    createAcademicExam({ title: item.title, date: item.date })
      .then((result) => setExamList((prev) => prev.map((e) => e.id === tempId ? { ...e, id: result.exam.id } : e)))
      .catch(() => {});
  };
  const handleDeleteExam = (id: string) => { setExamList((prev) => prev.filter((e) => e.id !== id)); if (!id.startsWith("temp-")) deleteAcademicExam(id).catch(() => {}); };

  const handleAddAssignment = () => {
    if (!assignmentTitle.trim() || !assignmentDate) return;
    const today = new Date().toISOString().split("T")[0];
    if (assignmentDate < today) return;
    const item: AssignmentItem = { id: `asgn-${Date.now()}`, title: assignmentTitle.trim(), date: assignmentDate, time: assignmentTime || undefined };
    setAssignmentList((prev) => { const next = [...prev, item]; try { localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(next)); } catch {} return next; });
    setAssignmentTitle(""); setAssignmentDate(""); setAssignmentTime("");
  };
  const handleDeleteAssignment = (id: string) => { setAssignmentList((prev) => { const next = prev.filter((a) => a.id !== id); try { localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(next)); } catch {} return next; }); };

  return (
    <AppShell title={t.academicForge}>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="sticker-card bg-[#ECFDF5] p-5 shadow-[8px_8px_0_0_#6EE7B7] hover:translate-y-0">
            <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white"><GraduationCap size={16} strokeWidth={2.5} /></span>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{t.currentCgpa}</p>
            <p className="mt-1 font-display text-3xl font-black">{previousSemesters.length === 0 ? "—" : previousAverageCgpa.toFixed(2)}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted-fg)]">{previousSemesters.length === 0 ? t.addPrevSemesters : t.avgOf(previousSemesters.length)}</p>
          </article>

          <article className="sticker-card bg-[#F3E8FF] p-5 shadow-[8px_8px_0_0_#D6BCFA] flex flex-col justify-between hover:translate-y-0">
            <div>
              <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white"><Target size={16} strokeWidth={2.5} /></span>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{t.targetCgpa}</p>
              <input type="number" step="0.01" min="0" max="4" value={targetCgpa} onChange={(e) => setTargetCgpa(e.target.value)} className="mt-1 w-full rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-1 font-display text-2xl font-black outline-none" />
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{t.remainingSemesters}</p>
              <input type="number" min="1" max="12" value={remainingSemesters} onChange={(e) => setRemainingSemesters(e.target.value)} className="mt-1 w-full rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-1.5 text-sm font-black outline-none" />
            </div>
          </article>

          <article className="sticker-card bg-[#FFF7D6] p-5 shadow-[8px_8px_0_0_#FCD34D] hover:translate-y-0">
            <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white"><BookOpenCheck size={16} strokeWidth={2.5} /></span>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{t.totalCredits}</p>
            <p className="mt-1 font-display text-3xl font-black">{totalCredits}</p>
          </article>

          <article className={`sticker-card p-5 shadow-[8px_8px_0_0_#93C5FD] transition-all flex flex-col justify-between ${requiredPerSemesterLabel.status === "impossible" ? "bg-[#FEE2E2]" : requiredPerSemesterLabel.status === "secured" ? "bg-[#D1FAE5]" : requiredPerSemesterLabel.status === "challenging" ? "bg-[#FEF3C7]" : "bg-[#EFF6FF]"}`}>
            <div>
              <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white"><GraduationCap size={16} strokeWidth={2.5} /></span>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">{t.requiredGpa}</p>
              <p className="mt-1 font-display text-3xl font-black">{requiredPerSemesterLabel.status === "secured" ? t.secured : requiredPerSemesterLabel.status === "impossible" ? "N/A" : requiredPerSemesterLabel.value.toFixed(2)}</p>
            </div>
            <p className={`mt-2 text-xs font-bold ${requiredPerSemesterLabel.status === "impossible" ? "text-red-700" : requiredPerSemesterLabel.status === "secured" ? "text-green-700" : requiredPerSemesterLabel.status === "challenging" ? "text-amber-700" : "text-blue-700"}`}>
              {requiredPerSemesterLabel.status === "impossible" ? t.requiresImpossible(requiredPerSemesterLabel.value.toFixed(2)) : requiredPerSemesterLabel.status === "secured" ? t.targetAlreadySecured : requiredPerSemesterLabel.status === "neutral" ? t.addCompletedSemesters : t.needPerSemester(requiredPerSemesterLabel.value.toFixed(2))}
            </p>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* CGPA Tracker */}
            <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#D6BCFA]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-black">{t.cgpaTracker}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5] px-3 py-1 text-xs font-black">{t.courses(courses.length)}</span>
                  <span className="rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6] px-3 py-1 text-xs font-black">{t.semesterGpa(cgpa.toFixed(2))}</span>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {courses.length === 0 ? (
                  <div className="rounded-[16px] border-2 border-dashed border-[var(--foreground)] px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-[var(--muted-fg)]">{t.noCoursesYet}</p>
                  </div>
                ) : (
                  <>
                    {(coursesExpanded ? courses : courses.slice(0, 3)).map((course) => {
                      const pc = getNeededFinalForCourse(course);
                      const isGreen = pc.secured || pc.color === "green";
                      const isRed   = !isGreen && (pc.impossible || pc.color === "red");
                      const textColor = isGreen ? "text-emerald-700" : isRed ? "text-red-700" : "text-amber-700";
                      const subColor  = isGreen ? "text-emerald-600" : isRed ? "text-red-600" : "text-amber-600";
                      const boxClass  = isGreen ? "border-emerald-500 bg-emerald-50" : isRed ? "border-red-500 bg-red-50" : "border-amber-400 bg-amber-50";
                      return (
                        <div key={course.id} className="rounded-[16px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-black">{course.name}</p>
                              <p className="mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">{course.credits} credits · {course.grade}</p>
                            </div>
                            <button onClick={() => handleDeleteCourse(course.id)} className="shrink-0 rounded-[10px] border-2 border-[var(--foreground)] bg-white p-1.5 hover:bg-red-50"><Trash2 size={13} strokeWidth={2.5} /></button>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div>
                              <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[var(--muted-fg)]">{t.targetGrade}</label>
                              <select value={course.targetGrade} onChange={(e) => handleCourseTargetGradeChange(course.id, e.target.value)} className="w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 py-1.5 text-sm font-bold outline-none">
                                {gradeScale.map((item) => <option key={item.id} value={item.grade}>{item.grade}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[var(--muted-fg)]">{t.midMarks}</label>
                              <input type="number" min="0" max="40" placeholder="0" value={course.midMarksRaw ?? (course.midMarks === 0 ? "" : String(course.midMarks))} onChange={(e) => handleCourseMidMarksChange(course.id, e.target.value)} className="w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 py-1.5 text-sm font-bold outline-none" />
                            </div>
                            <div className={`col-span-2 rounded-[12px] border-2 px-3 py-2 ${boxClass}`}>
                              <p className={`text-xs font-black uppercase tracking-[0.08em] ${textColor}`}>{pc.secured ? t.gradeSecured : pc.impossible ? t.impossible : t.finalMarksNeeded}</p>
                              <p className={`mt-0.5 font-display text-2xl font-black ${textColor}`}>{pc.secured ? "—" : `${pc.neededFinal.toFixed(0)} / 60`}</p>
                              {!pc.secured && <p className={`text-xs font-semibold ${subColor}`}>{pc.impossible ? t.notAchievable : t.scoreToGet(pc.neededFinal.toFixed(0), course.targetGrade)}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {courses.length > 3 && (
                      <button onClick={() => setCoursesExpanded(v => !v)} className="w-full rounded-[12px] border-2 border-dashed border-[var(--foreground)] py-2 text-sm font-black text-[var(--muted-fg)] hover:bg-[var(--muted)]">
                        {coursesExpanded ? t.showLess : t.viewMore(courses.length - 3, t.courseLabel)}
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_100px_100px]">
                  <input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCourse(); }} placeholder={t.courseName} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                  <input type="number" min="1" value={newCourseCredits} onChange={(e) => setNewCourseCredits(e.target.value)} placeholder={t.credits} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                  <select value={newCourseGrade} onChange={(e) => setNewCourseGrade(e.target.value)} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none">
                    {gradeScale.map((item) => <option key={item.id} value={item.grade}>{item.grade}</option>)}
                  </select>
                </div>
                <button onClick={handleAddCourse} className="candy-button inline-flex h-10 w-full items-center justify-center gap-2 px-4 text-sm"><Plus size={14} strokeWidth={2.5} /> {t.addCourse}</button>
              </div>
            </section>

            {/* Previous Semesters */}
            <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#86EFAC]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-black">{t.prevSemestersCgpa}</h2>
                <span className="rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5] px-3 py-1 text-xs font-black">{t.average(previousAverageCgpa.toFixed(2))}</span>
              </div>
              <div className="mt-4 space-y-2">
                {(semestersExpanded ? previousSemesters : previousSemesters.slice(0, 3)).map((s, index) => (
                  <div key={s.id} className="flex items-center justify-between rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2">
                    <p className="text-sm font-semibold">{t.semester(index + 1)}: {s.value.toFixed(2)}</p>
                    <button onClick={() => removePreviousSemester(s.id)} className="inline-flex h-8 items-center justify-center rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2"><Trash2 size={14} strokeWidth={2.5} /></button>
                  </div>
                ))}
                {previousSemesters.length > 3 && (
                  <button onClick={() => setSemestersExpanded(v => !v)} className="w-full rounded-[12px] border-2 border-dashed border-[var(--foreground)] py-2 text-sm font-black text-[var(--muted-fg)] hover:bg-[var(--muted)]">
                    {semestersExpanded ? t.showLess : t.viewMore(previousSemesters.length - 3, t.semesterLabel)}
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input type="number" min="0" max="4" step="0.01" value={newSemesterCgpa} onChange={(e) => setNewSemesterCgpa(e.target.value)} placeholder={t.enterSemesterCgpa} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                <input type="number" min="1" value={newSemesterNumber} onChange={(e) => setNewSemesterNumber(e.target.value)} placeholder={t.semesterNoOptional} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                <button onClick={addPreviousSemester} className="candy-button inline-flex h-10 items-center justify-center gap-2 px-4 text-sm"><Plus size={14} strokeWidth={2.5} /> {t.addSemester}</button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-[#F8FAFC] px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted-fg)]">{t.totalCgpaSum}</p>
                  <p className="mt-1 font-display text-2xl font-black">{previousTotal.toFixed(2)}</p>
                </div>
                <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-[#F8FAFC] px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted-fg)]">{t.overallWithCurrent}</p>
                  <p className="mt-1 font-display text-2xl font-black">{overallWithCurrent.toFixed(2)}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Deadline Calendar */}
            <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#F9A8D4]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{t.deadlineCalendar}</p>
                  <h2 className="mt-1 font-display text-2xl font-black">{deadlineTab === "exam" ? t.upcomingExams : t.assignments}</h2>
                </div>
                <div className="flex items-center gap-1 rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-1">
                  <button onClick={() => setDeadlineTab("exam")} className={`rounded-[10px] px-3 py-1.5 text-xs font-black transition ${deadlineTab === "exam" ? "bg-[var(--foreground)] text-white" : "text-[var(--muted-fg)] hover:text-[var(--foreground)]"}`}>{t.exams}</button>
                  <button onClick={() => setDeadlineTab("assignment")} className={`rounded-[10px] px-3 py-1.5 text-xs font-black transition ${deadlineTab === "assignment" ? "bg-[var(--foreground)] text-white" : "text-[var(--muted-fg)] hover:text-[var(--foreground)]"}`}>{t.assignmentsTab}</button>
                </div>
              </div>

              {deadlineTab === "exam" ? (
                <>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_130px_100px_auto]">
                    <input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddExam(); }} placeholder={t.examTitle} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                    <input type="date" value={examDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setExamDate(e.target.value)} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                    <input type="time" value={examTime} onChange={(e) => setExamTime(e.target.value)} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                    <button onClick={handleAddExam} className="candy-button inline-flex h-10 items-center justify-center gap-2 px-4 text-sm"><Plus size={14} strokeWidth={2.5} /> {t.add}</button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {upcomingExams.length === 0 ? (
                      <p className="rounded-[12px] border-2 border-dashed border-[var(--foreground)] px-3 py-3 text-sm text-[var(--muted-fg)]">{t.noExamsYet}</p>
                    ) : upcomingExams.map((exam) => {
                      const urgent = isUrgent(exam.date, exam.time);
                      const label  = timeUntil(exam.date, exam.time);
                      return (
                        <div key={exam.id} className={`flex items-center justify-between rounded-[12px] border-2 px-3 py-2 ${urgent ? "border-red-400 bg-red-50" : "border-[var(--foreground)] bg-white"}`}>
                          <div>
                            <p className="font-bold">{exam.title}</p>
                            <p className={`text-xs font-semibold ${urgent ? "text-red-600" : "text-[var(--muted-fg)]"}`}>{exam.date}{exam.time ? ` ${exam.time}` : ""} · {label}</p>
                          </div>
                          <button onClick={() => handleDeleteExam(exam.id)} className="ml-2 inline-flex h-8 items-center justify-center rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 hover:bg-red-50"><Trash2 size={13} strokeWidth={2.5} /></button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_130px_100px_auto]">
                    <input value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddAssignment(); }} placeholder={t.assignmentTitle} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                    <input type="date" value={assignmentDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setAssignmentDate(e.target.value)} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                    <input type="time" value={assignmentTime} onChange={(e) => setAssignmentTime(e.target.value)} className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none" />
                    <button onClick={handleAddAssignment} className="candy-button inline-flex h-10 items-center justify-center gap-2 px-4 text-sm"><Plus size={14} strokeWidth={2.5} /> {t.add}</button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {assignmentList.length === 0 ? (
                      <p className="rounded-[12px] border-2 border-dashed border-[var(--foreground)] px-3 py-3 text-sm text-[var(--muted-fg)]">{t.noAssignmentsYet}</p>
                    ) : [...assignmentList].sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))).map((item) => {
                      const urgent = isUrgent(item.date, item.time);
                      const label  = timeUntil(item.date, item.time);
                      return (
                        <div key={item.id} className={`flex items-center justify-between rounded-[12px] border-2 px-3 py-2 ${urgent ? "border-amber-400 bg-amber-50" : "border-[var(--foreground)] bg-white"}`}>
                          <div>
                            <p className="font-bold">{item.title}</p>
                            <p className={`text-xs font-semibold ${urgent ? "text-amber-700" : "text-[var(--muted-fg)]"}`}>{item.date}{item.time ? ` ${item.time}` : ""} · {label}</p>
                          </div>
                          <button onClick={() => handleDeleteAssignment(item.id)} className="ml-2 inline-flex h-8 items-center justify-center rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 hover:bg-red-50"><Trash2 size={13} strokeWidth={2.5} /></button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* Study Plan */}
            <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#FCD34D]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{t.studyPlan}</p>
                  <h2 className="mt-0.5 font-display text-xl font-black">{t.myStudyPlan}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPlanViewMode(v => v === "edit" ? "preview" : "edit")} className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 text-xs font-black hover:bg-white transition">
                    {planViewMode === "edit" ? <><BookOpenCheck size={13} strokeWidth={2.5} /> {t.preview}</> : <><NotebookPen size={13} strokeWidth={2.5} /> {t.edit}</>}
                  </button>
                  <button
                    onClick={async () => {
                      const { provider, apiKey } = await getAiConfig();
                      if (!apiKey) { setPlanError(t.addApiKeyFirst); return; }
                      if (!studyPlan.trim()) { setPlanError(t.writePlanFirst); return; }
                      setPlanError(""); setStudyPlanLoading(true); setPlanOriginal(studyPlan);
                      try {
                        const prompt = `Improve and enhance this student study plan. Make it ADHD-friendly with clear time blocks and micro-tasks. Keep the original intent but make it more actionable:\n\n${studyPlan}`;
                        let text = "";
                        if (provider === "gemini") {
                          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
                          if (!res.ok) throw new Error();
                          const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
                          text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                        } else {
                          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], temperature: 0.4 }) });
                          if (!res.ok) throw new Error();
                          const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
                          text = data.choices?.[0]?.message?.content?.trim() || "";
                          if (text) trackGroqCall();
                        }
                        if (text) { setStudyPlan(text); setPlanViewMode("preview"); }
                      } catch { setPlanError(t.aiEnhanceFailed); }
                      finally { setStudyPlanLoading(false); }
                    }}
                    disabled={studyPlanLoading}
                    className="candy-button inline-flex h-9 items-center gap-1.5 px-3 text-xs disabled:opacity-50"
                  >
                    <WandSparkles size={13} strokeWidth={2.5} />
                    {studyPlanLoading ? t.enhancing : t.aiEnhance}
                  </button>
                </div>
              </div>

              {planOriginal && planOriginal !== studyPlan && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-[10px] border-2 border-[#8b5cf6] bg-purple-50 px-3 py-2">
                  <p className="text-xs font-semibold text-purple-700">{t.aiEnhanced}</p>
                  <button onClick={() => { setStudyPlan(planOriginal); setPlanOriginal(""); setPlanViewMode("edit"); }} className="text-xs font-black text-purple-700 underline hover:no-underline">{t.revertToOriginal}</button>
                </div>
              )}

              {planError && <p className="mt-2 rounded-[10px] border-2 border-red-400 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{planError}</p>}

              {planViewMode === "edit" ? (
                <textarea value={studyPlan} onChange={(e) => setStudyPlan(e.target.value)} rows={10} placeholder={t.studyPlanPlaceholder} className="mt-3 w-full rounded-[12px] border-2 border-[var(--foreground)] bg-[#FAFAFA] px-4 py-3 text-sm leading-6 outline-none resize-none font-mono" />
              ) : (
                <div className="mt-3 min-h-[200px] rounded-[12px] border-2 border-[var(--foreground)] bg-[#FAFAFA] px-4 py-3 text-sm leading-7">
                  {studyPlan.trim() ? <MarkdownContent text={studyPlan} /> : <p className="text-[var(--muted-fg)]">{t.nothingToPreview}</p>}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
