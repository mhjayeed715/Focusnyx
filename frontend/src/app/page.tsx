"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ContactModal } from "@/components/ui/ContactModal";
import { Footer } from "@/components/ui/Footer";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  CirclePlay,
  Clock3,
  GraduationCap,
  HeartPulse,
  Languages,
  Linkedin,
  Lock,
  LucideIcon,
  Mail,
  MessageSquareText,
  Mic,
  MoveRight,
  NotebookPen,
  Phone,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Triangle,
  Zap,
  Target,
  Download,
  Laptop,
  Puzzle,
} from "lucide-react";

import { useLanguage } from "@/components/layout/language-context";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

type Tone = "violet" | "pink" | "amber" | "emerald";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
};

const toneClasses: Record<Tone, string> = {
  violet: "bg-[#8B5CF6]",
  pink: "bg-[#F472B6]",
  amber: "bg-[#FBBF24]",
  emerald: "bg-[#34D399]",
};

const features: Feature[] = [
  {
    title: "Smart Academic Forge",
    description:
      "AI study plans, CGPA tracking, exam reminders, and micro-task breakdowns that keep every semester visible.",
    icon: GraduationCap,
    tone: "violet",
  },
  {
    title: "Dopamine Detox Engine",
    description:
      "Pomodoro timer, XP rewards, distraction tracking, and browser focus lock that actually enforces the rules.",
    icon: Lock,
    tone: "pink",
  },
  {
    title: "Smart Notes Vault",
    description:
      "Voice-to-text capture, subject tags, and auto-quiz generation for revision that feels fast instead of heavy.",
    icon: NotebookPen,
    tone: "amber",
  },
  {
    title: "Student Finance Tracker",
    description:
      "bKash and Nagad-aware expense logging, budget health scores, and alerts so allowance does not disappear silently.",
    icon: CircleDollarSign,
    tone: "emerald",
  },
  {
    title: "Wellness Shield",
    description:
      "Mood journal, sleep tracker, and burnout prevention scoring to catch the crash before it compounds.",
    icon: HeartPulse,
    tone: "violet",
  },
  {
    title: "AI Behavioral Coach",
    description:
      "Weekly Bangla-first insights, pattern detection, and habit reports tuned to how students actually live.",
    icon: BrainCircuit,
    tone: "pink",
  },
];

const analyticsTiers = [
  {
    label: "01 Daily",
    tone: "violet",
    bullets: [
      "Focus minutes by session",
      "Tasks completed versus planned",
      "Mood and energy check-ins",
      "Budget spend by category",
      "Today's distraction spikes",
    ],
  },
  {
    label: "02 Weekly",
    tone: "pink",
    bullets: [
      "Study streak consistency",
      "Pomodoro completion rate",
      "Subject progress and overdue tasks",
      "Sleep trend and recovery",
      "Habit pattern clusters",
    ],
  },
  {
    label: "03 Monthly",
    tone: "amber",
    bullets: [
      "CGPA momentum view",
      "Savings versus allowance",
      "Burnout risk score",
      "Top focus windows",
      "Achievement badges and XP growth",
    ],
  },
];

const marqueeItems = [
  "📚 Study Plans",
  "⏱️ Focus Timer",
  "💰 Finance Tracker",
  "🛡️ Wellness Shield",
  "🤖 AI Coach",
  "🔌 Site Blocker",
  "🇧🇩 Bangla UI",
];

