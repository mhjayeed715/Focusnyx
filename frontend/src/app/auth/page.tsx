"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncDashboardProfile } from "@/lib/backend";

type Lang = "en" | "bn";

const copy = {
  en: {
    title: "Welcome back",
    subtitle: "Login with your email and password.",
    email: "Email",
    password: "Password",
    submit: "Login",
    switchText: "New here?",
    switchLink: "Create an account",
    back: "Back to Home",
    helper: "Use your password to sign in. OTP is only for new account verification after signup.",
  },
  bn: {
    title: "ফিরে স্বাগতম",
    subtitle: "ইমেইল এবং পাসওয়ার্ড দিয়ে লগইন করুন।",
    email: "ইমেইল",
    password: "পাসওয়ার্ড",
    submit: "লগইন",
    switchText: "নতুন ব্যবহারকারী?",
    switchLink: "অ্যাকাউন্ট তৈরি করুন",
    back: "হোমে ফিরুন",
    helper: "পাসওয়ার্ড দিয়ে সাইন ইন করুন। OTP শুধু নতুন অ্যাকাউন্ট যাচাইয়ের জন্য থাকবে।",
  },
} satisfies Record<Lang, Record<string, string>>;

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [registeredMessage, setRegisteredMessage] = useState<null | { text: string }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lang");
      if (saved === "en" || saved === "bn") {
        setLang(saved);
      }
    } catch (e) {
      // ignore
    }

    try {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      if (params?.get("registered") === "1") {
        setRegisteredMessage({
          text: params.get("mode") === "login" ? "Check your email for the login code." : "Check your email to confirm your account.",
        });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      const fullName = data.user?.user_metadata?.full_name || data.user?.email?.split("@")[0] || email.split("@")[0];

      try {
        localStorage.setItem("user", email || "demo-user");
        if (fullName) {
          localStorage.setItem("userFullName", fullName);
        }
      } catch (storageError) {
        // ignore
      }

      try {
        await syncDashboardProfile();
      } catch {
        // ignore backend sync failures here; the dashboard reconciles on load.
      }

      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to login.");
    } finally {
      setSubmitting(false);
    }
  }

  const t = copy[lang];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffffff_45%,#f7fafc_100%)] px-6 py-8 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border-2 border-[var(--foreground)] bg-white shadow-[10px_10px_0_0_#1E293B] lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="relative hidden overflow-hidden bg-[var(--foreground)] p-8 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 opacity-20" aria-hidden="true">
              <div className="absolute left-6 top-6 h-24 w-24 rounded-full bg-[#FBBF24]" />
              <div className="absolute right-8 top-24 h-14 w-14 rounded-full bg-[#34D399]" />
              <div className="absolute bottom-10 left-1/3 h-20 w-20 rounded-full bg-[#F472B6]" />
            </div>
            <div className="relative">
              <div className="mb-5 flex items-center gap-3">
                <Image
                  src="/icons/focusnyx.png"
                  alt="Focusnyx"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-xl border-2 border-[var(--foreground)] bg-white object-cover shadow-[4px_4px_0_0_#1E293B]"
                />
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.28em] text-white/70">Focusnyx</p>
                  <p className="mt-2 font-display text-2xl font-black leading-[0.95]">Student Life OS</p>
                </div>
              </div>
              <p className="mt-2 max-w-md text-base leading-7 text-white/85">Bangla-first tools for focus, academics, finance, and wellness.</p>
            </div>
            <div className="relative space-y-3 text-sm font-semibold text-white/80">
              <p>• ADHD-friendly workflow</p>
              <p>• Bangla and English support</p>
              <p>• Clean dashboard after login</p>
            </div>
          </aside>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <Link href="/" className="text-sm font-bold text-[var(--muted-fg)] transition hover:text-[var(--foreground)]">
                {t.back}
              </Link>
              <div className="inline-flex h-11 min-w-[8.5rem] items-center rounded-full border-2 border-[var(--foreground)] bg-white p-1 shadow-[4px_4px_0_0_#1E293B]">
                <button onClick={() => setLang("en")} aria-pressed={lang === "en"} className={`nav-pill flex h-8 min-w-[4rem] items-center justify-center px-3 text-xs font-black ${lang === "en" ? "bg-[var(--foreground)] text-white" : ""}`}>
                  EN
                </button>
                <button onClick={() => setLang("bn")} aria-pressed={lang === "bn"} className={`nav-pill flex h-8 min-w-[4rem] items-center justify-center px-3 text-xs font-black ${lang === "bn" ? "bg-[var(--foreground)] text-white" : ""}`}>
                  BN
                </button>
              </div>
            </div>

            <div className="max-w-lg">
              {registeredMessage ? (
                <div className="mb-4 rounded-lg border-2 border-[var(--foreground)] bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#065F46] shadow-[2px_2px_0_0_#1E293B]">
                  {registeredMessage.text}
                </div>
              ) : null}
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6] px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#1E293B]">
                ✦ {t.title}
              </div>
              <h2 className="mt-5 font-display text-3xl font-black tracking-tight sm:text-4xl">{t.title}</h2>
              <p className="mt-3 text-base leading-7 text-[var(--muted-fg)]">{t.subtitle}</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{t.email}</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="yourname@gmail.com"
                    className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 text-base shadow-[4px_4px_0_0_#1E293B] outline-none transition placeholder:text-slate-400 focus:translate-y-[-1px]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{t.password}</label>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 pr-24 text-base shadow-[4px_4px_0_0_#1E293B] outline-none transition placeholder:text-slate-400 focus:translate-y-[-1px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-xl border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 text-xs font-black shadow-[2px_2px_0_0_#1E293B]"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {error ? <p className="rounded-2xl border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

                <button disabled={submitting} type="submit" className="candy-button flex h-14 w-full items-center justify-center text-base font-black disabled:cursor-not-allowed disabled:opacity-70">
                  {t.submit}
                </button>
              </form>

              <p className="mt-5 text-sm text-[var(--muted-fg)]">
                {t.switchText} <Link href="/signup" className="font-black text-[var(--foreground)] underline decoration-2 underline-offset-4">{t.switchLink}</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}