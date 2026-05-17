"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Lang = "en" | "bn";

const copy = {
  en: {
    title: "Create your account",
    subtitle: "Join Focusnyx — create a password, then verify with a one-time code.",
    fullName: "Full name",
    email: "Email",
    password: "Password",
    submit: "Create account",
    helper: "Your account is created with a password, then we verify your email with a 6-digit code.",
    switchText: "Already have an account?",
    switchLink: "Login",
    back: "Back to Home",
    benefits: ["Personal dashboard", "Bangla + English UI", "Focus streaks and XP"],
  },
  bn: {
    title: "অ্যাকাউন্ট তৈরি করুন",
    subtitle: "Focusnyx-এ যোগ দিন — পাসওয়ার্ড তৈরি করুন, তারপর OTP দিয়ে যাচাই করুন।",
    fullName: "পুরো নাম",
    email: "ইমেইল",
    password: "পাসওয়ার্ড",
    submit: "অ্যাকাউন্ট তৈরি করুন",
    helper: "আপনার অ্যাকাউন্ট পাসওয়ার্ড দিয়ে তৈরি হবে, তারপর আমরা ৬ অঙ্কের কোড দিয়ে ইমেইল যাচাই করব।",
    switchText: "ইতিমধ্যে অ্যাকাউন্ট আছে?",
    switchLink: "লগইন",
    back: "হোমে ফিরুন",
    benefits: ["ব্যক্তিগত ড্যাশবোর্ড", "বাংলা + ইংরেজি UI", "ফোকাস স্ট্রিক ও XP"],
  },
} satisfies Record<Lang, Record<string, string | string[]>>;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
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
  }, []);

  const t = copy[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name || undefined } },
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push(`/signup/verify?email=${encodeURIComponent(email)}&registered=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start verification.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fdf2f8_0%,#ffffff_42%,#f8fafc_100%)] px-6 py-8 text-[var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border-2 border-[var(--foreground)] bg-white shadow-[10px_10px_0_0_#1E293B] lg:grid-cols-[1.05fr_0.95fr]">
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
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-[#FFF7D6] px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#1E293B]">
                ✦ {t.title as string}
              </div>
              <h2 className="mt-5 font-display text-3xl font-black tracking-tight sm:text-4xl">{t.title as string}</h2>
              <p className="mt-3 text-base leading-7 text-[var(--muted-fg)]">{t.subtitle as string}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                {(t.benefits as string[]).map((benefit) => (
                  <span key={benefit} className="hard-chip px-4 py-2 text-sm font-bold">
                    {benefit}
                  </span>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{t.fullName as string}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jayeed Rahman"
                    className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 text-base shadow-[4px_4px_0_0_#1E293B] outline-none transition placeholder:text-slate-400 focus:translate-y-[-1px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{t.email as string}</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="yourname@gmail.com"
                    className="w-full rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3.5 text-base shadow-[4px_4px_0_0_#1E293B] outline-none transition placeholder:text-slate-400 focus:translate-y-[-1px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{t.password as string}</label>
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
                {error && <p className="rounded-2xl border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

                <button disabled={submitting} type="submit" className="candy-button flex h-14 w-full items-center justify-center text-base font-black disabled:cursor-not-allowed disabled:opacity-70">
                  {t.submit as string}
                </button>
              </form>

              <p className="mt-5 text-sm text-[var(--muted-fg)]">
                {t.switchText as string} <Link href="/auth" className="font-black text-[var(--foreground)] underline decoration-2 underline-offset-4">{t.switchLink as string}</Link>
              </p>
            </div>
          </section>

          <aside className="relative hidden overflow-hidden bg-[var(--accent)] p-8 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 opacity-25" aria-hidden="true">
              <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-white" />
              <div className="absolute right-10 top-20 h-16 w-16 rounded-full bg-[#FBBF24]" />
              <div className="absolute bottom-12 left-1/3 h-20 w-20 rounded-full bg-[#34D399]" />
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
                  <p className="text-sm font-black uppercase tracking-[0.28em] text-white/70">Why Focusnyx</p>
                  <p className="text-xs font-semibold text-white/80">Student Life OS</p>
                </div>
              </div>
              <h2 className="mt-4 font-display text-5xl font-black leading-[0.95]">Start organized, stay consistent.</h2>
              <p className="mt-5 max-w-md text-base leading-7 text-white/90">Sign up to unlock the dashboard, language toggle, and student-focused productivity tools.</p>
            </div>
            <div className="relative space-y-3 text-sm font-semibold text-white/85">
              <p>• Personal tasks and streaks</p>
              <p>• Future Supabase auth integration ready</p>
              <p>• Designed for a polished onboarding feel</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