const localizedCopy = {
  en: {
    nav: ["Features", "Analytics", "Timeline", "About"],
    header: "Built for Bangladeshi Students",
    hero: "The only app that combines academics, focus, finance, and wellness - built ADHD-friendly, in Bangla and English.",
    ctaPrimary: "Start for Free",
    ctaSecondary: "See How It Works",
    chips: ["ADHD-friendly", "Bangla + English", "PWA + Extension"],
    streak: "Focus Streak",
    session: "Current session",
    goal: "Today's Goal",
    wellness: "Wellness",
    featureTitle: "Features",
    featureHeadline: ["Everything you need.", "One place."],
    explore: "Explore module",
    analyticsTitle: "Analytics",
    analyticsHeadline: "3-Tier Productivity Analytics",
    extensionTitle: "Extension",
    extensionHeadline: ["The Focus Lock", "your browser needs"],
    extensionBody: "Web apps can track habits, but they cannot block tabs. The extension does the enforcing while the PWA dashboard stays in control.",
    extensionReady: "Focus Lock Ready",
    extensionControlled: "Controlled from Focusnyx dashboard",
    finalTitle: ["Stop losing your days.", "Start building your future."],
    finalBody: "Free. No app store needed. Works on any device.",
    footer: "Built for Bangladeshi students",
    footerLinks: ["GitHub", "Contact", "SMUCT"],
  },
  bn: {
    nav: ["বৈশিষ্ট্য", "বিশ্লেষণ", "টাইমলাইন", "সম্বন্ধে"],
    header: "বাংলাদেশি শিক্ষার্থীদের জন্য তৈরি",
    hero: "একটি অ্যাপ যা একসাথে একাডেমিক, ফোকাস, ফাইন্যান্স, এবং ওয়েলনেস - ADHD-বন্ধুসুলভ, বাংলা ও ইংরেজি-এ।",
    ctaPrimary: "ফ্রি শুরু করুন",
    ctaSecondary: "কিভাবে কাজ করে দেখুন",
    chips: ["ADHD-বন্ধুসুলভ", "বাংলা + ইংরেজি", "PWA + এক্সটেনশন"],
    streak: "ফোকাস স্ট্রিক",
    session: "বর্তমান সেশন",
    goal: "আজকের লক্ষ্য",
    wellness: "ওয়েলনেস",
    featureTitle: "বৈশিষ্ট্য",
    featureHeadline: ["যা কিছু দরকার।", "সব এক জায়গায়।"],
    explore: "মডিউল দেখুন",
    analyticsTitle: "বিশ্লেষণ",
    analyticsHeadline: "৩-স্তরের প্রোডাক্টিভিটি বিশ্লেষণ",
    extensionTitle: "এক্সটেনশন",
    extensionHeadline: ["ফোকাস লক", "আপনার ব্রাউজারের জন্য"],
    extensionBody: "ওয়েব অ্যাপ অভ্যাস ট্র্যাক করতে পারে, কিন্তু ট্যাব ব্লক করতে পারে না। এক্সটেনশন নিয়ন্ত্রণ কার্যকর করে, আর PWA ড্যাশবোর্ড থাকে নিয়ন্ত্রণে।",
    extensionReady: "ফোকাস লক প্রস্তুত",
    extensionControlled: "Focusnyx ড্যাশবোর্ড থেকে নিয়ন্ত্রিত",
    finalTitle: ["দিন নষ্ট করা বন্ধ করুন।", "আপনার ভবিষ্যৎ গড়ুন।"],
    finalBody: "ফ্রি। অ্যাপ স্টোর লাগবে না। যেকোনো ডিভাইসে চলে।",
    footer: "বাংলাদেশি শিক্ষার্থীদের জন্য নির্মিত 🇧🇩",
    footerLinks: ["GitHub", "যোগাযোগ", "SMUCT"],
  },
} as const;

function IconCircle({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={`absolute -top-7 left-6 grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--foreground)] ${toneClasses[tone]} text-white shadow-[4px_4px_0_0_#1E293B]`}>
      <Icon size={22} strokeWidth={2.5} />
    </span>
  );
}

