"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrainCircuit, BookOpen, CircleDollarSign, CirclePlay, HeartPulse, LayoutDashboard, LogOut, Menu, NotebookPen, Sparkles, X } from "lucide-react";
import { APP_ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import { LanguageProvider, useLanguage } from "./language-context";

const NAV_ITEMS = [
  { label: "Dashboard", href: APP_ROUTES.dashboard, icon: LayoutDashboard },
  { label: "Academic", href: APP_ROUTES.academic, icon: BookOpen },
  { label: "Focus", href: APP_ROUTES.focus, icon: CirclePlay },
  { label: "Notes", href: APP_ROUTES.notes, icon: NotebookPen },
  { label: "Finance", href: APP_ROUTES.finance, icon: CircleDollarSign },
  { label: "Wellness", href: APP_ROUTES.wellness, icon: HeartPulse },
  { label: "Coach", href: APP_ROUTES.coach, icon: BrainCircuit },
  { label: "Analytics", href: APP_ROUTES.analytics, icon: Sparkles },
];

export function AppShell({
  title,
  children,
  initialCollapsed,
  confirmLogout,
}: {
  title: string;
  children: React.ReactNode;
  initialCollapsed?: boolean;
  confirmLogout?: boolean;
}) {
  return (
    <LanguageProvider>
      <ShellContent title={title} children={children} initialCollapsed={initialCollapsed} confirmLogout={confirmLogout} />
    </LanguageProvider>
  );
}

function ShellContent({
  title,
  children,
  initialCollapsed,
  confirmLogout,
}: {
  title: string;
  children: React.ReactNode;
  initialCollapsed?: boolean;
  confirmLogout?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed ?? false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { lang, setLang } = useLanguage();

  const handleLogout = async () => {
    if (confirmLogout) {
      setShowLogoutConfirm(true);
      return;
    }

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    router.push(APP_ROUTES.auth);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffffff_40%,#f8fafc_100%)] text-[var(--foreground)] lg:flex">
      <header className="sticky top-0 z-40 border-b-2 border-[var(--foreground)] bg-white/95 shadow-[0_4px_0_0_#1E293B] backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((value) => !value)}
              className="rounded-lg border-2 border-[var(--foreground)] p-2"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href={APP_ROUTES.dashboard} className="flex items-center gap-3">
              <Image
                src="/icons/focusnyx.png"
                alt="Focusnyx"
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl border-2 border-[var(--foreground)] object-cover shadow-[4px_4px_0_0_#1E293B]"
              />
              <div>
                <p className="font-display text-lg font-black leading-none">Focusnyx</p>
                <p className="text-xs font-semibold text-[var(--muted-fg)]">{title}</p>
              </div>
            </Link>
          </div>

          <div className="inline-flex h-9 min-w-[7rem] items-center rounded-full border-2 border-[var(--foreground)] bg-white p-1 shadow-[4px_4px_0_0_#1E293B]">
            <button onClick={() => setLang("en")} aria-pressed={lang === "en"} className={`nav-pill flex h-6 min-w-[3rem] items-center justify-center px-2 text-xs font-black ${lang === "en" ? "bg-[var(--foreground)] text-white" : ""}`}>
              EN
            </button>
            <button onClick={() => setLang("bn")} aria-pressed={lang === "bn"} className={`nav-pill flex h-6 min-w-[3rem] items-center justify-center px-2 text-xs font-black ${lang === "bn" ? "bg-[var(--foreground)] text-white" : ""}`}>
              BN
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen ? <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-screen flex-col border-r-2 border-[var(--foreground)] bg-white px-4 py-5 shadow-[4px_0_0_0_#1E293B] transition-all duration-300 ${collapsed ? "lg:w-[92px]" : "lg:w-[280px]"} ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <Link href={APP_ROUTES.dashboard} className="flex items-center gap-3 overflow-hidden">
            <Image
              src="/icons/focusnyx.png"
              alt="Focusnyx"
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-xl border-2 border-[var(--foreground)] object-cover shadow-[4px_4px_0_0_#1E293B]"
            />
            {!collapsed ? (
              <div>
                <p className="font-display text-xl font-black leading-none">Focusnyx</p>
                <p className="text-xs font-semibold text-[var(--muted-fg)]">Student Life OS</p>
              </div>
            ) : null}
          </Link>

          <button
            onClick={() => setCollapsed((value) => !value)}
            className="hidden rounded-lg border-2 border-[var(--foreground)] p-2 hover:bg-[var(--muted)] lg:grid"
            aria-label="Collapse sidebar"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="mt-6 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-pill flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-bold shadow-[4px_4px_0_0_#1E293B] transition-all duration-200 hover:shadow-[6px_6px_0_0_#1E293B] ${active ? "bg-[var(--foreground)] text-white" : "bg-white"} ${collapsed ? "lg:justify-center lg:px-3" : ""}`}
              >
                <Icon size={18} strokeWidth={2.5} />
                {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-6 rounded-[24px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4 shadow-[4px_4px_0_0_#1E293B] ${collapsed ? "lg:p-3" : ""}`}>
          <div className={`flex items-center gap-3 ${collapsed ? "lg:justify-center" : ""}`}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
              <Sparkles size={18} strokeWidth={2.5} />
            </span>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{title}</p>
                <p className="text-xs font-semibold text-[var(--muted-fg)]">Current focus area</p>
              </div>
            ) : null}
          </div>
        </div>

        <button onClick={handleLogout} className={`mt-4 flex items-center justify-center gap-2 rounded-[18px] border-2 border-[var(--foreground)] bg-[#FDF2F8] px-4 py-3 font-bold text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B] transition hover:translate-y-[-2px] ${collapsed ? "lg:px-3" : ""}`}>
          <LogOut size={16} strokeWidth={2.5} />
          {!collapsed ? "Logout" : <span className="sr-only">Logout</span>}
        </button>

        {showLogoutConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B]">
              <h3 className="text-xl font-black">Confirm logout?</h3>
              <p className="mt-2 text-sm text-[var(--muted-fg)]">Your dashboard state is stored on the backend. You can safely sign out now.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold">
                  Cancel
                </button>
                <button onClick={handleLogout} className="candy-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] px-4 py-3 font-bold">
                  Logout
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>

      <main className={`flex-1 pb-10 transition-[margin] lg:pb-12 ${collapsed ? "lg:ml-[92px]" : "lg:ml-[280px]"}`}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-6 rounded-[28px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{title}</p>
                <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">{title}</h1>
              </div>
              <div className="hidden h-10 items-center rounded-full border-2 border-[var(--foreground)] bg-white p-1 shadow-[4px_4px_0_0_#1E293B] sm:inline-flex">
                <button onClick={() => setLang("en")} aria-pressed={lang === "en"} className={`nav-pill flex h-7 min-w-[3.25rem] items-center justify-center px-3 text-xs font-black ${lang === "en" ? "bg-[var(--foreground)] text-white" : ""}`}>
                  EN
                </button>
                <button onClick={() => setLang("bn")} aria-pressed={lang === "bn"} className={`nav-pill flex h-7 min-w-[3.25rem] items-center justify-center px-3 text-xs font-black ${lang === "bn" ? "bg-[var(--foreground)] text-white" : ""}`}>
                  BN
                </button>
              </div>
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
