"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ContactModal } from "@/components/ui/ContactModal";
import { Footer } from "@/components/ui/Footer";
import {
  BrainCircuit,
  BookOpen,
  CircleDollarSign,
  CirclePlay,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquareText,
  NotebookPen,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { APP_ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "./language-context";
import { useFocusContext } from "@/context/FocusContext";
import { translations } from "@/lib/translations";
import { trackGroqCall } from "@/lib/ai/groq";
import { getBdtDateString } from "@/lib/aiUsageLimiter";

const NAV_ITEMS = [
  { key: "navDashboard", href: APP_ROUTES.dashboard, icon: LayoutDashboard },
  { key: "navAcademic",  href: APP_ROUTES.academic,  icon: BookOpen },
  { key: "navFocus",     href: APP_ROUTES.focus,     icon: CirclePlay },
  { key: "navNotes",     href: APP_ROUTES.notes,     icon: NotebookPen },
  { key: "navFinance",   href: APP_ROUTES.finance,   icon: CircleDollarSign },
  { key: "navWellness",  href: APP_ROUTES.wellness,  icon: HeartPulse },
  { key: "navCoach",     href: APP_ROUTES.coach,     icon: BrainCircuit },
  { key: "navAnalytics", href: APP_ROUTES.analytics, icon: Sparkles },
] as const;

const STORAGE_KEY_GEMINI  = "academicAiKeyGeminiV1";
const STORAGE_KEY_GROQ    = "academicAiKeyGroqV1";
const STORAGE_AI_PROVIDER = "academicAiProviderV1";

type AiProvider   = "gemini" | "groq";
type ChatMessage  = { id: string; role: "user" | "assistant"; content: string };

const titleKeyMap: Record<string, keyof typeof translations.en> = {
  "Dashboard": "titleDashboard",
  "Academic Forge": "titleAcademic",
  "Focus Engine": "titleFocus",
  "Focus Lock": "titleFocus",
  "Smart Notes Vault": "titleNotes",
  "Student Finance Tracker": "titleFinance",
  "Student Finance": "titleFinance",
  "Wellness Shield": "titleWellness",
  "AI Behavioral Coach": "titleCoach",
  "3-Tier Productivity Analytics": "titleAnalytics",
  "Settings": "titleSettings",
};

export function AppShell({
  title,
  children,
  loading,
  skeleton,
  initialCollapsed,
  confirmLogout,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  skeleton?: React.ReactNode;
  initialCollapsed?: boolean;
  confirmLogout?: boolean;
}) {
  return (
    <ShellContent
      title={title}
      loading={loading}
      skeleton={skeleton}
      initialCollapsed={initialCollapsed}
      confirmLogout={confirmLogout}
    >
      {children}
    </ShellContent>
  );
}

function ShellContent({
  title,
  children,
  loading,
  skeleton,
  initialCollapsed,
  confirmLogout,
}: {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  skeleton?: React.ReactNode;
  initialCollapsed?: boolean;
  confirmLogout?: boolean;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const { lang } = useLanguage();
  const t = translations[lang];
  const focusContext = useFocusContext();

  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [collapsed,         setCollapsed]         = useState<boolean>(initialCollapsed ?? false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showFocusNavWarn,  setShowFocusNavWarn]  = useState(false);
  const [pendingNavHref,    setPendingNavHref]    = useState<string | null>(null);

  // ── AI Chat ──────────────────────────────────────────────────
  const [chatOpen,     setChatOpen]     = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: "m-1", role: "assistant",
    content: lang === "bn"
      ? "হাই! আমি আপনার Focusnyx AI সহকারী। স্টাডি স্ট্র্যাটেজি, রিভিশন প্ল্যান, বা যেকোনো প্রশ্ন করতে পারেন।"
      : "Hi! I'm your Focusnyx AI assistant. Ask me about study strategies, exam prep, revision plans, or anything academic.",
  }]);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── API keys ────────────────────────────────────────────────
  const [provider,    setProvider]    = useState<AiProvider>("groq");
  const [geminiKey,   setGeminiKey]   = useState("");
  const [groqKey,     setGroqKey]     = useState("");
  const [groqUsage,   setGroqUsage]   = useState(0);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const activeCustomKey = provider === "gemini" ? geminiKey.trim() : groqKey.trim();
  const hasCustomKey = Boolean(activeCustomKey && activeCustomKey.length > 10);

  useEffect(() => {
    async function loadKeys() {
      let g = "";
      let r = "";
      let p: AiProvider = "groq";

      try {
        g = localStorage.getItem(STORAGE_KEY_GEMINI) || "";
        r = localStorage.getItem(STORAGE_KEY_GROQ) || "";
        const prov = localStorage.getItem(STORAGE_AI_PROVIDER);
        if (prov === "gemini" || prov === "groq") p = prov;
      } catch {}

      // Fallback query to Supabase DB if cache was cleared
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const bdtDateString = getBdtDateString();
          
          if (user.user_metadata?.ai_usage_date === bdtDateString) {
            setGroqUsage(user.user_metadata?.ai_usage_count || 0);
          } else {
            setGroqUsage(0);
          }

          const { data: profile } = await sb
            .from("profiles")
            .select("groq_api_key, gemini_api_key, ai_provider")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            if (profile.groq_api_key) r = profile.groq_api_key;
            if (profile.gemini_api_key) g = profile.gemini_api_key;
            if (profile.ai_provider && (profile.ai_provider === "gemini" || profile.ai_provider === "groq")) {
              p = profile.ai_provider as AiProvider;
            }
          }
        }
      } catch {}

      if (g) setGeminiKey(g);
      if (r) setGroqKey(r);
      setProvider(p);

      try {
        if (g) localStorage.setItem(STORAGE_KEY_GEMINI, g);
        if (r) localStorage.setItem(STORAGE_KEY_GROQ, r);
        localStorage.setItem(STORAGE_AI_PROVIDER, p);
      } catch {}
    }

    void loadKeys();
  }, []);

  // No onAuthStateChange listener needed — middleware.ts already redirects
  // unauthenticated requests server-side. Listening here causes cross-tab
  // logout when signOut() broadcasts SIGNED_OUT to all tabs via shared storage.

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleLogout = async () => {
    if (confirmLogout && !showLogoutConfirm) { setShowLogoutConfirm(true); return; }
    // Clear session from storage directly — do NOT call signOut() which broadcasts
    // SIGNED_OUT to all open tabs via the shared Supabase storage event.
    try {
      const sb = createClient();
      // Remove the session without broadcasting to other tabs
      await sb.auth.signOut({ scope: "local" });
    } catch {}
    router.push(APP_ROUTES.auth);
  };

  const sendChat = async (overrideMsg?: string) => {
    const msg = (overrideMsg || chatInput).trim();
    if (!msg || chatLoading) return;
    const apiKey = provider === "gemini" ? geminiKey.trim() : groqKey.trim();
    const hasCustomKey = Boolean(apiKey && apiKey.length > 10);

    const FOCUSNYX_CHAT_SYSTEM_PROMPT = `You are the Focusnyx AI Academic & Productivity Assistant, designed strictly for university students using the Focusnyx app.

YOUR STRICT DOMAIN BOUNDARIES:
1. ALLOWED TOPICS (YOU MUST ONLY ANSWER THESE):
   - Focusnyx App Features & Support: Focus Lock, Pomodoro/Focus Session timer, Smart Notes, Quiz Generator, CGPA Momentum Tracker, Academic Study Planner, Student Allowance & Budget Tracker, Habit Patterns & Clusters, Wellness Shield, Productivity Analytics, Chrome Extension & Windows App sync.
   - Academic & Educational Topics: Mathematics, Computer Science, Programming, Software Engineering, Physics, Chemistry, Biology, Economics, Business & Finance, Literature, History, General Science, Language learning, Exam preparation, Homework help, Study techniques, Writing, Research guidance.
   - Student Productivity & Focus: Time management, overcoming procrastination, study schedules, focus habits, exam stress & mental clarity for studying.

2. STRICTLY FORBIDDEN TOPICS (YOU MUST REFUSE AND DECLINE TO ANSWER):
   - Pop culture, celebrity gossip, movies/TV shows/actors, sports scores & news, video game cheats & walkthroughs, general non-educational entertainment, political opinions, non-academic creative writing, non-study recipes, off-topic general chit-chat.

3. HOW TO DECLINE OFF-TOPIC QUESTIONS:
   - If the user asks ANY question outside of Focusnyx app features or educational/academic/study productivity topics, YOU MUST DECLINE IMMEDIATELY AND POLITELY.
   - Reply in the same language as the user's message (English or Bangla):
     - English response for off-topic query: "I am your Focusnyx Academic & Productivity Assistant. I can only answer questions related to Focusnyx app features, study planning, academic subjects, and productivity. Please ask an educational or Focusnyx-related question!"
     - Bangla response for off-topic query: "আমি আপনার Focusnyx একাডেমিক ও প্রডাক্টিভিটি অ্যাসিস্ট্যান্ট। আমি শুধুমাত্র Focusnyx অ্যাপের ফিচার, পড়ালেখা, পড়াশোনার প্ল্যান এবং একাডেমিক বিষয় সংক্রান্ত প্রশ্নের উত্তর দিতে পারি। দয়া করে শিক্ষামূলক বা অ্যাপ সম্পর্কিত প্রশ্ন করুন।"

4. TONE & STYLE:
   - Be concise, supportive, practical, and ADHD-friendly. Keep responses focused and readable.`;

    const userMsg = { id: `u-${Date.now()}`, role: "user" as const, content: msg };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      let text = "";
      if (provider === "gemini" && hasCustomKey) {
        const geminiContents = updatedMessages.slice(-10).map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: FOCUSNYX_CHAT_SYSTEM_PROMPT }] },
            contents: geminiContents
          }),
        });
        if (!res.ok) throw new Error("Gemini request failed.");
        const d = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      } else {
        const groqMessages = [
          { role: "system", content: FOCUSNYX_CHAT_SYSTEM_PROMPT },
          ...updatedMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        ];
        
        let res: Response;
        if (hasCustomKey) {
          res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: groqMessages, temperature: 0.3 }),
          });
        } else {
          res = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: groqMessages, temperature: 0.3 }),
          });
        }

        const d = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          const errObj = d.error || d.details || d;
          const msg = typeof errObj === "string" 
            ? errObj 
            : (errObj?.message || (typeof errObj?.error === "string" ? errObj.error : JSON.stringify(errObj)));
          throw new Error(msg || "AI request failed.");
        }
        
        if (!hasCustomKey && d.currentUsage !== undefined) {
          setGroqUsage(d.currentUsage);
        }

        text = d.choices?.[0]?.message?.content?.trim() ?? "";
        if (typeof text !== "string" || !text) {
          text = typeof d.text === "string" ? d.text : (typeof d.message === "string" ? d.message : "");
        }
        if (hasCustomKey) trackGroqCall();
      }
      setChatMessages(p => [...p, { id: `a-${Date.now()}`, role: "assistant", content: text || "No response." }]);
    } catch (e: any) {
      const errText = e instanceof Error ? e.message : (typeof e === "string" ? e : (e?.message || JSON.stringify(e)));
      setChatMessages(p => [...p, { id: `a-${Date.now()}`, role: "assistant", content: errText || "Unable to chat right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const sidebarW = collapsed ? "lg:w-[72px]" : "lg:w-[260px]";
  const mainML   = collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]";

  const pageTitleKey = titleKeyMap[title];
  const displayTitle = pageTitleKey && t[pageTitleKey] ? String(t[pageTitleKey]) : title;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffffff_40%,#f8fafc_100%)] text-[var(--foreground)] lg:flex font-body">

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b-2 border-[var(--foreground)] bg-white/95 px-4 py-3 shadow-[0_4px_0_0_#1E293B] backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarOpen(v => !v)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--foreground)] bg-white"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={18} strokeWidth={2.5} /> : <Menu size={18} strokeWidth={2.5} />}
        </button>
        <Link href={APP_ROUTES.dashboard} className="flex items-center gap-2.5">
          <Image src="/icons/focusnyx.png" alt="Focusnyx" width={36} height={36}
            className="h-9 w-9 rounded-xl border-2 border-[var(--foreground)] object-cover shadow-[3px_3px_0_0_#1E293B]" />
          <div>
            <p className="font-display text-base font-black leading-none">Focusnyx</p>
            <p className="text-[11px] font-semibold text-[var(--muted-fg)]">{displayTitle}</p>
          </div>
        </Link>
      </header>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-30 flex h-screen flex-col border-r-2 border-[var(--foreground)] bg-white shadow-[4px_0_0_0_#1E293B] transition-all duration-300 ${sidebarW} ${sidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0"}`}>

        {/* Logo row */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b-2 border-[var(--foreground)] px-3">
          {!collapsed && (
            <Link href={APP_ROUTES.dashboard} className="flex min-w-0 items-center gap-2.5">
              <Image src="/icons/focusnyx.png" alt="Focusnyx" width={40} height={40}
                className="h-10 w-10 shrink-0 rounded-xl border-2 border-[var(--foreground)] object-cover shadow-[3px_3px_0_0_#1E293B]" />
              <div className="min-w-0">
                <p className="font-display text-lg font-black leading-none">Focusnyx</p>
                <p className="truncate text-[11px] font-semibold text-[var(--muted-fg)]">Student Life OS</p>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className={`hidden shrink-0 place-items-center rounded-[10px] border-2 border-[var(--foreground)] p-1.5 hover:bg-[var(--muted)] lg:grid ${collapsed ? "mx-auto" : ""}`}
            aria-label="Collapse sidebar"
          >
            <Menu size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
            const active = pathname === href;
            const label = String(t[key] ?? key);
            const isFocusPage = href === APP_ROUTES.focus;
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={(e) => {
                  // If focus is locked and navigating away from focus page, warn user
                  if (focusContext?.isLocked && pathname === APP_ROUTES.focus && !isFocusPage) {
                    e.preventDefault();
                    setPendingNavHref(href);
                    setShowFocusNavWarn(true);
                    return;
                  }
                  setSidebarOpen(false);
                }}
                title={collapsed ? label : undefined}
                className={`flex items-center rounded-[14px] border-2 border-[var(--foreground)] px-3 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_#1E293B] transition-all hover:shadow-[5px_5px_0_0_#1E293B] ${active ? "bg-[var(--foreground)] text-white" : "bg-white"} ${collapsed ? "lg:justify-center" : "gap-3"}`}
              >
                <Icon size={17} strokeWidth={2.5} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className={`shrink-0 border-t-2 border-[var(--foreground)] px-3 py-4 space-y-2 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <Link
            href="/settings"
            prefetch={true}
            title={collapsed ? String(t.navSettings) : undefined}
            className={`flex items-center rounded-[14px] border-2 border-[var(--foreground)] bg-[#FFF7D6] px-3 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_#1E293B] transition hover:translate-y-[-1px] ${collapsed ? "justify-center w-full" : "gap-3 w-full"}`}
          >
            <Settings2 size={17} strokeWidth={2.5} className="shrink-0" />
            {!collapsed && String(t.navSettings)}
          </Link>
          {!focusContext?.isLocked && (
            <button
              onClick={handleLogout}
              title={collapsed ? String(t.navLogout) : undefined}
              className={`flex items-center rounded-[14px] border-2 border-[var(--foreground)] bg-[#FDF2F8] px-3 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_#1E293B] transition hover:translate-y-[-1px] ${collapsed ? "justify-center w-full" : "gap-3 w-full"}`}
            >
              <LogOut size={17} strokeWidth={2.5} className="shrink-0" />
              {!collapsed && String(t.navLogout)}
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={`flex-1 transition-[margin] duration-300 flex flex-col ${mainML}`}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 flex-1 shrink-0">
          <header className="mb-6 flex shrink-0 items-center justify-between gap-4 rounded-[28px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Focusnyx</p>
              <h1 className="mt-1 font-display text-3xl font-black sm:text-4xl">{displayTitle}</h1>
            </div>
            <ModeTogglePill />
          </header>
          {loading && skeleton ? skeleton : children}

          </div>
          {/* ── Global App Footer ── */}
          <div className="mt-auto pt-12">
            <Footer onContactClick={() => setIsContactOpen(true)} lang={lang} />
          </div>
      </main>

      {/* ── Focus lock navigation warning ── */}
      {showFocusNavWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
            <h3 className="text-xl font-black">🔒 Focus Lock Active</h3>
            <p className="mt-2 text-sm text-[var(--muted-fg)]">
              Your Pomodoro timer is running. Navigating away will keep the timer running in the background — your progress will be saved. The focus lock will remain active.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowFocusNavWarn(false); setPendingNavHref(null); }}
                className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold"
              >
                Stay on Focus
              </button>
              <button
                onClick={() => {
                  setShowFocusNavWarn(false);
                  setSidebarOpen(false);
                  if (pendingNavHref) router.push(pendingNavHref as any);
                  setPendingNavHref(null);
                }}
                className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout confirm ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
            <h3 className="text-xl font-black">{String(t.confirmLogoutTitle)}</h3>
            <p className="mt-2 text-sm text-[var(--muted-fg)]">{String(t.confirmLogoutBody)}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold">{String(t.confirmLogoutCancel)}</button>
              <button onClick={() => { setShowLogoutConfirm(false); void handleLogout(); }} className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold">{String(t.navLogout)}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating AI Chat ── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {chatOpen && (
          <div className="flex h-[480px] w-[340px] flex-col rounded-[24px] border-2 border-[var(--foreground)] bg-white shadow-[8px_8px_0_0_#1E293B]">
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Image src="/icons/focusnyx.png" alt="Focusnyx" width={24} height={24} className="rounded-md border border-[var(--foreground)] shadow-[1px_1px_0_0_#1E293B]" />
                <div>
                  <p className="font-display text-base font-black leading-none">Focusnyx AI</p>
                  {!hasCustomKey ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-block h-2 w-2 rounded-full ${groqUsage >= 5 ? "bg-red-500" : "bg-emerald-500"} animate-pulse`} />
                      <p className={`text-[10px] font-bold ${groqUsage >= 5 ? "text-red-600" : "text-amber-600"}`}>
                        {groqUsage}/5 Free AI Calls Used
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-emerald-600 mt-1">✨ Unlimited ({provider === "gemini" ? "Gemini" : "Groq"} BYOK)</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setChatOpen(false)} className="rounded-full border-2 border-[var(--foreground)] p-1.5 hover:bg-gray-100 transition" title="Minimize"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                <button onClick={() => setChatOpen(false)} className="rounded-full border-2 border-[var(--foreground)] p-1.5 hover:bg-gray-100 transition"><X size={14} /></button>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {chatMessages.map(m => (
                <div key={m.id} className={`max-w-[88%] rounded-[12px] border-2 border-[var(--foreground)] px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-[#ECFDF5]" : "bg-white"}`}>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--muted-fg)]">{m.role === "user" ? (lang === "bn" ? "আপনি" : "You") : "AI"}</p>
                  <p className="mt-0.5 whitespace-pre-wrap leading-5">{m.content}</p>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-1.5 px-1 py-2">
                  {[0, 150, 300].map(d => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-[var(--muted-fg)]" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t-2 border-[var(--border)] p-3">
              {!hasCustomKey && groqUsage >= 5 && (
                <p className="mb-2 rounded-[10px] border-2 border-amber-400 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700">
                  Daily free limit reached (5/5). Resets at 12:00 AM BDT. Add your own Groq/Gemini API key in Settings for unlimited AI usage!
                </p>
              )}
              
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  "How do I build a study habit?",
                  "What is the Pomodoro technique?",
                  "Summarize my weekly progress.",
                  "Tips to avoid burnout?"
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setChatInput(q);
                      setTimeout(() => sendChat(q), 50);
                    }}
                    className="whitespace-nowrap rounded-full border-2 border-[var(--foreground)] bg-gray-50 px-3 py-1.5 text-[10px] font-bold text-[var(--muted-fg)] transition hover:bg-gray-100 hover:text-gray-900"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChat(); } }}
                  placeholder={lang === "bn" ? "যেকোনো প্রশ্ন করুন..." : "Ask anything..."}
                  className="flex-1 rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
                />
                <button 
                  onClick={() => void sendChat()} 
                  disabled={chatLoading || (!hasCustomKey && groqUsage >= 5)} 
                  className="candy-button inline-flex h-10 w-10 items-center justify-center disabled:opacity-50"
                  title="Send message"
                >
                  <Send size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen(v => !v)}
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B] transition hover:translate-y-[-2px]"
          aria-label="Open AI chat"
        >
          {chatOpen ? <X size={20} strokeWidth={2.5} /> : <MessageCircle size={20} strokeWidth={2.5} />}
        </button>
      </div>

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}

function ModeTogglePill({ compact = false }: { compact?: boolean }) {
  const { interactionMode, setInteractionMode } = useLanguage();
  const isAdhd = interactionMode === "adhd";

  if (compact) {
    return (
      <button
        onClick={() => setInteractionMode(isAdhd ? "standard" : "adhd")}
        className={`flex w-full items-center justify-center gap-1 rounded-[12px] border-2 border-[var(--foreground)] px-2 py-2 text-xs font-black shadow-[3px_3px_0_0_#1E293B] transition hover:translate-y-[-1px] ${
          isAdhd ? "bg-[#8B5CF6] text-white" : "bg-white text-[var(--foreground)]"
        }`}
        title={`Current mode: ${isAdhd ? "ADHD Mode" : "Standard Mode"}. Click to switch.`}
      >
        {isAdhd ? "⚡ ADHD" : "Standard"}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-full border-2 border-[var(--foreground)] bg-[#F8FAFC] p-1 shadow-[3px_3px_0_0_#1E293B]">
      <button
        type="button"
        onClick={() => setInteractionMode("standard")}
        className={`rounded-full px-3 py-1.5 text-xs font-black transition-all duration-200 ${
          !isAdhd
            ? "bg-[var(--foreground)] text-white shadow-sm"
            : "text-[var(--muted-fg)] hover:text-gray-900"
        }`}
      >
        Standard
      </button>
      <button
        type="button"
        onClick={() => setInteractionMode("adhd")}
        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black transition-all duration-200 ${
          isAdhd
            ? "bg-[#8B5CF6] text-white shadow-sm"
            : "text-[var(--muted-fg)] hover:text-purple-700"
        }`}
      >
        ⚡ ADHD
      </button>
    </div>
  );
}
