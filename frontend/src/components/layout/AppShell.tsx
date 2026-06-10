"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BrainCircuit,
  BookOpen,
  CircleDollarSign,
  CirclePlay,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  NotebookPen,
  Send,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { APP_ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import { LanguageProvider } from "./language-context";
import { LanguageToggle } from "./LanguageToggle";
import { trackGroqCall } from "@/lib/ai/groq";

const NAV_ITEMS = [
  { label: "Dashboard", href: APP_ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Academic",  href: APP_ROUTES.academic,  icon: BookOpen },
  { label: "Focus",     href: APP_ROUTES.focus,     icon: CirclePlay },
  { label: "Notes",     href: APP_ROUTES.notes,     icon: NotebookPen },
  { label: "Finance",   href: APP_ROUTES.finance,   icon: CircleDollarSign },
  { label: "Wellness",  href: APP_ROUTES.wellness,  icon: HeartPulse },
  { label: "Coach",     href: APP_ROUTES.coach,     icon: BrainCircuit },
  { label: "Analytics", href: APP_ROUTES.analytics, icon: Sparkles },
];

const STORAGE_KEY_GEMINI  = "academicAiKeyGeminiV1";
const STORAGE_KEY_GROQ    = "academicAiKeyGroqV1";
const STORAGE_AI_PROVIDER = "academicAiProviderV1";

type AiProvider   = "gemini" | "groq";
type ChatMessage  = { id: string; role: "user" | "assistant"; content: string };

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
  /** When true, renders `skeleton` instead of children */
  loading?: boolean;
  /** Skeleton node shown while loading */
  skeleton?: React.ReactNode;
  initialCollapsed?: boolean;
  confirmLogout?: boolean;
}) {
  return (
    <LanguageProvider>
      <ShellContent
        title={title}
        loading={loading}
        skeleton={skeleton}
        initialCollapsed={initialCollapsed}
        confirmLogout={confirmLogout}
      >
        {children}
      </ShellContent>
    </LanguageProvider>
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

  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [collapsed,         setCollapsed]         = useState<boolean>(initialCollapsed ?? false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── AI Chat ──────────────────────────────────────────────────
  const [chatOpen,     setChatOpen]     = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: "m-1", role: "assistant",
    content: "Hi! I'm your Focusnyx AI assistant. Ask me about study strategies, exam prep, revision plans, or anything academic.",
  }]);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── API keys (read-only here — Settings page owns writes) ────
  const [provider,    setProvider]    = useState<AiProvider>("groq");
  const [geminiKey,   setGeminiKey]   = useState("");
  const [groqKey,     setGroqKey]     = useState("");

  useEffect(() => {
    try {
      const g = localStorage.getItem(STORAGE_KEY_GEMINI);   if (g) setGeminiKey(g);
      const r = localStorage.getItem(STORAGE_KEY_GROQ);     if (r) setGroqKey(r);
      const p = localStorage.getItem(STORAGE_AI_PROVIDER);
      if (p === "gemini" || p === "groq") setProvider(p);
    } catch {}
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const handleLogout = async () => {
    if (confirmLogout && !showLogoutConfirm) { setShowLogoutConfirm(true); return; }
    try { const sb = createClient(); await sb.auth.signOut(); } catch {}
    router.push(APP_ROUTES.auth);
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const apiKey = provider === "gemini" ? geminiKey.trim() : groqKey.trim();
    if (!apiKey) {
      setChatMessages(p => [...p, { id: `a-${Date.now()}`, role: "assistant", content: "Please add your API key in Settings before chatting." }]);
      return;
    }
    setChatMessages(p => [...p, { id: `u-${Date.now()}`, role: "user", content: msg }]);
    setChatInput("");
    setChatLoading(true);
    const sys = "You are an AI assistant for Bangladeshi university students using the Focusnyx app. Be concise, practical, ADHD-friendly.";
    try {
      let text = "";
      if (provider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: `${sys}\n\n${msg}` }] }] }),
        });
        if (!res.ok) throw new Error("Gemini request failed.");
        const d = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
      } else {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "system", content: sys }, { role: "user", content: msg }], temperature: 0.4 }),
        });
        if (!res.ok) throw new Error("Groq request failed.");
        const d = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        text = d.choices?.[0]?.message?.content?.trim() ?? "";
        trackGroqCall();
      }
      setChatMessages(p => [...p, { id: `a-${Date.now()}`, role: "assistant", content: text || "No response." }]);
    } catch (e) {
      setChatMessages(p => [...p, { id: `a-${Date.now()}`, role: "assistant", content: e instanceof Error ? e.message : "Unable to chat right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const sidebarW = collapsed ? "lg:w-[72px]" : "lg:w-[260px]";
  const mainML   = collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffffff_40%,#f8fafc_100%)] text-[var(--foreground)] lg:flex">
      <LanguageToggle className="fixed right-4 top-4 z-50" />

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
            <p className="text-[11px] font-semibold text-[var(--muted-fg)]">{title}</p>
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
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
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
            title={collapsed ? "Settings" : undefined}
            className={`flex items-center rounded-[14px] border-2 border-[var(--foreground)] bg-[#FFF7D6] px-3 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_#1E293B] transition hover:translate-y-[-1px] ${collapsed ? "justify-center w-full" : "gap-3 w-full"}`}
          >
            <Settings2 size={17} strokeWidth={2.5} className="shrink-0" />
            {!collapsed && "Settings"}
          </Link>
          <button
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center rounded-[14px] border-2 border-[var(--foreground)] bg-[#FDF2F8] px-3 py-2.5 text-sm font-bold shadow-[3px_3px_0_0_#1E293B] transition hover:translate-y-[-1px] ${collapsed ? "justify-center w-full" : "gap-3 w-full"}`}
          >
            <LogOut size={17} strokeWidth={2.5} className="shrink-0" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={`flex-1 pb-10 transition-[margin] duration-300 lg:pb-12 ${mainML}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-6 rounded-[28px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Focusnyx</p>
            <h1 className="mt-1 font-display text-3xl font-black sm:text-4xl">{title}</h1>
          </header>
          {loading && skeleton ? skeleton : children}
        </div>
      </main>

      {/* ── Logout confirm ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
            <h3 className="text-xl font-black">Confirm logout?</h3>
            <p className="mt-2 text-sm text-[var(--muted-fg)]">Your data is stored on the backend. You can safely sign out.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold">Cancel</button>
              <button onClick={() => { setShowLogoutConfirm(false); void handleLogout(); }} className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold">Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating AI Chat ── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {chatOpen && (
          <div className="flex h-[480px] w-[340px] flex-col rounded-[24px] border-2 border-[var(--foreground)] bg-white shadow-[8px_8px_0_0_#1E293B]">
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--border)] px-4 py-3">
              <div>
                <p className="font-display text-base font-black">Focusnyx AI</p>
                <p className="text-xs font-semibold text-[var(--muted-fg)]">{provider.toUpperCase()}</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="rounded-full border-2 border-[var(--foreground)] p-1.5"><X size={14} /></button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {chatMessages.map(m => (
                <div key={m.id} className={`max-w-[88%] rounded-[12px] border-2 border-[var(--foreground)] px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-[#ECFDF5]" : "bg-white"}`}>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[var(--muted-fg)]">{m.role === "user" ? "You" : "AI"}</p>
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
              {!groqKey && !geminiKey && (
                <p className="mb-2 rounded-[10px] border-2 border-amber-400 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700">Add API key in Settings first.</p>
              )}
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChat(); } }}
                  placeholder="Ask anything..."
                  className="flex-1 rounded-[12px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm outline-none"
                />
                <button onClick={() => void sendChat()} disabled={chatLoading || (!groqKey && !geminiKey)} className="candy-button inline-flex h-10 w-10 items-center justify-center disabled:opacity-50">
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
    </div>
  );
}