export default function HomePage() {
  const [lang, setLang] = useState<"en" | "bn">("en");
  const [isContactOpen, setIsContactOpen] = useState(false);

  const copy = localizedCopy[lang];
  const localizedFeatures: Feature[] = lang === "bn"
    ? features.map((feature, index) => ({
        ...feature,
        title: ["স্মার্ট একাডেমিক ফোর্জ", "ডোপামিন ডিটক্স ইঞ্জিন", "স্মার্ট নোটস ভল্ট", "স্টুডেন্ট ফাইন্যান্স ট্র্যাকার", "ওয়েলনেস শিল্ড", "AI বিহেভিয়োরাল কোচ"][index],
        description: [
          "AI স্টাডি প্ল্যান, CGPA ট্র্যাকিং, পরীক্ষা রিমাইন্ডার, আর মাইক্রো-টাস্ক বিভাজন যা প্রতিটি সেমিস্টারকে দৃশ্যমান রাখে।",
          "Pomodoro timer, XP rewards, distraction tracking, আর browser focus lock যা সত্যিই নিয়ম কার্যকর করে।",
          "Voice-to-text capture, subject tags, আর auto-quiz generation যা revision-কে দ্রুত করে তোলে।",
          "bKash আর Nagad-aware expense logging, budget health scores, আর alert যাতে allowance চুপচাপ হারিয়ে না যায়।",
          "Mood journal, sleep tracker, আর burnout prevention scoring যা crash আসার আগেই ধরে ফেলে।",
          "সাপ্তাহিক Bangla-first insight, pattern detection, আর habit report যা শিক্ষার্থীদের বাস্তব জীবনের সাথে মেলে।",
        ][index],
      }))
    : features;

  const localizedAnalytics = lang === "bn"
    ? analyticsTiers.map((tier, index) => ({
        ...tier,
        label: ["01 দৈনিক", "02 সাপ্তাহিক", "03 মাসিক"][index],
        bullets: [
          ["সেশনভিত্তিক focus minutes", "completed বনাম planned task", "mood আর energy check-in", "ক্যাটাগরিভিত্তিক budget spend", "আজকের distraction spike"],
          ["Study streak consistency", "Pomodoro completion rate", "বাকি থাকা subject progress", "sleep trend আর recovery", "habit pattern cluster"],
          ["CGPA momentum view", "Savings বনাম allowance", "Burnout risk score", "Top focus window", "Achievement badge আর XP growth"],
        ][index],
      }))
    : analyticsTiers;

  return (
    <div className="min-h-screen overflow-x-visible bg-[var(--background)] text-[var(--foreground)] font-body">
      <header className="sticky top-0 z-50 border-b-2 border-[var(--foreground)] bg-white shadow-[0_4px_0_0_#1E293B]">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/icons/focusnyx.png"
              alt="Focusnyx"
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl border-2 border-[var(--foreground)] bg-white object-cover shadow-[4px_4px_0_0_#1E293B]"
              priority
            />
            <div>
              <p className="font-display text-xl font-black tracking-tight">Focusnyx</p>
              <p className="text-xs font-semibold text-[var(--muted-fg)]">Student Life OS</p>
            </div>
          </Link>

          <div className="hidden items-center gap-7 font-semibold lg:flex">
            {copy.nav.map((label, index) => (
              <a key={label} href={[["#features"], ["#analytics"], ["#timeline"], ["#about"]][index][0]} className="transition-transform hover:-translate-y-0.5 hover:text-[var(--accent)]">
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="shrink-0 flex items-center">
              <LanguageToggle />
            </div>
            <Link href="/auth" className="secondary-button flex h-12 w-[6.25rem] shrink-0 items-center justify-center px-0 text-sm font-bold sm:w-[6.5rem]">
              Login
            </Link>
            <Link href="/signup" className="candy-button flex h-12 w-[13.75rem] shrink-0 items-center justify-center gap-3 px-5 text-sm sm:w-[13.5rem] sm:px-6">
              {lang === "bn" ? "ফ্রি শুরু করুন" : "Get Started Free"}
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[var(--foreground)] shadow-[2px_2px_0_0_#1E293B]">
                <ArrowRight size={16} strokeWidth={2.5} />
              </span>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden border-b-2 border-[var(--foreground)] bg-[var(--background)]">
          <div className="memphis-dots absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="absolute left-1/2 top-0 hidden h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#FBBF24] opacity-90 lg:block" />
          <span className="float-slow absolute left-8 top-16 hidden h-10 w-10 rounded-full bg-[#F472B6] lg:block" />
          <span className="float-slower absolute right-20 top-28 hidden h-16 w-16 rounded-full bg-[#34D399] lg:block" />
          <span className="absolute right-8 bottom-12 hidden h-10 w-10 rotate-12 rounded-md border-2 border-[var(--foreground)] bg-white lg:block" />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8 lg:py-22 xl:grid-cols-[1.02fr_0.98fr]">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative z-10 max-w-xl xl:max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--foreground)] bg-white px-4 py-2 text-sm font-bold shadow-[4px_4px_0_0_#1E293B]">
                 <Sparkles size={16} strokeWidth={2.5} />
                 {copy.header}
              </div>
              <h1 className="mt-6 font-display text-5xl font-black leading-[0.95] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-6xl xl:text-7xl">
                {lang === "bn" ? "আপনার ছাত্রজীবন," : "Your Student Life,"}
                <span className="block">
                  {lang === "bn" ? "অবশেষে" : "Finally"} <span className="relative inline-block px-2">{lang === "bn" ? "গোছানো" : "Organized"}<span className="absolute inset-x-0 bottom-0 -z-10 h-4 rounded-full bg-[#FBBF24]" /></span>.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted-fg)] sm:text-xl">
                {copy.hero}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/signup" className="candy-button flex h-12 items-center justify-center gap-2 px-6 text-sm sm:h-14 sm:px-8 sm:text-base">
                  {copy.ctaPrimary}
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[var(--foreground)] shadow-[2px_2px_0_0_#1E293B]">
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </span>
                </Link>
                <a href="/downloads/Focusnyx-Chrome-Extension.zip" download className="secondary-button flex h-12 items-center justify-center gap-2 px-5 text-sm sm:h-14 sm:px-6 sm:text-base bg-[#ECFDF5]">
                  <Puzzle size={18} strokeWidth={2.5} className="text-[#059669]" />
                  {lang === "bn" ? "এক্সটেনশন (ZIP)" : "Extension (ZIP)"}
                </a>
                <a href="/downloads/FocusnyxCompanionApp-Windows.zip" download className="secondary-button flex h-12 items-center justify-center gap-2 px-5 text-sm sm:h-14 sm:px-6 sm:text-base bg-[#F3E8FF]">
                  <Laptop size={18} strokeWidth={2.5} className="text-[#7C3AED]" />
                  {lang === "bn" ? "কম্প্যানিয়ন (Windows EXE)" : "Companion (Windows)"}
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {copy.chips.map((chip: string) => (
                  <span key={chip} className="hard-chip px-4 py-2 text-sm font-bold">
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12, duration: 0.75, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative min-h-[26rem] lg:min-h-[38rem] xl:min-h-[42rem]"
            >
              <div className="absolute inset-y-10 left-1/2 hidden w-60 -translate-x-1/2 rounded-full bg-[#FBBF24] lg:block" />
              <div className="memphis-dots absolute inset-0 rounded-[32px] border-2 border-[var(--foreground)] bg-[rgba(255,255,255,0.35)] opacity-80" />

              <span className="absolute left-5 top-8 h-4 w-4 rotate-45 rounded-sm bg-[#F472B6]" aria-hidden="true" />
              <span className="absolute right-5 top-20 h-4 w-4 rounded-full bg-[#34D399]" aria-hidden="true" />
              <span className="absolute left-8 bottom-16 h-4 w-4 rotate-45 rounded-sm bg-[#FBBF24]" aria-hidden="true" />
              <span className="absolute right-8 bottom-8 h-4 w-4 rounded-full border-2 border-[var(--foreground)] bg-white" aria-hidden="true" />

              <motion.div
                className="absolute left-1/2 top-1/2 z-10 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#F472B6] sm:w-[72%]"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-fg)]">{copy.streak}</p>
                    <p className="font-display text-3xl font-black">12 Days</p>
                  </div>
                  <div className="rounded-full border-2 border-[var(--foreground)] bg-[#34D399] px-4 py-2 text-sm font-black shadow-[4px_4px_0_0_#1E293B]">
                    +240 XP
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-4 shadow-[4px_4px_0_0_#1E293B]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">Pomodoro</span>
                      <Target size={18} strokeWidth={2.5} />
                    </div>
                    <div className="mt-4 grid h-32 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white shadow-[4px_4px_0_0_#1E293B]">
                      <div className="text-center">
                        <p className="font-display text-4xl font-black leading-none">25:00</p>
                        <p className="mt-2 text-xs font-bold text-[var(--muted-fg)]">{copy.session}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[#FDF2F8] p-4 shadow-[4px_4px_0_0_#1E293B]">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{copy.goal}</p>
                      <p className="mt-2 font-display text-2xl font-black">Finish 3 tasks</p>
                    </div>
                    <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-4 shadow-[4px_4px_0_0_#1E293B]">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--muted-fg)]">{copy.wellness}</p>
                      <p className="mt-2 font-display text-2xl font-black">Mood: Steady</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-[22px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-3 shadow-[4px_4px_0_0_#1E293B]">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 size={18} strokeWidth={2.5} className="text-[#34D399]" />
                    4 tasks done today
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--muted-fg)]">
                    <TimerReset size={18} strokeWidth={2.5} />
                    2 breaks left
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="overflow-hidden border-b-2 border-[var(--foreground)] bg-[var(--foreground)] text-white">
          <div className="marquee-track flex w-[200%] items-center py-4 text-sm font-black uppercase tracking-[0.2em] sm:text-base">
            {[...marqueeItems, ...marqueeItems].map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-4 px-6">
                <span>{item}</span>
                <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="absolute right-0 top-16 hidden h-32 w-32 rounded-full bg-[#F472B6] opacity-20 lg:block" />
          <div className="absolute left-0 bottom-12 hidden h-24 w-24 rotate-12 rounded-[28px] bg-[#34D399] opacity-20 lg:block" />

          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.featureTitle}</p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">
              {copy.featureHeadline[0]} <span className="relative inline-block px-2">{copy.featureHeadline[1]}<span className="absolute inset-x-0 bottom-1 -z-10 h-4 rounded-full bg-[#8B5CF6]/25" /></span>
            </h2>
          </div>

          <div className="relative mt-14">
            <svg className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block" viewBox="0 0 1200 900" aria-hidden="true">
              <path d="M150 120C320 130 360 250 510 250s190-110 350-110 210 105 260 240" fill="none" stroke="#1E293B" strokeDasharray="10 12" strokeWidth="3" opacity="0.18" />
            </svg>
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {localizedFeatures.map((feature, index) => (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.92, y: 22 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ delay: index * 0.06, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="sticker-card wiggle-hover relative p-7 pt-12"
                >
                  <IconCircle icon={feature.icon} tone={feature.tone} />
                  <h3 className="font-display text-2xl font-black tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-fg)] sm:text-base">{feature.description}</p>
                  <div className="mt-6 flex items-center gap-2 text-sm font-black text-[var(--foreground)]">
                    <span className="wiggle-target inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)] shadow-[3px_3px_0_0_#1E293B]">
                      <ArrowRight size={14} strokeWidth={2.5} />
                    </span>
                    {copy.explore}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="analytics" className="relative overflow-hidden border-y-2 border-[var(--foreground)] bg-[var(--foreground)] text-white">
          <div className="absolute left-8 top-8 hidden h-28 w-28 rounded-full bg-white/10 lg:block" />
          <div className="absolute right-12 bottom-10 hidden h-20 w-20 rounded-[28px] bg-[#F472B6]/20 lg:block" />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#FBBF24]">{copy.analyticsTitle}</p>
              <h2 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">
                {copy.analyticsHeadline}
              </h2>
            </div>

            <div className="mt-14 grid gap-6 xl:grid-cols-3">
              {localizedAnalytics.map((tier) => (
                <article key={tier.label} className="sticker-card border-white bg-white p-7 text-[var(--foreground)] shadow-[8px_8px_0_0_#FBBF24]">
                  <div className={`inline-flex rounded-full border-2 border-[var(--foreground)] px-4 py-2 text-xs font-black uppercase tracking-[0.24em] ${tier.tone === "violet" ? "bg-[#8B5CF6] text-white" : tier.tone === "pink" ? "bg-[#F472B6] text-white" : "bg-[#FBBF24] text-[var(--foreground)]"}`}>
                    {tier.label}
                  </div>
                  <ul className="mt-6 space-y-3 text-sm leading-7 text-[var(--muted-fg)] sm:text-base">
                    {tier.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="timeline" className="relative bg-[#FFF7D6] py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">{copy.extensionTitle}</p>
              <h2 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl">
                {copy.extensionHeadline[0]} <span className="relative inline-block px-2">{copy.extensionHeadline[1]}<span className="absolute inset-x-0 bottom-1 -z-10 h-4 rounded-full bg-[#F472B6]/30" /></span>
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--foreground)]/80">
                {copy.extensionBody}
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Site blocking during Pomodoro",
                  "Distraction logging with one tap",
                  "One-click focus lock for study mode",
                  "Controlled entirely from the PWA dashboard",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-[20px] border-2 border-[var(--foreground)] bg-white px-4 py-3 shadow-[4px_4px_0_0_#1E293B]">
                    <CheckCircle2 size={18} strokeWidth={2.5} className="text-[#34D399]" />
                    <span className="font-semibold">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <a href="/downloads/Focusnyx-Chrome-Extension.zip" download className="candy-button flex h-13 items-center justify-center gap-3 px-6 text-sm">
                  <Puzzle size={20} strokeWidth={2.5} />
                  {lang === "bn" ? "Chrome এক্সটেনশন ডাউনলোড" : "Download Chrome Extension"}
                  <Download size={18} strokeWidth={2.5} />
                </a>
                <a href="/downloads/FocusnyxCompanionApp-Windows.zip" download className="secondary-button flex h-13 items-center justify-center gap-3 px-6 text-sm bg-white">
                  <Laptop size={20} strokeWidth={2.5} />
                  {lang === "bn" ? "Windows অ্যাপ ডাউনলোড" : "Download Companion App"}
                  <Download size={18} strokeWidth={2.5} />
                </a>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="sticker-card bg-white p-5 shadow-[8px_8px_0_0_#1E293B]"
            >
              <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-[var(--background)] p-4">
                <div className="flex items-center justify-between rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3 shadow-[4px_4px_0_0_#1E293B]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--muted-fg)]">Focusnyx Extension</p>
                    <p className="font-display text-2xl font-black">{copy.extensionReady}</p>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]">
                    <Lock size={20} strokeWidth={2.5} />
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ["Block class A", "on"],
                    ["Block YouTube", "on"],
                    ["Block Facebook", "off"],
                    ["Block Instagram", "on"],
                  ].map(([label, state], index) => (
                    <div key={label} className="flex items-center justify-between rounded-[18px] border-2 border-[var(--foreground)] bg-white px-4 py-3 shadow-[4px_4px_0_0_#1E293B]" style={{ backgroundColor: index % 2 === 0 ? "#FFF7D6" : "#fff" }}>
                      <span className="font-bold">{label}</span>
                      <span className={`rounded-full border-2 border-[var(--foreground)] px-3 py-1 text-xs font-black ${state === "on" ? "bg-[#34D399]" : "bg-[#F472B6]"} shadow-[3px_3px_0_0_#1E293B]`}>
                        {state}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[18px] border-2 border-[var(--foreground)] bg-[#F472B6] px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_0_#1E293B]">
                  {copy.extensionControlled}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[var(--accent)] py-20 text-white">
          <div className="absolute inset-0 opacity-60" aria-hidden="true">
            <span className="absolute left-6 top-6 h-28 w-28 rounded-full bg-white opacity-10" />
            <span className="absolute right-10 top-20 h-16 w-16 rounded-full bg-white opacity-10" />
            <span className="absolute left-1/3 bottom-10 h-20 w-20 rounded-full bg-white opacity-10" />
            <span className="absolute right-1/3 bottom-16 h-24 w-24 rounded-full bg-white opacity-10" />
          </div>
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-white/80">Final CTA</p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {copy.finalTitle[0]}
              <br />
              {copy.finalTitle[1]}
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/90">
              {copy.finalBody}
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signup" className="candy-button flex h-14 items-center gap-3 px-7 text-base">
                {lang === "bn" ? "Focusnyx ইনস্টল করুন (ফ্রি)" : "Install Focusnyx Free"}
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[var(--foreground)] shadow-[2px_2px_0_0_#1E293B]">
                  <MoveRight size={16} strokeWidth={2.5} />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer onContactClick={() => setIsContactOpen(true)} lang={lang} />

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
}
