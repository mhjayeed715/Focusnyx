"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Lock,
  NotebookPen,
  CircleDollarSign,
  HeartPulse,
  BrainCircuit,
  BarChart3,
  Puzzle,
  Laptop,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Key,
  Mic,
  Zap,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/components/layout/language-context";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function DocsPage() {
  const { lang } = useLanguage();
  const [activeSection, setActiveSection] = useState("academic");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const sections = [
    { id: "academic", label: lang === "bn" ? "একাডেমিক ফোর্জ" : "Academic Forge", icon: GraduationCap },
    { id: "detox", label: lang === "bn" ? "ডোপামিন ডিটক্স" : "Dopamine Detox", icon: Lock },
    { id: "notes", label: lang === "bn" ? "স্মার্ট নোটস" : "Smart Notes & AI", icon: NotebookPen },
    { id: "finance", label: lang === "bn" ? "ফাইন্যান্স ট্র্যাকার" : "Finance Tracker", icon: CircleDollarSign },
    { id: "wellness", label: lang === "bn" ? "ওয়েলনেস শিল্ড" : "Wellness Shield", icon: HeartPulse },
    { id: "coach", label: lang === "bn" ? "AI কোচ ও লিমিট" : "AI Coach & Limits", icon: BrainCircuit },
    { id: "analytics", label: lang === "bn" ? "প্রোডাক্টিভিটি অ্যানালিটিক্স" : "Productivity Analytics", icon: BarChart3 },
    { id: "installation", label: lang === "bn" ? "ইনস্টলেশন গাইড" : "Extension & Companion Setup", icon: Laptop },
    { id: "faq", label: lang === "bn" ? "সাধারণ প্রশ্নাবলী (FAQ)" : "Frequently Asked Questions", icon: HelpCircle },
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const faqs = [
    {
      q: lang === "bn" ? "১. ইমার্জেন্সি পিন (Emergency PIN) কিভাবে সেট বা ব্যবহার করব?" : "1. How do I set or verify my 6-digit Emergency PIN?",
      a: lang === "bn"
        ? "নতুন ইউজারদের জন্য প্রথমবার ফোকাস মোড চালু করার সময় ৬ সংখ্যার পিন সেট করতে বলা হবে। ফোকাস সেশন চলাকালীন এই পিন পরিবর্তন করা যাবে না। যদি কোনো কারণে সেশন আগেই বন্ধ করতে চান, তবে আপনার নির্ধারিত ৬ সংখ্যার পিন টাইপ করে সেশন আনলক করতে পারবেন।"
        : "New accounts are prompted to create a 6-digit Emergency PIN on their first focus session. The PIN cannot be changed while a focus lock is active. If you must exit early, enter your 6-digit PIN into the Emergency Exit modal."
    },
    {
      q: lang === "bn" ? "২. ফ্রি ৫টি AI কোয়েরি লিমিট কিভাবে কাজ করে?" : "2. How does the 5 Free Daily AI Queries limit work?",
      a: lang === "bn"
        ? "যেসব ইউজার নিজস্ব API Key সেট করেননি, তারা প্রতিদিন ৫টি AI সুবিধা (স্মার্ট নোট কুইজ জেনারেশন, ফ্লোটিং AI চ্যাটবট) সম্পূর্ণ বিনামূল্যে ব্যবহার করতে পারবেন। এটি বাংলাদেশ সময় প্রতিদিন রাত ১২:০০ টায় (12:00 AM BDT) রিসেট হয়। আনলিমিটেড ব্যবহার করতে Settings পেজে গিয়ে নিজস্ব Groq বা Gemini API Key সেট করুন।"
        : "Users without a custom API key get 5 free AI queries daily (floating chatbot, active recall quizzes). The quota resets automatically at 12:00 AM BDT (6:00 PM UTC). To unlock unlimited queries, enter your personal Groq or Gemini API key in Settings."
    },
    {
      q: lang === "bn" ? "৩. ওয়েব অ্যাপ, ক্রোম এক্সটেনশন এবং উইন্ডোজ অ্যাপের মধ্যে টাইমার কিভাবে সিঙ্ক হয়?" : "3. How does the focus timer stay synced across Web, Extension, and Windows app?",
      a: lang === "bn"
        ? "আপনি ওয়েব ড্যাশবোর্ড, ক্রোম এক্সটেনশন পপআপ বা পিসি অ্যাপের যেকোনো জায়গা থেকেই ফোকাস শুরু বা পজ করুন না কেন, Focusnyx রিয়েল-টাইম স্টেট ব্রডকাস্টের মাধ্যমে তিনটি ইন্টারফেসেই টাইমার এবং লক স্টেট ইনস্ট্যান্ট সিঙ্ক করে।"
        : "Starting, pausing, or unlocking focus mode from any interface (Web Dashboard, Extension Popup, or Windows Companion App) instantly broadcasts remaining seconds and lock status across all three platforms in real time."
    },
    {
      q: lang === "bn" ? "৪. উইন্ডোজ কম্প্যানিয়ন অ্যাপ চালানোর জন্য Administrator অনুমতি কেন লাগে?" : "4. Why does the Windows Companion app require Run as Administrator?",
      a: lang === "bn"
        ? "পিসিতে মনোযোগ ধরে রাখার জন্য কম্প্যানিয়ন অ্যাপটি Alt+Tab, Windows Key শর্টকাট ডিসেবল করে এবং ডিস্ট্র্যাক্টিং গেমস বা সফটওয়্যার ব্লক করে। Win32 সিস্টেম হুকস এবং রেজিস্ট্রি সিকিউরিটি প্রয়োগের জন্য Administrator পারমিশন প্রয়োজন।"
        : "To provide full OS-level focus enforcement, the Companion hooks Win32 keyboard shortcuts (Alt+Tab, Win Key) and manages process lists. Win32 security APIs require Run as Administrator to manage system hooks."
    },
    {
      q: lang === "bn" ? "৫. ক্রোম এক্সটেনশন কি উইন্ডোজ অ্যাপ ছাড়া একা কাজ করতে পারে?" : "5. Can the Chrome Extension work without the Windows Companion app?",
      a: lang === "bn"
        ? "হ্যাঁ! ক্রোম এক্সটেনশন একা ব্রাউজারের মধ্যে সোশ্যাল মিডিয়া ও ব্লকড ওয়েবসাইট ব্লক করতে সক্ষম। তবে পিসির অন্যান্য গেমস বা সফটওয়্যার ব্লক করতে উইন্ডোজ কম্প্যানিয়ন অ্যাপটি একসাথে ব্যবহার করা সুপারিশকৃত।"
        : "Yes! The Chrome Extension works independently inside Chrome or Edge to block distracting websites. However, running the Windows Companion alongside it adds desktop app blocking and shortcut locks."
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-body">
      {/* Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 border-b-2 border-[var(--foreground)] bg-white shadow-[0_4px_0_0_#1E293B]">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="candy-button flex h-10 items-center justify-center gap-2 px-3 text-xs font-bold sm:h-12 sm:px-4 sm:text-sm">
              <ArrowLeft size={16} strokeWidth={2.5} />
              {lang === "bn" ? "হোমে ফিরুন" : "Back to Home"}
            </Link>
            <div className="flex items-center gap-3">
              <Image
                src="/icons/focusnyx.png"
                alt="Focusnyx"
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl border-2 border-[var(--foreground)] bg-white object-cover shadow-[2px_2px_0_0_#1E293B]"
              />
              <div>
                <p className="font-display text-lg font-black tracking-tight">Focusnyx Docs</p>
                <p className="text-xs font-semibold text-[var(--muted-fg)]">
                  {lang === "bn" ? "ADHD-বন্ধুসুলভ গাইড ও নির্দেশিকা" : "ADHD-Friendly Guide & Reference"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <Link href="/auth" className="secondary-button flex h-10 items-center justify-center px-4 text-xs font-bold sm:h-12 sm:px-5 sm:text-sm bg-white">
              {lang === "bn" ? "লগইন" : "Login"}
            </Link>
            <Link href="/signup" className="candy-button flex h-10 items-center justify-center gap-2 bg-[#8B5CF6] px-4 text-xs font-bold text-white sm:h-12 sm:px-6 sm:text-sm">
              {lang === "bn" ? "ফ্রি শুরু করুন" : "Get Started Free"}
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[var(--foreground)] shadow-[1px_1px_0_0_#1E293B]">
                <ArrowRight size={14} strokeWidth={2.5} />
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner Hero */}
        <div className="rounded-[28px] border-4 border-[var(--foreground)] bg-[#FFF7D6] p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-10 mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#FBBF24] shadow-[2px_2px_0_0_#1E293B]">
              <BookOpen size={20} />
            </span>
            <span className="hard-chip px-3 py-1 text-xs font-black uppercase tracking-wider bg-white">
              {lang === "bn" ? "ADHD-অনুকূল সংস্করণ" : "ADHD-Friendly Version"}
            </span>
            <span className="hard-chip px-3 py-1 text-xs font-black uppercase tracking-wider bg-[#ECFDF5] text-[#059669]">
              {lang === "bn" ? "সংক্ষিপ্ত ও দ্রুত পঠনযোগ্য" : "Fast & Visual Reading"}
            </span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl text-[var(--foreground)]">
            {lang === "bn" ? "Focusnyx ব্যবহার নির্দেশিকা" : "Focusnyx Documentation & Help"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed font-semibold text-[var(--muted-fg)] sm:text-lg">
            {lang === "bn"
              ? "শিক্ষার্থীদের জন্য একাডেমিক ট্র্যাকিং, ডোপামিন ডিটক্স ব্রাউজার/পিসি লক, ভয়েস নোটস এবং ফাইন্যান্স পরিচালনার সহজ ও সংক্ষেপিত নির্দেশিকা।"
              : "A clean, ADHD-friendly documentation hub explaining Focusnyx modules, Focus Lock setup, Emergency PIN sync, and AI daily limits."}
          </p>
        </div>

        {/* Interactive Quick-Jump Filter Bar */}
        <div className="sticky top-[4.5rem] z-40 bg-[var(--background)] py-2 mb-8">
          <div className="flex flex-wrap gap-2.5">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`flex items-center gap-2 rounded-full border-2 border-[var(--foreground)] px-4 py-2.5 text-xs font-black transition-all ${
                    isActive
                      ? "bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B] translate-y-[-2px]"
                      : "bg-white text-[#1E293B] hover:bg-[#F3E8FF] hover:text-[#7C3AED] shadow-[2px_2px_0_0_#1E293B]"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-[#8B5CF6]"} />
                  <span className={isActive ? "text-white" : "text-[#1E293B]"}>{sec.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Documentation Sections */}
        <div className="space-y-8">
          {/* Section 1: Academic Forge */}
          <section id="academic" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <GraduationCap size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">1. Smart Academic Forge</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "সিজিপিএ প্রেডিকশন এবং পরীক্ষা সাব-টাস্ক প্ল্যানার" : "CGPA Momentum Estimator & Micro-Task Planner"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Sparkles size={18} className="text-[#8B5CF6]" />
                  {lang === "bn" ? "CGPA মোমেন্টাম এস্টিমেটর" : "CGPA Momentum Estimator"}
                </h3>
                <ul className="list-disc list-inside text-sm leading-relaxed text-[var(--muted-fg)] space-y-1.5 font-medium">
                  <li><strong>{lang === "bn" ? "গ্রেড প্রেডিকশন:" : "Grade Projection:"}</strong> {lang === "bn" ? "মিডটার্ম ও অ্যাসাইনমেন্টের নম্বর ইনপুট দিয়ে সেমিস্টার SGPA পূর্বাভাস দেখুন।" : "Input mid-term & quiz grades to calculate real-time projected SGPA."}</li>
                  <li><strong>{lang === "bn" ? "দুর্বল কোর্স সনাক্তকরণ:" : "Early Warning:"}</strong> {lang === "bn" ? "ফাইনাল পরীক্ষার আগেই কোন কোর্সে বেশি মনোযোগ দরকার তা জানুন।" : "Spot slipping course grades before final exam week."}</li>
                </ul>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#34D399]" />
                  {lang === "bn" ? "মাইক্রো-টাস্ক ও XP রিওয়ার্ড" : "Micro-Task Breakdowns & XP Rewards"}
                </h3>
                <ul className="list-disc list-inside text-sm leading-relaxed text-[var(--muted-fg)] space-y-1.5 font-medium">
                  <li><strong>{lang === "bn" ? "ছোট সাব-টাস্ক:" : "Micro Breakdowns:"}</strong> {lang === "bn" ? "বড় অ্যাসাইনমেন্টকে ছোট ছোট টাস্কে ভাগ করে চাপ কমান।" : "Break overwhelming assignments into manageable sub-tasks."}</li>
                  <li><strong>{lang === "bn" ? "XP ও স্ট্রিক:" : "XP & Streaks:"}</strong> {lang === "bn" ? "টাস্ক শেষ করে লেভেল আপ করুন এবং স্ট্রিক ধরে রাখুন।" : "Earn XP points upon completing tasks and level up your profile."}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Dopamine Detox Engine */}
          <section id="detox" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <Lock size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">2. Dopamine Detox Engine</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "ব্রাউজার লক, পিসি লক এবং ইমার্জেন্সি পিন" : "Browser Lock, OS Lock & Emergency PIN Rules"}
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#D97706]">
                  <Key size={18} />
                  {lang === "bn" ? "ইমার্জেন্সি পিন এনফোর্সমেন্ট (6-Digit Emergency PIN)" : "6-Digit Emergency PIN Rules"}
                </h3>
                <ul className="list-disc list-inside text-sm leading-relaxed text-[var(--muted-fg)] space-y-1.5 font-medium">
                  <li><strong>{lang === "bn" ? "নতুন অ্যাকাউন্টের জন্য:" : "New Accounts:"}</strong> {lang === "bn" ? "প্রথমবার ফোকাস মোড চালু করার সময় ৬ সংখ্যার নিজস্ব পিন সেট করতে হবে।" : "Prompted to set a 6-digit Emergency PIN on your first focus session."}</li>
                  <li><strong>{lang === "bn" ? "ফোকাস চলাকালীন লক:" : "Locked During Focus:"}</strong> {lang === "bn" ? "সেশন চলাকালে সেটিংস পেজ থেকে পিন পরিবর্তন সম্পূর্ণ বন্ধ থাকে।" : "Emergency PIN editing is strictly disabled in Settings while focusing."}</li>
                  <li><strong>{lang === "bn" ? "ইনস্ট্যান্ট সিঙ্ক:" : "Instant Synchronization:"}</strong> {lang === "bn" ? "পিন পরিবর্তন সাথে সাথে ওয়েব, এক্সটেনশন ও পিসি অ্যাপে সিঙ্ক হয়।" : "PIN changes automatically sync across Web, Extension, and Companion."}</li>
                </ul>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
                  <h4 className="font-bold text-base mb-1 flex items-center gap-2 text-[#059669]">
                    <Puzzle size={16} /> Chrome Extension Focus Lock
                  </h4>
                  <p className="text-xs text-[var(--muted-fg)] leading-relaxed font-medium">
                    {lang === "bn"
                      ? "সোশ্যাল মিডিয়া বা ব্লকড ওয়েবসাইটে ঢুকতে গেলে এক্সটেনশন সাথে সাথে নেভিগেশন আটকে ব্লকিং স্ক্রিন দেখায়।"
                      : "Intercepts tab navigation to social media and distracting websites, forcing browser focus."}
                  </p>
                </div>

                <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
                  <h4 className="font-bold text-base mb-1 flex items-center gap-2 text-[#7C3AED]">
                    <Laptop size={16} /> Windows Companion App (OS Lock)
                  </h4>
                  <p className="text-xs text-[var(--muted-fg)] leading-relaxed font-medium">
                    {lang === "bn"
                      ? "পিসির Alt+Tab, Windows Key শর্টকাট ডিসেবল করে এবং ডিস্ট্র্যাক্টিং গেমস বা অ্যাপ জোরপূর্বক মিনিমাইজ করে।"
                      : "Disables shortcuts (Alt+Tab, Win Key), blocks Task Manager, and minimizes non-allowed desktop apps."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Smart Notes Vault */}
          <section id="notes" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#FBBF24] text-white shadow-[4px_4px_0_0_#1E293B]">
                <NotebookPen size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">3. Smart Notes Vault & AI Quiz Generator</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "ভয়েস নোটস (বাংলা + ইংরেজি) এবং এআই কুইজ" : "Voice Notes (Bangla & English) & AI Quizzes"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#D97706]">
                  <Mic size={18} />
                  {lang === "bn" ? "কন্টিনিউয়াস ভয়েস নোটস (Speech-to-Text)" : "Bilingual Continuous Voice Notes"}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-fg)] font-medium">
                  {lang === "bn"
                    ? "বাংলা (BD) এবং ইংরেজি (US) দুই ভাষাতেই স্পিচ-টু-টেক্সট সমর্থন করে। অডিও ইঞ্জিন লুপ এড়িয়ে রিয়েল-টাইমে পড়াশোনার ভয়েস নোট রেকর্ড করে।"
                    : "Capture hands-free lecture notes in English (US) or Bangla (BD) with speech recognition loop protection."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#DB2777]">
                  <BrainCircuit size={18} />
                  {lang === "bn" ? "AI কুইজ জেনারেটর (MCQ / Short Q&A / Essay)" : "AI Active Recall Quizzes"}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-fg)] font-medium">
                  {lang === "bn"
                    ? "নোট থেকে স্বয়ংক্রিয়ভাবে MCQ কুইজ, শর্ট প্রশ্ন এবং রচনা-শৈলীর উত্তর তৈরি করুন। পরীক্ষার রিভিশন দেওয়ার দ্রুততম উপায়।"
                    : "Generate MCQs with instant explanations, short flashcards, or comprehensive essay model answers from study notes."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Student Finance Tracker */}
          <section id="finance" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#34D399] text-white shadow-[4px_4px_0_0_#1E293B]">
                <CircleDollarSign size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">4. Student Finance Tracker</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "bKash/Nagad লেজার, ধার হিসাব ও সেভিংস" : "bKash & Nagad Expense Ledger, Debts & Savings"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-base mb-1 text-[#059669]">{lang === "bn" ? "আয়-ব্যয় হিসাব" : "Income & Expense Ledger"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed font-medium">
                  {lang === "bn" ? "bKash, Nagad ও ক্যাশ খরচের ক্যাটাগরিভিত্তিক হিসাব রাখুন।" : "Log allowance, food, transport, and tuition expenses with bKash/Nagad tags."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-base mb-1 text-[#D97706]">{lang === "bn" ? "ধার/কর্জ ট্র্যাকার" : "Peer Debts Tracker"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed font-medium">
                  {lang === "bn" ? "বন্ধুদের পাওনা বা ধারের টাকা ট্র্যাক করে রাখুন।" : "Keep track of lent or borrowed money with friends until settled."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-base mb-1 text-[#7C3AED]">{lang === "bn" ? "সেভিংস গোলস" : "Savings Goals"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed font-medium">
                  {lang === "bn" ? "বই, কোর্স বা ডিভাইসের জন্য সঞ্চয়ের লক্ষ্য তৈরি করুন।" : "Track savings progress for books, courses, or gadgets with target dates."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Wellness Shield */}
          <section id="wellness" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#EC4899] text-white shadow-[4px_4px_0_0_#1E293B]">
                <HeartPulse size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">5. Wellness Shield</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "ঘুম, মেজাজ এবং বার্নআউট প্রতিরোধ ট্র্যাকিং" : "Sleep Tracker, Mood Journal & Burnout Risk Score"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#DB2777]">
                  <HeartPulse size={18} />
                  {lang === "bn" ? "ঘুম ও মুড ট্র্যাকার" : "Sleep & Mood Logging"}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-fg)] font-medium">
                  {lang === "bn"
                    ? "দৈনিক ঘুমের সময় এবং মেজাজ (Mood) রেকর্ড করুন। ঘুম কম হলে ফোকাস স্কোরের ওপর প্রভাব পর্যবেক্ষণ করুন।"
                    : "Log sleep hours and subjective moods daily to observe how rest levels impact focus efficiency."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#059669]">
                  <ShieldCheck size={18} />
                  {lang === "bn" ? "বার্নআউট প্রিভেনশন স্কোর" : "Burnout Prevention Index"}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-fg)] font-medium">
                  {lang === "bn"
                    ? "পড়াশোনা এবং বিশ্রামের অনুপাত বিশ্লেষণ করে অতিরিক্ত ক্লান্তির ঝুঁকি আগে থেকেই জানিয়ে দেয়।"
                    : "Monitors study-to-rest ratios and alerts you when high study duration threatens mental exhaustion."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: AI Behavioral Coach & Quota */}
          <section id="coach" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <BrainCircuit size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">6. AI Behavioral Coach & Daily Free Limits</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "দৈনিক ৫টি ফ্রি কোয়েরি এবং নিজস্ব API Key রুলস" : "5 Free Daily Queries & Custom API Keys"}
                </p>
              </div>
            </div>

            <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-5 mt-4 space-y-3 shadow-[4px_4px_0_0_#1E293B]">
              <h3 className="font-bold text-lg flex items-center gap-2 text-[#059669]">
                <Sparkles size={18} />
                {lang === "bn" ? "দৈনিক ৫টি ফ্রি AI কোয়েরি কোটা" : "5 Free Daily AI Queries Quota"}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-fg)] font-medium">
                {lang === "bn"
                  ? "নিজের API Key না থাকলে প্রতিটি ইউজার প্রতিদিন ৫টি AI কোয়েরি (ফ্লোটিং চ্যাটবট ও কুইজ) বিনামূল্যে পাবেন। এটি প্রতিদিন রাত ১২:০০ টায় (12:00 AM BDT) রিসেট হয়।"
                  : "Users without a custom API key get 5 free AI queries daily (floating chatbot, active recall quizzes). The quota resets automatically at 12:00 AM BDT (6:00 PM UTC)."}
              </p>
              <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-white p-3 text-xs font-semibold text-[var(--muted-fg)] shadow-[2px_2px_0_0_#1E293B]">
                💡 <strong>{lang === "bn" ? "আনলিমিটেড ব্যবহারের জন্য:" : "For Unlimited AI Queries:"}</strong> {lang === "bn" ? "Settings পেজে আপনার নিজস্ব Groq বা Gemini API Key বসান।" : "Enter your custom Groq or Gemini API key in Settings for unlimited requests."}
              </div>
            </div>
          </section>

          {/* Section 7: Productivity Analytics */}
          <section id="analytics" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#F59E0B] text-white shadow-[4px_4px_0_0_#1E293B]">
                <BarChart3 size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">7. 3-Tier Productivity Analytics</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "দৈনিক, সাপ্তাহিক এবং দীর্ঘমেয়াদী পরিসংখ্যান" : "Daily, Weekly & Monthly Behavioral Insights"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-base mb-1 text-[#D97706]">{lang === "bn" ? "১. দৈনিক ড্যাশবোর্ড" : "Tier 1: Daily View"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed font-medium">
                  {lang === "bn" ? "আজকের অর্জন, ফোকাস সময় এবং সম্পন্ন টাস্ক।" : "Today's XP gains, completed tasks, and active study minutes."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-base mb-1 text-[#DB2777]">{lang === "bn" ? "২. সাপ্তাহিক বিশ্লেষণ" : "Tier 2: Weekly Trends"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed font-medium">
                  {lang === "bn" ? "সপ্তাহের ডিস্ট্র্যাকশন প্যাটার্ন এবং অভ্যাস।" : "Distraction log patterns, blocked sites count, and habit consistency."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-base mb-1 text-[#7C3AED]">{lang === "bn" ? "৩. মাসিক মোমেন্টাম" : "Tier 3: Macro Patterns"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed font-medium">
                  {lang === "bn" ? "সিজিপিএ মোমেন্টাম ও ঘুমের প্রভাবের সম্পর্ক।" : "Correlates hours slept against academic SGPA & focus duration."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 8: Installation Guide */}
          <section id="installation" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#3B82F6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <Laptop size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">8. Extension & Companion Setup Guide</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "ক্রোম এক্সটেনশন এবং উইন্ডোজ অ্যাপ ইনস্টলেশন গাইড" : "Step-by-step installation instructions for Chrome & Windows"}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              {/* Chrome Extension Instructions */}
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-[#059669]">
                  <Puzzle size={20} />
                  {lang === "bn" ? "ক্রোম এক্সটেনশন ইনস্টলেশন" : "Chrome Extension Installation"}
                </h3>
                <ol className="list-decimal list-inside text-xs leading-relaxed text-[var(--muted-fg)] space-y-2 font-semibold">
                  {lang === "bn" ? (
                    <>
                      <li>ল্যান্ডিং পেজের <strong>Extension (ZIP)</strong> বোতামে ক্লিক করে ফাইল ডাউনলোড করুন।</li>
                      <li>ডাউনলোড করা ZIP ফাইলটি যেকোনো ফোল্ডারে Unzip / Extract করুন।</li>
                      <li>Google Chrome বা Edge খুলে অ্যাড্রেস বারে <code>chrome://extensions</code> টাইপ করুন।</li>
                      <li>ডানপাশের উপরে <strong>Developer mode</strong> অপশনটি অন (Toggle ON) করুন।</li>
                      <li><strong>Load unpacked</strong> বাটনে ক্লিক করে আনজিপ করা ফোল্ডারটি নির্বাচন করুন।</li>
                      <li>Focusnyx এক্সটেনশনটি পিন করুন এবং স্বাচ্ছন্দ্যে ফোকাস লক এনফোর্স করুন!</li>
                    </>
                  ) : (
                    <>
                      <li>Click the <strong>Extension (ZIP)</strong> button on the landing page to download the package.</li>
                      <li>Extract/Unzip the downloaded ZIP file into a local folder.</li>
                      <li>Open Chrome or Edge browser and navigate to <code>chrome://extensions</code>.</li>
                      <li>Enable <strong>Developer mode</strong> (toggle switch in the top right corner).</li>
                      <li>Click <strong>Load unpacked</strong> and select the extracted extension directory.</li>
                      <li>Pin Focusnyx to your extension toolbar and enjoy distraction-free browsing!</li>
                    </>
                  )}
                </ol>
              </div>

              {/* Windows Companion Instructions */}
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#F3E8FF] p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-[#7C3AED]">
                  <Laptop size={20} />
                  {lang === "bn" ? "উইন্ডোজ কম্প্যানিয়ন (.exe) ইনস্টলেশন" : "Windows Companion (.exe) Installation"}
                </h3>
                <ol className="list-decimal list-inside text-xs leading-relaxed text-[var(--muted-fg)] space-y-2 font-semibold">
                  {lang === "bn" ? (
                    <>
                      <li>ল্যান্ডিং পেজের <strong>Companion (Windows EXE)</strong> বোতাম থেকে ফাইল ডাউনলোড করুন।</li>
                      <li>ZIP ফাইলটি Extract করে <code>FocusnyxCompanion.exe</code> ফাইলটি বের করুন।</li>
                      <li><code>FocusnyxCompanion.exe</code> ফাইলে রাইট-ক্লিক করে <strong>Run as Administrator</strong> নির্বাচন করুন।</li>
                      <li>এটি ব্যাকগ্রাউন্ডে চালিত হয়ে সিস্টেম ট্রেতে (System Tray) আইকন হিসেবে থাকবে।</li>
                      <li>পিসি এবং ব্রাউজার একসাথে লক করে পড়াশোনায় সম্পূর্ণ মনোযোগ নিশ্চিত করুন!</li>
                    </>
                  ) : (
                    <>
                      <li>Click the <strong>Companion (Windows EXE)</strong> button on the landing page to download.</li>
                      <li>Extract the ZIP file to reveal <code>FocusnyxCompanion.exe</code>.</li>
                      <li>Right-click <code>FocusnyxCompanion.exe</code> and select <strong>Run as Administrator</strong>.</li>
                      <li>The Companion app will run silently in the background and display a system tray icon.</li>
                      <li>Enjoy dual-layer PC and browser concentration shielding!</li>
                    </>
                  )}
                </ol>
              </div>
            </div>
          </section>

          {/* Section 9: FAQ Section */}
          <section id="faq" className="scroll-mt-28 rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#6366F1] text-white shadow-[4px_4px_0_0_#1E293B]">
                <HelpCircle size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">
                  {lang === "bn" ? "সাধারণ প্রশ্নাবলী (FAQ)" : "Frequently Asked Questions"}
                </h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">
                  {lang === "bn" ? "Focusnyx ব্যবহারে যেকোনো প্রশ্নের উত্তর" : "Common questions & solutions"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-[20px] border-2 border-[var(--foreground)] bg-white overflow-hidden shadow-[4px_4px_0_0_#1E293B] transition-all"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left font-bold text-sm sm:text-base text-[var(--foreground)] hover:bg-[#FFF7D6]"
                    >
                      <span className="flex items-center gap-2">{faq.q}</span>
                      <ChevronDown
                        size={18}
                        className={`shrink-0 transition-transform ${isOpen ? "rotate-180 text-[#8B5CF6]" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs sm:text-sm leading-relaxed text-[var(--muted-fg)] border-t border-[var(--foreground)]/10 pt-3 bg-white font-medium">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
