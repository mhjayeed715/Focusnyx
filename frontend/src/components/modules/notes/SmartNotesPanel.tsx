"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Save, Trash2, Zap, Search, X, Plus, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { callGroq } from "@/lib/ai/groq";

import { NoteQuizViewer, QuizData } from "./NoteQuizViewer";

const STORAGE_KEY_GROQ     = "academicAiKeyGroqV1";
const STORAGE_KEY_SUBJECTS = "notesCustomSubjectsV1";
const DEFAULT_SUBJECTS     = ["General", "Math", "Physics", "Chemistry", "CSE", "English", "Economics"];

type Note = { id: string; subject: string; content: string; source: string; created_at: string };
type Lang = "en-US" | "bn-BD";

export function SmartNotesPanel() {
  const [userId,  setUserId]  = useState<string | null>(null);
  const [groqKey, setGroqKey] = useState("");

  const [subjects,     setSubjects]     = useState<string[]>(DEFAULT_SUBJECTS);
  const [subject,      setSubject]      = useState("General");
  const [newTagInput,  setNewTagInput]  = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  const [content,        setContent]        = useState("");
  const [lang,           setLang]           = useState<Lang>("en-US");
  const [isRecording,    setIsRecording]    = useState(false);


  const [notes,         setNotes]         = useState<Note[]>([]);
  const [search,        setSearch]        = useState("");
  const [filterSubject, setFilterSubject] = useState("All");

  const [quizMap,     setQuizMap]     = useState<Record<string, QuizData>>({});
  const [quizLoading, setQuizLoading] = useState<string | null>(null);

  // Quiz Configurator Modal State
  const [configModalNote, setConfigModalNote]   = useState<Note | null>(null);
  const [configType, setConfigType]             = useState<"mcq" | "short" | "broad">("mcq");
  const [configCountPreset, setConfigCountPreset] = useState<3 | 5 | 10 | "custom">(5);
  const [configCustomCount, setConfigCustomCount] = useState("5");

  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load persisted subjects + groqKey on mount (client-only + Supabase fallback)
  useEffect(() => {
    async function initKeys() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SUBJECTS);
        if (saved) setSubjects(JSON.parse(saved) as string[]);
      } catch {}

      let key = "";
      try {
        key = localStorage.getItem(STORAGE_KEY_GROQ) ?? "";
      } catch {}

      // Fallback query to Supabase DB if cache was cleared
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data: profile } = await sb
            .from("profiles")
            .select("groq_api_key")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.groq_api_key && !key) {
            key = profile.groq_api_key;
            try {
              localStorage.setItem(STORAGE_KEY_GROQ, key);
            } catch {}
          }
        }
      } catch {}

      setGroqKey(key);
    }

    void initKeys();
  }, []);



  // Auth: fresh client per useEffect — reads session cookie correctly after hydration
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) void loadNotes(uid);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) void loadNotes(uid);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadNotes(uid: string) {
    const sb = createClient();
    const { data, error } = await sb
      .from("notes")
      .select("id, subject, content, source, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) { showToast(error.message, "err"); return; }
    if (data) setNotes(data as Note[]);
  }

  const reset = () => {};

  const addTag = () => {
    const tag = newTagInput.trim();
    if (!tag || subjects.includes(tag)) { setNewTagInput(""); setShowTagInput(false); return; }
    const updated = [...subjects, tag];
    setSubjects(updated);
    localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(updated));
    setSubject(tag);
    setNewTagInput("");
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => {
    if (subjects.length <= 1) return;
    const updated = subjects.filter(s => s !== tag);
    setSubjects(updated);
    localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(updated));
    if (subject === tag) setSubject(updated[0]);
    if (filterSubject === tag) setFilterSubject("All");
  };

  // ── Live Voice-to-Text Engine (Chrome webkitSpeechRecognition) ──
  // Uses a generation counter so stale onend/onerror from aborted instances
  // don't trigger restarts (which caused an infinite abort loop).
  const recognitionRef = useRef<any>(null);
  const activeListeningRef = useRef(false);
  const finalTextRef = useRef("");
  const existingContentRef = useRef("");
  const langRef = useRef(lang);
  const generationRef = useRef(0);
  langRef.current = lang;

  const doSpawn = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { console.error("[VoiceNote] SpeechRecognition API not found"); return; }

    const gen = ++generationRef.current;

    const r: any = new SR();
    recognitionRef.current = r;
    r.lang = langRef.current === "bn-BD" ? "bn-BD" : "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      if (gen !== generationRef.current) return;
      let interim = "";
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTextRef.current = (finalTextRef.current + " " + t.trim()).trim();
        } else {
          interim = t;
        }
      }
      const liveText = interim
        ? (finalTextRef.current + " " + interim).trim()
        : finalTextRef.current;
      const prefix = existingContentRef.current;
      setContent(prefix ? (prefix + " " + liveText).trim() : liveText);
    };

    r.onerror = (e: any) => {
      if (gen !== generationRef.current) return; // stale — ignore
      const code = e.error;
      console.warn("[VoiceNote] error:", code, "gen:", gen);
      if (code === "aborted") return; // we aborted it ourselves
      if (code === "no-speech") {
        if (activeListeningRef.current) setTimeout(doSpawn, 200);
        return;
      }
      if (code === "not-allowed") {
        showToast("Microphone permission denied. Allow mic access.", "err");
      } else if (code === "network") {
        showToast("Network error — Chrome needs internet for speech recognition.", "err");
      } else {
        showToast("Speech recognition error: " + code, "err");
      }
      activeListeningRef.current = false;
      setIsRecording(false);
    };

    r.onend = () => {
      if (gen !== generationRef.current) return; // stale — ignore
      console.log("[VoiceNote] onend, gen:", gen, "active:", activeListeningRef.current);
      if (activeListeningRef.current) {
        setTimeout(doSpawn, 200);
      } else {
        setIsRecording(false);
      }
    };

    try {
      r.start();
      console.log("[VoiceNote] started gen:", gen, "lang:", r.lang);
    } catch (err) {
      console.error("[VoiceNote] start() threw:", err);
      showToast("Failed to start speech recognition.", "err");
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      showToast("Speech recognition is not supported in this browser.", "err");
      return;
    }

    // Request microphone permission explicitly first.
    // Chrome SpeechRecognition silently fails without prior mic permission.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(
        msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("permission")
          ? "Microphone permission denied. Allow mic access in browser settings."
          : "Could not access microphone: " + msg,
        "err"
      );
      return;
    }

    // Stop any existing instance cleanly before starting fresh
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;

    existingContentRef.current = content;
    finalTextRef.current = "";
    activeListeningRef.current = true;
    setIsRecording(true);

    // Small delay to let the aborted instance fully clean up
    setTimeout(doSpawn, 150);
  };

  const stopRecording = () => {
    activeListeningRef.current = false;
    generationRef.current++; // invalidate any pending restarts
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const saveNote = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { showToast("Not signed in.", "err"); setSaving(false); return; }
      const { error } = await sb.from("notes").insert({
        user_id: user.id,
        subject,
        content: content.trim(),
        source: "voice-whisper",
      });
      if (error) { showToast(error.message, "err"); return; }
      setContent("");
      showToast("Note saved!");
      await loadNotes(user.id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed.", "err");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    const sb = createClient();
    await sb.from("notes").delete().eq("id", id);
    setNotes(prev => prev.filter(n => n.id !== id));
    setQuizMap(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleOpenQuizConfig = (note: Note) => {
    if (!groqKey) {
      showToast("Add Groq API key in Settings to generate quizzes.", "err");
      return;
    }
    if (quizMap[note.id]) {
      setQuizMap(prev => { const next = { ...prev }; delete next[note.id]; return next; });
      return;
    }
    setConfigModalNote(note);
  };

  const handleStartQuizGeneration = async () => {
    if (!configModalNote) return;
    const note = configModalNote;
    setConfigModalNote(null);
    setQuizLoading(note.id);

    const questionCount = configCountPreset === "custom"
      ? Math.max(1, Math.min(20, Number(configCustomCount) || 5))
      : configCountPreset;

    try {
      let systemPrompt = "";
      let userPrompt = "";

      if (configType === "mcq") {
        systemPrompt = "You are an expert exam quiz generator. You MUST respond with ONLY a valid raw JSON array containing MCQ question objects. Do not include markdown code block syntax or extra text. Format:\n[{\"id\": 1, \"question\": \"String\", \"options\": [\"A. Option 1\", \"B. Option 2\", \"C. Option 3\", \"D. Option 4\"], \"correctIndex\": 0, \"explanation\": \"String explanation\"}]";
        userPrompt = `Generate exactly ${questionCount} multiple choice questions (MCQs) with 4 options each from the following study note:\n\n${note.content}`;
      } else {
        const style = configType === "broad" ? "broad essay-style practice questions with detailed comprehensive answers" : "concise short answer questions";
        systemPrompt = "You are an expert study assistant. You MUST respond with ONLY a valid raw JSON array containing Q&A objects. Do not include markdown code block syntax or extra text. Format:\n[{\"id\": 1, \"question\": \"String\", \"answer\": \"String\"}]";
        userPrompt = `Generate exactly ${questionCount} ${style} from the following study note:\n\n${note.content}`;
      }

      const rawResponse = await callGroq(groqKey, userPrompt, systemPrompt);

      const parsedQuizData: QuizData = {
        type: configType,
        count: questionCount,
        rawText: rawResponse,
      };

      try {
        const cleanedJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonParsed = JSON.parse(cleanedJson);
        if (Array.isArray(jsonParsed)) {
          if (configType === "mcq") {
            parsedQuizData.mcqQuestions = jsonParsed;
          } else {
            parsedQuizData.qaQuestions = jsonParsed;
          }
        }
      } catch {
        // Fallback raw text
      }

      setQuizMap(prev => ({ ...prev, [note.id]: parsedQuizData }));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Quiz generation failed.", "err");
    } finally {
      setQuizLoading(null);
    }
  };

  const filtered = notes.filter(n => {
    const matchSubject = filterSubject === "All" || n.subject === filterSubject;
    const matchSearch  = !search
      || n.content.toLowerCase().includes(search.toLowerCase())
      || n.subject.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  const isCapturing  = isRecording;
  const noteSubjects = Array.from(new Set(notes.map(n => n.subject)));

  return (
    <div className="space-y-6">

      {toast && (
        <div className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--foreground)] px-5 py-2.5 text-sm font-bold shadow-[4px_4px_0_0_#1E293B] ${toast.type === "err" ? "bg-red-50 text-red-700" : "bg-[#ECFDF5] text-green-800"}`}>
          {toast.msg}
        </div>
      )}

      {/* Capture Card */}
      <div className="sticker-card p-5 space-y-4">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display text-xl font-black">New Note</h2>
          <div className="flex items-center gap-2">
            <span className="hard-chip px-3 py-1.5 text-xs font-bold rounded-full">🎙️ Voice</span>
            <button
              onClick={() => setLang(l => l === "en-US" ? "bn-BD" : "en-US")}
              className="hard-chip px-3 py-1.5 text-xs font-bold rounded-full"
              title="Toggle language"
            >
              {lang === "en-US" ? "🇺🇸 EN" : "🇧🇩 BN"}
            </button>
          </div>
        </div>

        <p className="text-xs text-[var(--muted-fg)]">
          Live voice-to-text — words appear as you speak ({lang === "en-US" ? "English" : "বাংলা"})
        </p>

        {/* Subject tags */}
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-[var(--muted-fg)]">Subject Tag</p>
          <div className="flex flex-wrap gap-2 items-center">
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 border-[#1E293B] pl-3 pr-1.5 py-1 text-xs font-black transition-all ${
                  subject === s
                    ? "bg-[#1E293B] text-white shadow-[2px_2px_0_0_#1E293B]"
                    : "bg-white text-[#1E293B] shadow-[2px_2px_0_0_#1E293B] hover:bg-[#F8FAFC]"
                }`}
              >
                <span>{s}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => { e.stopPropagation(); removeTag(s); }}
                  onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); removeTag(s); } }}
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition ${
                    subject === s ? "hover:bg-red-500 hover:text-white" : "hover:bg-red-100 hover:text-red-600"
                  }`}
                >
                  <X size={10} strokeWidth={2.5} />
                </span>
              </button>
            ))}

            {showTagInput ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") addTag();
                    if (e.key === "Escape") { setShowTagInput(false); setNewTagInput(""); }
                  }}
                  placeholder="Tag name..."
                  className="w-28 rounded-full border-2 border-[var(--foreground)] bg-white px-3 py-1 text-xs font-bold outline-none"
                />
                <button onClick={addTag} className="candy-button inline-flex h-7 w-7 items-center justify-center rounded-full">
                  <Plus size={12} />
                </button>
                <button onClick={() => { setShowTagInput(false); setNewTagInput(""); }} className="text-[var(--muted-fg)]">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="hard-chip inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full"
              >
                <Plus size={11} /> New Tag
              </button>
            )}
          </div>
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={
            isCapturing ? "🎙️ Listening — speak now (words appear live)..."
            : "Type your note or use Record button for voice..."
          }
          rows={5}
          className="w-full resize-none rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-3 text-sm outline-none focus:border-[var(--accent)]"
        />

        <div className="flex gap-3 flex-wrap items-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`candy-button inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full disabled:opacity-60 ${isCapturing ? "!bg-red-500 !border-red-600" : ""}`}
          >
            {isCapturing ? <MicOff size={15} /> : <Mic size={15} />}
            {isCapturing ? "Stop Recording" : "Record"}
          </button>

          <button
            onClick={saveNote}
            disabled={saving || !content.trim()}
            className="secondary-button inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save Note"}
          </button>

          {content && (
            <button
              onClick={() => { setContent(""); finalTextRef.current = ""; existingContentRef.current = ""; }}
              className="text-xs font-semibold text-[var(--muted-fg)] hover:text-red-500 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="sticker-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-display text-xl font-black">
            Saved Notes <span className="text-base font-semibold text-[var(--muted-fg)]}">({filtered.length})</span>
          </h2>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="rounded-full border-2 border-[var(--foreground)] bg-white px-3 py-1.5 text-sm font-bold outline-none cursor-pointer"
          >
            <option value="All">All Subjects</option>
            {noteSubjects.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-fg)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)] py-2 pl-8 pr-10 text-sm outline-none focus:border-[var(--accent)]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-fg)]">
              <X size={13} />
            </button>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-[16px] border-2 border-dashed border-[var(--border)] p-8 text-center">
            <Tag size={28} className="mx-auto mb-3 text-[var(--muted-fg)]" />
            <p className="text-sm font-semibold text-[var(--muted-fg)]">
              {notes.length === 0 ? "No notes yet. Record or type your first note above." : "No notes match your filter."}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(note => (
            <div key={note.id} className="rounded-[16px] border-2 border-[var(--border)] bg-white p-4 space-y-2.5 shadow-[3px_3px_0_0_var(--border)]">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)] px-2.5 py-0.5 text-xs font-black">
                    {note.subject}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--muted-fg)]">
                    {note.source === "voice-whisper" ? "Whisper AI"
                     : note.source === "voice-web"   ? "Quick Voice"
                     : "Typed"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenQuizConfig(note)}
                    disabled={quizLoading === note.id}
                    className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6] px-2.5 py-1 text-xs font-bold hover:translate-y-[-1px] transition disabled:opacity-60"
                  >
                    <Zap size={11} />
                    {quizLoading === note.id ? "Generating..." : quizMap[note.id] ? "Hide Quiz" : "Quiz ⚡"}
                  </button>
                  <button onClick={() => deleteNote(note.id)} className="text-[var(--muted-fg)] hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>

              <p className="text-[10px] text-[var(--muted-fg)]">
                {new Date(note.created_at).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
              </p>

              {quizMap[note.id] && (
                <NoteQuizViewer quizData={quizMap[note.id]} onRetake={() => handleOpenQuizConfig(note)} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quiz Options Modal */}
      {configModalNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md space-y-5 rounded-[24px] border-2 border-[#1E293B] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
            <div className="flex items-center justify-between border-b-2 border-[#1E293B] pb-3">
              <h3 className="font-display text-xl font-black flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Configure Note Quiz
              </h3>
              <button
                onClick={() => setConfigModalNote(null)}
                className="rounded-full border-2 border-[#1E293B] p-1.5 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Question Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-fg)]">
                Question Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "mcq", label: "MCQ Options" },
                    { id: "short", label: "Short QA" },
                    { id: "broad", label: "Broad Essay" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setConfigType(t.id)}
                    className={`rounded-xl border-2 border-[#1E293B] py-2 text-xs font-black transition-all ${
                      configType === t.id
                        ? "bg-[#1E293B] text-white shadow-[2px_2px_0_0_#1E293B]"
                        : "bg-white text-[#1E293B] hover:bg-slate-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Questions Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--muted-fg)]">
                Number of Questions
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {([3, 5, 10] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => { setConfigCountPreset(cnt); setConfigCustomCount(String(cnt)); }}
                    className={`rounded-full border-2 border-[#1E293B] px-4 py-1.5 text-xs font-black transition-all ${
                      configCountPreset === cnt
                        ? "bg-[#FBBF24] text-[#1E293B] shadow-[2px_2px_0_0_#1E293B]"
                        : "bg-white text-[#1E293B] hover:bg-slate-50"
                    }`}
                  >
                    {cnt} Questions
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setConfigCountPreset("custom")}
                  className={`rounded-full border-2 border-[#1E293B] px-4 py-1.5 text-xs font-black transition-all ${
                    configCountPreset === "custom"
                      ? "bg-[#FBBF24] text-[#1E293B] shadow-[2px_2px_0_0_#1E293B]"
                      : "bg-white text-[#1E293B] hover:bg-slate-50"
                  }`}
                >
                  Custom
                </button>
              </div>

              {configCountPreset === "custom" && (
                <div className="pt-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={configCustomCount}
                    onChange={(e) => setConfigCustomCount(e.target.value)}
                    placeholder="Enter question count (1 to 20)..."
                    className="w-full rounded-xl border-2 border-[#1E293B] bg-white px-3.5 py-2 text-sm font-bold shadow-[2px_2px_0_0_#1E293B] outline-none"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfigModalNote(null)}
                className="rounded-full border-2 border-[#1E293B] bg-white px-4 py-2 text-xs font-black"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartQuizGeneration}
                className="rounded-full border-2 border-[#1E293B] bg-[#FBBF24] px-5 py-2 text-xs font-black shadow-[3px_3px_0_0_#1E293B] hover:translate-y-[-1px] transition"
              >
                Generate Quiz ⚡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
