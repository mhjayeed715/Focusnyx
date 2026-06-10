"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import {
  ArrowRight,
  BrainCircuit,
  BookOpenCheck,
  CalendarClock,
  CircleDollarSign,
  CirclePlay,
  ClipboardList,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  NotebookPen,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

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

type SemesterCgpa = {
  id: string;
  value: number;
};

type ExamItem = {
  id: string;
  title: string;
  date: string;
};

type AssignmentItem = {
  id: string;
  title: string;
  date: string;
};

const STORAGE_ASSIGNMENTS = "academicAssignmentsV1";

type AiProvider = "gemini" | "groq";

type SidebarHref = "/dashboard" | "/academic" | "/focus" | "/notes" | "/finance" | "/wellness" | "/coach";

type SidebarItem = {
  label: string;
  href: SidebarHref;
  icon: typeof LayoutDashboard;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const GRADE_SCALE_DEFAULT: GradeScaleItem[] = [
  { id: "g-1", grade: "A+", description: "Excellent", points: 4, minPercentage: 80, rangeLabel: "80 and above" },
  { id: "g-2", grade: "A", description: "Very Good", points: 3.75, minPercentage: 75, rangeLabel: "75-79" },
  { id: "g-3", grade: "A-", description: "Good Plus", points: 3.5, minPercentage: 70, rangeLabel: "70-74" },
  { id: "g-4", grade: "B+", description: "Good", points: 3.25, minPercentage: 65, rangeLabel: "65-69" },
  { id: "g-5", grade: "B", description: "Good", points: 3, minPercentage: 60, rangeLabel: "60-64" },
  { id: "g-6", grade: "B-", description: "Good minus", points: 2.75, minPercentage: 55, rangeLabel: "55-59" },
  { id: "g-7", grade: "C+", description: "Quite satisfactory", points: 2.5, minPercentage: 50, rangeLabel: "50-54" },
  { id: "g-8", grade: "C", description: "Barely satisfactory", points: 2.25, minPercentage: 45, rangeLabel: "45-49" },
  { id: "g-9", grade: "D", description: "Barely adequate/Weak", points: 2, minPercentage: 40, rangeLabel: "40-44" },
  { id: "g-10", grade: "F", description: "Fail", points: 0, minPercentage: 0, rangeLabel: "below 40" },
];

const STORAGE_GRADE_SCALE = "academicGradeScaleV1";
const STORAGE_TARGET_CGPA = "academicTargetCgpaV1";
const STORAGE_KEY_GEMINI = "academicAiKeyGeminiV1";
const STORAGE_KEY_GROQ = "academicAiKeyGroqV1";
const STORAGE_STUDY_PLAN = "academicStudyPlanV1";

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Academic", href: "/academic", icon: GraduationCap },
  { label: "Focus", href: "/focus", icon: CirclePlay },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Finance", href: "/finance", icon: CircleDollarSign },
  { label: "Wellness", href: "/wellness", icon: HeartPulse },
  { label: "Coach", href: "/coach", icon: BrainCircuit },
];

function daysUntil(dateText: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateText);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function createCourseId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ─── Minimal markdown renderer (no external deps) ────────────────────────────
// Handles: **bold**, *italic*, ## headings, - lists, numbered lists, blank lines
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
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm leading-6">
            <InlineMarkdown text={item} />
          </li>
        ))}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  };

  lines.forEach((line, i) => {
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    const blank = line.trim() === "";

    if (h1 || h2 || h3 || blank) {
      flushList(`flush-${i}`);
    }

    if (h1) {
      elements.push(<h2 key={i} className="mt-4 mb-1 font-display text-xl font-black">{h1[1]}</h2>);
    } else if (h2) {
      elements.push(<h3 key={i} className="mt-3 mb-1 font-display text-base font-black">{h2[1]}</h3>);
    } else if (h3) {
      elements.push(<h4 key={i} className="mt-2 mb-0.5 text-sm font-black">{h3[1]}</h4>);
    } else if (olMatch) {
      if (listType === "ul") flushList(`flush-ol-${i}`);
      listType = "ol";
      listBuffer.push(olMatch[1]);
    } else if (ulMatch) {
      if (listType === "ol") flushList(`flush-ul-${i}`);
      listType = "ul";
      listBuffer.push(ulMatch[1]);
    } else if (blank) {
      if (elements.length) elements.push(<div key={`sp-${i}`} className="h-2" />);
    } else {
      flushList(`flush-p-${i}`);
      elements.push(<p key={i} className="text-sm leading-6"><InlineMarkdown text={line} /></p>);
    }
  });
  flushList("final");
  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  // **bold**, *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function AcademicPage() {
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
  const courseSaveQueueRef = useRef<Promise<any>>(Promise.resolve());
  const initialLoadDoneRef = useRef(false);

  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examList, setExamList] = useState<ExamItem[]>([]);

  const [deadlineTab, setDeadlineTab] = useState<"exam" | "assignment">("exam");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDate, setAssignmentDate] = useState("");
  const [assignmentList, setAssignmentList] = useState<AssignmentItem[]>([]);

  const [planSubject, setPlanSubject] = useState("Algorithms");
  const [planExamDate, setPlanExamDate] = useState("");
  const [planHours, setPlanHours] = useState("8");
  const [planResult, setPlanResult] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planViewMode, setPlanViewMode] = useState<"edit" | "preview">("edit");
  const [planOriginal, setPlanOriginal] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const savedScale = localStorage.getItem(STORAGE_GRADE_SCALE);
        if (savedScale) {
          const parsed = JSON.parse(savedScale) as Array<Partial<GradeScaleItem>>;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = parsed.map((item, index) => {
              const fallback = GRADE_SCALE_DEFAULT[index] ?? GRADE_SCALE_DEFAULT[GRADE_SCALE_DEFAULT.length - 1];
              return {
                id: String(item.id ?? fallback.id),
                grade: String(item.grade ?? fallback.grade),
                description: String(item.description ?? fallback.description),
                points: Number(item.points ?? fallback.points),
                minPercentage: Number(item.minPercentage ?? fallback.minPercentage),
                rangeLabel: String(item.rangeLabel ?? fallback.rangeLabel),
              };
            });
            setGradeScale(merged);
          }
        }

        const savedTarget = localStorage.getItem(STORAGE_TARGET_CGPA);
        if (savedTarget) setTargetCgpa(savedTarget);

        // Load study plan from localStorage instantly while Supabase fetches
        const localPlan = localStorage.getItem(STORAGE_STUDY_PLAN);
        if (localPlan) setStudyPlan(localPlan);

        const savedRemaining = localStorage.getItem("academicRemainingSemestersV1");
        if (savedRemaining) {
          setRemainingSemesters(savedRemaining);
        }

        const [remoteSemesters, remoteCourses, remoteExams, remotePlan] = await Promise.allSettled([
          getAcademicSemesters(),
          getAcademicCourses(),
          getAcademicExams(),
          getStudyPlan(),
        ]);

        if (remoteSemesters.status === "fulfilled" && Array.isArray(remoteSemesters.value.semesters)) {
          setPreviousSemesters(
            remoteSemesters.value.semesters.map((semester) => ({
              id: semester.id,
              value: semester.cgpa,
            })),
          );
        }

        if (remoteCourses.status === "fulfilled" && Array.isArray(remoteCourses.value.courses)) {
          setCourses(
            remoteCourses.value.courses.map((course) => ({
              id: course.id,
              name: course.name,
              credits: Math.max(1, Number(course.credits) || 3),
              grade: course.grade,
              targetGrade: course.targetGrade,
              midMarks: Math.max(0, Math.min(40, Number(course.midMarks) || 0)),
            })),
          );
          initialLoadDoneRef.current = true;
          setCoursesPersistenceReady(false);
        } else {
          initialLoadDoneRef.current = true;
        }

        if (remoteExams.status === "fulfilled" && Array.isArray(remoteExams.value.exams)) {
          setExamList(remoteExams.value.exams.map((e) => ({ id: e.id, title: e.title, date: e.date })));
        }

        // Load assignments from localStorage
        try {
          const saved = localStorage.getItem(STORAGE_ASSIGNMENTS);
          if (saved) setAssignmentList(JSON.parse(saved) as AssignmentItem[]);
        } catch {}

        if (remotePlan.status === "fulfilled" && remotePlan.value?.content) {
          setStudyPlan(remotePlan.value.content);
        }
        // Flip after React has processed the setStudyPlan render,
        // so the save effect skips the initial load.
        setTimeout(() => { studyPlanReadyRef.current = true; }, 0);
      } catch {
        // ignore
      }
    };

    void load();
  }, []);

  useEffect(() => {
    if (!coursesPersistenceReady || !initialLoadDoneRef.current) return;
    courseSaveQueueRef.current = courseSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await replaceAcademicCourses(courses);
      })
      .catch(() => undefined);
  }, [coursesPersistenceReady, courses]);

  // Debounced auto-save for study plan
  useEffect(() => {
    if (!studyPlanReadyRef.current) return;
    // Always back up to localStorage immediately
    try { localStorage.setItem(STORAGE_STUDY_PLAN, studyPlan); } catch {}
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      saveStudyPlan(studyPlan)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 1000);
    return () => clearTimeout(timer);
  }, [studyPlan]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TARGET_CGPA, targetCgpa);
    } catch {
      // ignore
    }
  }, [targetCgpa]);

  useEffect(() => {
    try {
      localStorage.setItem("academicRemainingSemestersV1", remainingSemesters);
    } catch {
      // ignore
    }
  }, [remainingSemesters]);

  const pointsByGrade = useMemo(() => {
    return gradeScale.reduce<Record<string, number>>((acc, item) => {
      acc[item.grade.trim().toUpperCase()] = Number(item.points) || 0;
      return acc;
    }, {});
  }, [gradeScale]);

  const totalCredits = useMemo(() => courses.reduce((sum, c) => sum + c.credits, 0), [courses]);

  const cgpa = useMemo(() => {
    if (totalCredits === 0) return 0;
    const totalPoints = courses.reduce((sum, course) => {
      const gp = pointsByGrade[course.grade.trim().toUpperCase()] ?? 0;
      return sum + gp * course.credits;
    }, 0);
    return totalPoints / totalCredits;
  }, [courses, pointsByGrade, totalCredits]);

  const getAiConfig = () => {
    if (typeof window === "undefined") return { provider: "groq", apiKey: "" };
    const provider = localStorage.getItem("academicAiProviderV1") || "groq";
    const apiKey = provider === "gemini" 
      ? (localStorage.getItem("academicAiKeyGeminiV1") || "")
      : (localStorage.getItem("academicAiKeyGroqV1") || "");
    return { provider, apiKey };
  };

  const targetValue = Number(targetCgpa) || 0;

  const previousTotal = useMemo(
    () => previousSemesters.reduce((sum, semester) => sum + semester.value, 0),
    [previousSemesters],
  );
  const previousAverageCgpa = previousSemesters.length > 0 ? previousTotal / previousSemesters.length : 0;
  const overallWithCurrent = (previousTotal + cgpa) / Math.max(1, previousSemesters.length + 1);

  const requiredPerSemesterLabel = useMemo(() => {
    const compCount = previousSemesters.length;
    const remCount = Math.max(1, Number(remainingSemesters) || 1);
    const totalCount = compCount + remCount;
    const req = (targetValue * totalCount - previousTotal) / remCount;
    
    if (compCount === 0) {
      return {
        value: targetValue,
        status: "neutral",
        msg: "Add completed semesters to calculate",
      };
    }

    if (req > 4.0) {
      return {
        value: req,
        status: "impossible",
        msg: `Requires ${req.toFixed(2)} (Impossible)`,
      };
    } else if (req <= 0) {
      return {
        value: 0,
        status: "secured",
        msg: "Target already secured!",
      };
    } else if (req > 3.8) {
      return {
        value: req,
        status: "challenging",
        msg: `Need ${req.toFixed(2)} per semester`,
      };
    } else {
      return {
        value: req,
        status: "achievable",
        msg: `Need ${req.toFixed(2)} per semester`,
      };
    }
  }, [targetValue, previousSemesters, remainingSemesters, previousTotal]);

  const upcomingExams = useMemo(() => {
    return [...examList].sort((a, b) => a.date.localeCompare(b.date));
  }, [examList]);

  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    const credits = Math.max(1, Number(newCourseCredits) || 3);
    const next: Course = {
      id: createCourseId(),
      name: newCourseName.trim(),
      credits,
      grade: newCourseGrade,
      targetGrade: newCourseGrade,
      midMarks: 0,
    };
    setCourses((prev) => [...prev, next]);
    setCoursesPersistenceReady(true);
    setNewCourseName("");
    setNewCourseCredits("3");
    setNewCourseGrade("A+");
  };

  const handleDeleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setCoursesPersistenceReady(true);
  };

  const handleCourseTargetGradeChange = (courseId: string, targetGrade: string) => {
    setCourses((prev) => prev.map((course) => (course.id === courseId ? { ...course, targetGrade } : course)));
    setCoursesPersistenceReady(true);
  };

  const handleCourseMidMarksChange = (courseId: string, value: string) => {
    const num = value === "" ? 0 : Math.max(0, Math.min(40, Number(value)));
    setCourses((prev) => prev.map((course) => (course.id === courseId ? { ...course, midMarks: num, midMarksRaw: value } : course)));
    setCoursesPersistenceReady(true);
  };

  const getNeededFinalForCourse = (course: Course) => {
    const desired = gradeScale.find((item) => item.grade.trim().toUpperCase() === course.targetGrade.trim().toUpperCase());
    const minTotal = desired?.minPercentage ?? 0;
    const mid = Math.max(0, Math.min(40, course.midMarks || 0));
    const raw = minTotal - mid;
    const neededFinal = Math.max(0, raw);
    const impossible = raw > 60;
    const secured = raw <= 0;
    // color based on mid marks scored
    const color: "green" | "orange" | "red" =
      mid >= 30 ? "green" : mid < 20 ? "red" : "orange";
    return { neededFinal, secured, impossible, color };
  };

  const addPreviousSemester = () => {
    const value = Number(newSemesterCgpa);
    const semesterNoValue = Number(newSemesterNumber);
    if (!Number.isFinite(value)) return;
    const sanitized = Math.max(0, Math.min(4, value));
    createAcademicSemester({
      cgpa: sanitized,
      semesterNo: Number.isFinite(semesterNoValue) ? Math.max(1, Math.round(semesterNoValue)) : undefined,
    })
      .then((result) => {
        setPreviousSemesters((prev) => [...prev, { id: result.semester.id, value: result.semester.cgpa }]);
        setNewSemesterCgpa("3.5");
        setNewSemesterNumber("");
      })
      .catch(() => {
        // ignore
      });
  };

  const removePreviousSemester = (id: string) => {
    deleteAcademicSemester(id)
      .then(() => {
        setPreviousSemesters((prev) => prev.filter((semester) => semester.id !== id));
      })
      .catch(() => {
        // ignore
      });
  };

  const handleSaveGradeScale = () => {
    try {
      localStorage.setItem(STORAGE_GRADE_SCALE, JSON.stringify(gradeScale));
      setSaveNotice("Grade system saved.");
      window.setTimeout(() => setSaveNotice(""), 1800);
    } catch {
      setSaveNotice("Unable to save right now.");
    }
  };

  const handleResetGradeScale = () => {
    setGradeScale(GRADE_SCALE_DEFAULT);
    try {
      localStorage.setItem(STORAGE_GRADE_SCALE, JSON.stringify(GRADE_SCALE_DEFAULT));
    } catch {
      // ignore
    }
  };

  const handleAddGradeRow = () => {
    setGradeScale((prev) => [
      ...prev,
      { id: `grade-${Date.now()}`, grade: "", description: "", points: 0, minPercentage: 0, rangeLabel: "" },
    ]);
  };

  const handleAddExam = () => {
    if (!examTitle.trim() || !examDate) return;
    const today = new Date().toISOString().split("T")[0];
    if (examDate < today) return;
    const title = examTitle.trim();
    const date = examDate;
    // optimistic UI
    const tempId = `temp-${Date.now()}`;
    setExamList((prev) => [...prev, { id: tempId, title, date }]);
    setExamTitle("");
    setExamDate("");
    createAcademicExam({ title, date })
      .then((result) => {
        setExamList((prev) => prev.map((e) => e.id === tempId ? { id: result.exam.id, title: result.exam.title, date: result.exam.date } : e));
      })
      .catch(() => {
        // keep optimistic item — backend unavailable
      });
  };

  const handleDeleteExam = (id: string) => {
    setExamList((prev) => prev.filter((e) => e.id !== id));
    if (!id.startsWith("temp-")) {
      deleteAcademicExam(id).catch(() => undefined);
    }
  };

  const handleAddAssignment = () => {
    if (!assignmentTitle.trim() || !assignmentDate) return;
    const today = new Date().toISOString().split("T")[0];
    if (assignmentDate < today) return;
    const item: AssignmentItem = {
      id: `asgn-${Date.now()}`,
      title: assignmentTitle.trim(),
      date: assignmentDate,
    };
    setAssignmentList((prev) => {
      const next = [...prev, item];
      try { localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(next)); } catch {}
      return next;
    });
    setAssignmentTitle("");
    setAssignmentDate("");
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignmentList((prev) => {
      const next = prev.filter((a) => a.id !== id);
      try { localStorage.setItem(STORAGE_ASSIGNMENTS, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const generatePlan = async () => {
    setPlanError("");
    setPlanResult("");

    const { provider, apiKey } = getAiConfig();
    if (!apiKey) {
      setPlanError("Please provide your own API key.");
      return;
    }

    if (!planSubject.trim() || !planExamDate) {
      setPlanError("Please provide subject and exam date.");
      return;
    }

    const prompt = `Create a concise ADHD-friendly study plan for ${planSubject}. Exam date: ${planExamDate}. Available weekly hours: ${planHours}. Return: 1) weekly schedule 2) micro tasks 3) revision milestones.`;

    setPlanLoading(true);
    try {
      if (provider === "gemini") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Gemini request failed. Check key or quota.");
        }

        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        setPlanResult(text || "No response text received.");
      } else {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
          }),
        });

        if (!response.ok) {
          throw new Error("Groq request failed. Check key or quota.");
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        const text = data.choices?.[0]?.message?.content?.trim();
        setPlanResult(text || "No response text received.");
        trackGroqCall();
      }
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Unable to generate plan.");
    } finally {
      setPlanLoading(false);
    }
  };

  return (
    <AppShell title="Academic Forge">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="sticker-card bg-[#ECFDF5] p-5 shadow-[8px_8px_0_0_#6EE7B7] hover:translate-y-0">
            <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white">
              <GraduationCap size={16} strokeWidth={2.5} />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">Current CGPA</p>
            <p className="mt-1 font-display text-3xl font-black">
              {previousSemesters.length === 0 ? "—" : previousAverageCgpa.toFixed(2)}
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--muted-fg)]">
              {previousSemesters.length === 0
                ? "Add previous semesters below"
                : `Avg of ${previousSemesters.length} semester${previousSemesters.length > 1 ? "s" : ""}`}
            </p>
          </article>

          <article className="sticker-card bg-[#F3E8FF] p-5 shadow-[8px_8px_0_0_#D6BCFA] flex flex-col justify-between hover:translate-y-0">
            <div>
              <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white">
                <Target size={16} strokeWidth={2.5} />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">Target CGPA</p>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={targetCgpa}
                onChange={(event) => setTargetCgpa(event.target.value)}
                className="mt-1 w-full rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-1 font-display text-2xl font-black outline-none"
              />
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">Remaining Semesters</p>
              <input
                type="number"
                min="1"
                max="12"
                value={remainingSemesters}
                onChange={(event) => setRemainingSemesters(event.target.value)}
                className="mt-1 w-full rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-1.5 text-sm font-black outline-none"
              />
            </div>
          </article>

          <article className="sticker-card bg-[#FFF7D6] p-5 shadow-[8px_8px_0_0_#FCD34D] hover:translate-y-0">
            <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white">
              <BookOpenCheck size={16} strokeWidth={2.5} />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">Total Credits</p>
            <p className="mt-1 font-display text-3xl font-black">{totalCredits}</p>
          </article>

          <article className={`sticker-card p-5 shadow-[8px_8px_0_0_#93C5FD] transition-all flex flex-col justify-between ${
            requiredPerSemesterLabel.status === "impossible" ? "bg-[#FEE2E2]" :
            requiredPerSemesterLabel.status === "secured" ? "bg-[#D1FAE5]" :
            requiredPerSemesterLabel.status === "challenging" ? "bg-[#FEF3C7]" : "bg-[#EFF6FF]"
          }`}>
            <div>
              <span className="mb-2 inline-grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white">
                <GraduationCap size={16} strokeWidth={2.5} />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">Required GPA / Semester</p>
              <p className="mt-1 font-display text-3xl font-black">
                {requiredPerSemesterLabel.status === "secured" ? "Secured" : 
                 requiredPerSemesterLabel.status === "impossible" ? "N/A" : 
                 requiredPerSemesterLabel.value.toFixed(2)}
              </p>
            </div>
            <p className={`mt-2 text-xs font-bold ${
              requiredPerSemesterLabel.status === "impossible" ? "text-red-700" :
              requiredPerSemesterLabel.status === "secured" ? "text-green-700" :
              requiredPerSemesterLabel.status === "challenging" ? "text-amber-700" : "text-blue-700"
            }`}>
              {requiredPerSemesterLabel.msg}
            </p>
          </article>
        </div>

        {/* Main Content Sections */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Column */}
          <div className="space-y-6">
            <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#D6BCFA]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-black">CGPA Tracker</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5] px-3 py-1 text-xs font-black">{courses.length} Courses</span>
                  <span className="rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6] px-3 py-1 text-xs font-black">Semester GPA: {cgpa.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {courses.length === 0 ? (
                  <div className="rounded-[16px] border-2 border-dashed border-[var(--foreground)] px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-[var(--muted-fg)]">No courses yet. Add one below.</p>
                  </div>
                ) : (
                  <>
                    {(coursesExpanded ? courses : courses.slice(0, 3)).map((course) => {
                      const perCourse = getNeededFinalForCourse(course);
                      return (
                        <div key={course.id} className="rounded-[16px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-black">{course.name}</p>
                              <p className="mt-0.5 text-xs font-semibold text-[var(--muted-fg)]">{course.credits} credits · Current grade: {course.grade}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="shrink-0 rounded-[10px] border-2 border-[var(--foreground)] bg-white p-1.5 hover:bg-red-50"
                            >
                              <Trash2 size={13} strokeWidth={2.5} />
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div>
                              <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[var(--muted-fg)]">Target Grade</label>
                              <select
                                value={course.targetGrade}
                                onChange={(e) => handleCourseTargetGradeChange(course.id, e.target.value)}
                                className="w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 py-1.5 text-sm font-bold outline-none"
                              >
                                {gradeScale.map((item) => (
                                  <option key={item.id} value={item.grade}>{item.grade}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-black uppercase tracking-[0.08em] text-[var(--muted-fg)]">Mid Marks /40</label>
                              <input
                                type="number"
                                min="0"
                                max="40"
                                placeholder="0"
                                value={course.midMarksRaw ?? (course.midMarks === 0 ? "" : String(course.midMarks))}
                                onChange={(e) => handleCourseMidMarksChange(course.id, e.target.value)}
                                className="w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 py-1.5 text-sm font-bold outline-none"
                              />
                            </div>

                            <div className={`col-span-2 rounded-[12px] border-2 px-3 py-2 ${
                              perCourse.secured || perCourse.color === "green"
                                ? "border-emerald-500 bg-emerald-50"
                                : perCourse.impossible || perCourse.color === "red"
                                  ? "border-red-500 bg-red-50"
                                  : "border-amber-400 bg-amber-50"
                            }`}>
                              {(() => {
                                const isGreen = perCourse.secured || perCourse.color === "green";
                                const isRed = !isGreen && (perCourse.impossible || perCourse.color === "red");
                                const textColor = isGreen ? "text-emerald-700" : isRed ? "text-red-700" : "text-amber-700";
                                const subColor = isGreen ? "text-emerald-600" : isRed ? "text-red-600" : "text-amber-600";
                                return (
                                  <>
                                    <p className={`text-xs font-black uppercase tracking-[0.08em] ${textColor}`}>
                                      {perCourse.secured ? "✓ Grade Secured" : perCourse.impossible ? "✗ Impossible" : "Final Marks Needed"}
                                    </p>
                                    <p className={`mt-0.5 font-display text-2xl font-black ${textColor}`}>
                                      {perCourse.secured ? "—" : `${perCourse.neededFinal.toFixed(0)} / 60`}
                                    </p>
                                    {!perCourse.secured && (
                                      <p className={`text-xs font-semibold ${subColor}`}>
                                        {perCourse.impossible
                                          ? "Not achievable — lower target grade"
                                          : `Score ${perCourse.neededFinal.toFixed(0)} in final to get ${course.targetGrade}`}
                                      </p>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {courses.length > 3 && (
                      <button onClick={() => setCoursesExpanded(v => !v)} className="w-full rounded-[12px] border-2 border-dashed border-[var(--foreground)] py-2 text-sm font-black text-[var(--muted-fg)] hover:bg-[var(--muted)]">
                        {coursesExpanded ? "↑ Show less" : `↓ View ${courses.length - 3} more course${courses.length - 3 > 1 ? "s" : ""}`}
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_100px_100px]">
                  <input
                    value={newCourseName}
                    onChange={(event) => setNewCourseName(event.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddCourse(); }}
                    placeholder="Course name"
                    className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newCourseCredits}
                    onChange={(event) => setNewCourseCredits(event.target.value)}
                    placeholder="Credits"
                    className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                  />
                  <select
                    value={newCourseGrade}
                    onChange={(event) => setNewCourseGrade(event.target.value)}
                    className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                  >
                    {gradeScale.map((item) => (
                      <option key={item.id} value={item.grade}>{item.grade}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleAddCourse} className="candy-button inline-flex h-10 w-full items-center justify-center gap-2 px-4 text-sm">
                  <Plus size={14} strokeWidth={2.5} /> Add Course
                </button>
              </div>
            </section>

            <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#86EFAC]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-black">Previous Semesters CGPA</h2>
                <span className="rounded-full border-2 border-[var(--foreground)] bg-[#ECFDF5] px-3 py-1 text-xs font-black">
                  Average: {previousAverageCgpa.toFixed(2)}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {(semestersExpanded ? previousSemesters : previousSemesters.slice(0, 3)).map((semester, index) => (
                  <div key={semester.id} className="flex items-center justify-between rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2">
                    <p className="text-sm font-semibold">Semester {index + 1}: {semester.value.toFixed(2)}</p>
                    <button onClick={() => removePreviousSemester(semester.id)} className="inline-flex h-8 items-center justify-center rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2">
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
                {previousSemesters.length > 3 && (
                  <button onClick={() => setSemestersExpanded(v => !v)} className="w-full rounded-[12px] border-2 border-dashed border-[var(--foreground)] py-2 text-sm font-black text-[var(--muted-fg)] hover:bg-[var(--muted)]">
                    {semestersExpanded ? "↑ Show less" : `↓ View ${previousSemesters.length - 3} more semester${previousSemesters.length - 3 > 1 ? "s" : ""}`}
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={newSemesterCgpa}
                  onChange={(event) => setNewSemesterCgpa(event.target.value)}
                  placeholder="Enter semester CGPA"
                  className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                />
                <input
                  type="number"
                  min="1"
                  value={newSemesterNumber}
                  onChange={(event) => setNewSemesterNumber(event.target.value)}
                  placeholder="Semester no (optional)"
                  className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                />
                <button onClick={addPreviousSemester} className="candy-button inline-flex h-10 items-center justify-center gap-2 px-4 text-sm">
                  <Plus size={14} strokeWidth={2.5} /> Add Semester
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-[#F8FAFC] px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted-fg)]">Total CGPA Sum</p>
                  <p className="mt-1 font-display text-2xl font-black">{previousTotal.toFixed(2)}</p>
                </div>
                <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-[#F8FAFC] px-3 py-2">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--muted-fg)]">Overall with Current Semester</p>
                  <p className="mt-1 font-display text-2xl font-black">{overallWithCurrent.toFixed(2)}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#F9A8D4]">
              {/* Header + tab toggle */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Deadline Calendar</p>
                  <h2 className="mt-1 font-display text-2xl font-black">
                    {deadlineTab === "exam" ? "Upcoming Exams" : "Assignments"}
                  </h2>
                </div>
                <div className="flex items-center gap-1 rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-1">
                  <button
                    onClick={() => setDeadlineTab("exam")}
                    className={`rounded-[10px] px-3 py-1.5 text-xs font-black transition ${
                      deadlineTab === "exam" ? "bg-[var(--foreground)] text-white" : "text-[var(--muted-fg)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    📝 Exams
                  </button>
                  <button
                    onClick={() => setDeadlineTab("assignment")}
                    className={`rounded-[10px] px-3 py-1.5 text-xs font-black transition ${
                      deadlineTab === "assignment" ? "bg-[var(--foreground)] text-white" : "text-[var(--muted-fg)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    📋 Assignments
                  </button>
                </div>
              </div>

              {deadlineTab === "exam" ? (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                    <input
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddExam(); }}
                      placeholder="Exam title"
                      className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                    />
                    <input
                      type="date"
                      value={examDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                    />
                    <button onClick={handleAddExam} className="candy-button inline-flex h-10 items-center justify-center gap-2 px-4 text-sm">
                      <Plus size={14} strokeWidth={2.5} /> Add
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {upcomingExams.length === 0 ? (
                      <p className="rounded-[12px] border-2 border-dashed border-[var(--foreground)] px-3 py-3 text-sm text-[var(--muted-fg)]">No exam deadlines yet.</p>
                    ) : (
                      upcomingExams.map((exam) => {
                        const left = daysUntil(exam.date);
                        const leftLabel = left > 0 ? `${left}d left` : left === 0 ? "Today!" : "Passed";
                        const urgent = left >= 0 && left <= 3;
                        return (
                          <div key={exam.id} className={`flex items-center justify-between rounded-[12px] border-2 px-3 py-2 ${
                            urgent ? "border-red-400 bg-red-50" : "border-[var(--foreground)] bg-white"
                          }`}>
                            <div>
                              <p className="font-bold">{exam.title}</p>
                              <p className={`text-xs font-semibold ${urgent ? "text-red-600" : "text-[var(--muted-fg)]"}`}>
                                {exam.date} · {leftLabel}
                              </p>
                            </div>
                            <button onClick={() => handleDeleteExam(exam.id)} className="ml-2 inline-flex h-8 items-center justify-center rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 hover:bg-red-50">
                              <Trash2 size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
                    <input
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddAssignment(); }}
                      placeholder="Assignment title"
                      className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                    />
                    <input
                      type="date"
                      value={assignmentDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      className="rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 outline-none"
                    />
                    <button onClick={handleAddAssignment} className="candy-button inline-flex h-10 items-center justify-center gap-2 px-4 text-sm">
                      <Plus size={14} strokeWidth={2.5} /> Add
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {assignmentList.length === 0 ? (
                      <p className="rounded-[12px] border-2 border-dashed border-[var(--foreground)] px-3 py-3 text-sm text-[var(--muted-fg)]">No assignments yet.</p>
                    ) : (
                      [...assignmentList]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((item) => {
                          const left = daysUntil(item.date);
                          const leftLabel = left > 0 ? `${left}d left` : left === 0 ? "Today!" : "Passed";
                          const urgent = left >= 0 && left <= 2;
                          return (
                            <div key={item.id} className={`flex items-center justify-between rounded-[12px] border-2 px-3 py-2 ${
                              urgent ? "border-amber-400 bg-amber-50" : "border-[var(--foreground)] bg-white"
                            }`}>
                              <div>
                                <p className="font-bold">{item.title}</p>
                                <p className={`text-xs font-semibold ${urgent ? "text-amber-700" : "text-[var(--muted-fg)]"}`}>
                                  {item.date} · {leftLabel}
                                </p>
                              </div>
                              <button onClick={() => handleDeleteAssignment(item.id)} className="ml-2 inline-flex h-8 items-center justify-center rounded-[10px] border-2 border-[var(--foreground)] bg-white px-2 hover:bg-red-50">
                                <Trash2 size={13} strokeWidth={2.5} />
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="sticker-card bg-white p-6 shadow-[8px_8px_0_0_#FCD34D]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Study Plan</p>
                  <h2 className="mt-0.5 font-display text-xl font-black">My Study Plan</h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Edit / Preview toggle */}
                  <button
                    onClick={() => setPlanViewMode(v => v === "edit" ? "preview" : "edit")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 text-xs font-black hover:bg-white transition"
                  >
                    {planViewMode === "edit" ? <><BookOpenCheck size={13} strokeWidth={2.5} /> Preview</> : <><NotebookPen size={13} strokeWidth={2.5} /> Edit</>}
                  </button>
                  <button
                    onClick={async () => {
                      const { provider, apiKey } = getAiConfig();
                      if (!apiKey) { setPlanError("Add API key in Settings first."); return; }
                      if (!studyPlan.trim()) { setPlanError("Write your plan first, then AI will enhance it."); return; }
                      setPlanError(""); setStudyPlanLoading(true);
                      setPlanOriginal(studyPlan); // stash before overwrite
                      try {
                        const prompt = `Improve and enhance this student study plan. Make it ADHD-friendly with clear time blocks and micro-tasks. Keep the original intent but make it more actionable:\n\n${studyPlan}`;
                        let text = "";
                        if (provider === "gemini") {
                          const res = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
                            }
                          );
                          if (!res.ok) throw new Error();
                          const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
                          text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
                        } else {
                          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }], temperature: 0.4 }),
                          });
                          if (!res.ok) throw new Error();
                          const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
                          text = data.choices?.[0]?.message?.content?.trim() || "";
                          if (text) trackGroqCall();
                        }
                        if (text) { setStudyPlan(text); setPlanViewMode("preview"); }
                      } catch { setPlanError("AI enhance failed. Check your API key."); }
                      finally { setStudyPlanLoading(false); }
                    }}
                    disabled={studyPlanLoading}
                    className="candy-button inline-flex h-9 items-center gap-1.5 px-3 text-xs disabled:opacity-50"
                  >
                    <WandSparkles size={13} strokeWidth={2.5} />
                    {studyPlanLoading ? "Enhancing..." : "AI Enhance"}
                  </button>
                </div>
              </div>

              {/* Revert banner */}
              {planOriginal && planOriginal !== studyPlan && (
                <div className="mt-2 flex items-center justify-between gap-3 rounded-[10px] border-2 border-[#8b5cf6] bg-purple-50 px-3 py-2">
                  <p className="text-xs font-semibold text-purple-700">✨ AI enhanced — your original is saved</p>
                  <button
                    onClick={() => { setStudyPlan(planOriginal); setPlanOriginal(""); setPlanViewMode("edit"); }}
                    className="text-xs font-black text-purple-700 underline hover:no-underline"
                  >
                    Revert to original
                  </button>
                </div>
              )}

              {planError ? (
                <p className="mt-2 rounded-[10px] border-2 border-red-400 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{planError}</p>
              ) : null}

              {planViewMode === "edit" ? (
                <textarea
                  value={studyPlan}
                  onChange={(e) => setStudyPlan(e.target.value)}
                  rows={10}
                  placeholder={`Write your study plan here...\n\nExample:\n- Monday: Algorithms Ch1-3 (2h)\n- Tuesday: Math revision (1.5h)\n- Wednesday: Physics lab prep (1h)\n\nClick "AI Enhance" to make it better with AI.`}
                  className="mt-3 w-full rounded-[12px] border-2 border-[var(--foreground)] bg-[#FAFAFA] px-4 py-3 text-sm leading-6 outline-none resize-none font-mono"
                />
              ) : (
                <div className="mt-3 min-h-[200px] rounded-[12px] border-2 border-[var(--foreground)] bg-[#FAFAFA] px-4 py-3 text-sm leading-7">
                  {studyPlan.trim() ? (
                    <MarkdownContent text={studyPlan} />
                  ) : (
                    <p className="text-[var(--muted-fg)]">Nothing to preview yet. Switch to Edit and write your plan.</p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}