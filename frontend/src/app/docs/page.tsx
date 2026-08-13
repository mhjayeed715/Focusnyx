"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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
  ShieldAlert,
  Sparkles,
  Key,
  Mic,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/components/layout/language-context";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function DocsPage() {
  const { lang } = useLanguage();
  const [activeSection, setActiveSection] = useState("academic");

  const sections = [
    { id: "academic", label: lang === "bn" ? "একাডেমিক ফোর্জ" : "Academic Forge", icon: GraduationCap },
    { id: "detox", label: lang === "bn" ? "ডোপামিন ডিটক্স" : "Dopamine Detox", icon: Lock },
    { id: "notes", label: lang === "bn" ? "স্মার্ট নোটস" : "Smart Notes & AI", icon: NotebookPen },
    { id: "finance", label: lang === "bn" ? "ফাইন্যান্স ট্র্যাকার" : "Finance Tracker", icon: CircleDollarSign },
    { id: "wellness", label: lang === "bn" ? "ওয়েলনেস শিল্ড" : "Wellness Shield", icon: HeartPulse },
    { id: "coach", label: lang === "bn" ? "AI কোচ" : "AI Coach & Limits", icon: BrainCircuit },
    { id: "analytics", label: lang === "bn" ? "বিশ্লেষণ" : "Productivity Analytics", icon: BarChart3 },
    { id: "installation", label: lang === "bn" ? "ইনস্টলেশন" : "Extension & Companion Setup", icon: Laptop },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-body">
      {/* Sticky Header */}
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
                <p className="text-xs font-semibold text-[var(--muted-fg)]">User Guide & Reference</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link href="/dashboard" className="candy-button flex h-10 items-center justify-center gap-2 bg-[#8B5CF6] px-4 text-xs font-bold text-white sm:h-12 sm:px-6 sm:text-sm">
              <Zap size={16} />
              {lang === "bn" ? "ড্যাশবোর্ড খুলুন" : "Open Dashboard"}
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Banner Hero */}
        <div className="rounded-[28px] border-4 border-[var(--foreground)] bg-[#FFF7D6] p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-10 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--foreground)] bg-[#FBBF24] shadow-[2px_2px_0_0_#1E293B]">
              <BookOpen size={20} />
            </span>
            <span className="hard-chip px-3 py-1 text-xs font-black uppercase tracking-wider bg-white">
              {lang === "bn" ? "অফিসিয়াল গাইড" : "Official Guide"}
            </span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl text-[var(--foreground)]">
            {lang === "bn" ? "Focusnyx ব্যবহার নির্দেশিকা" : "Focusnyx User Documentation"}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed font-semibold text-[var(--muted-fg)] sm:text-lg">
            {lang === "bn"
              ? "Focusnyx হলো শিক্ষার্থীদের জন্য একটি অল-ইন-ওয়ান স্টুডেন্ট লাইফ OS। একাডেমিক গ্রেড ট্র্যাকিং, ব্রাউজার ও পিসি ফোকাস লক, ভয়েস নোটস, এবং বাজেট ম্যানেজমেন্টের বিস্তারিত নির্দেশিকা নিচে পাবেন।"
              : "Focusnyx is an all-in-one Student Life OS designed to shield concentration, manage university grades, capture voice notes, and track daily finances. Explore module features and setup guides below."}
          </p>
        </div>

        {/* Section Navigation Chips */}
        <div className="flex flex-wrap gap-2.5 mb-8">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`candy-button flex items-center gap-2 rounded-full border-2 border-[var(--foreground)] px-4 py-2 text-xs font-black transition-all ${
                  isActive
                    ? "bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]"
                    : "bg-white text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                <Icon size={16} />
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Documentation Content Sections */}
        <div className="space-y-8">
          {/* Section 1: Academic Forge */}
          <section id="academic" className="rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <GraduationCap size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">1. Smart Academic Forge</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">GPA Estimator & Exam Subtask Planner</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Sparkles size={18} className="text-[#8B5CF6]" />
                  {lang === "bn" ? "CGPA মোমেন্টাম এস্টিমেটর" : "CGPA Momentum Estimator"}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-fg)]">
                  {lang === "bn"
                    ? "চলতি সেমিস্টারের কোর্সগুলোর মিডটার্ম, ফাইনাল ও অ্যাসাইনমেন্ট স্কোর ইনপুট করে আনুমানিক SGPA ও সামগ্রিক CGPA পূর্বাভাস দেখুন। প্রজেক্টেড গ্রেড আপনাকে সময়ের আগে দুর্বল কোর্স উন্নত করতে সহায়তা করে।"
                    : "Input course mid-term and final target grades to project semester SGPAs and overall CGPA trajectory. Identify weak courses before final exams arrive."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-[#34D399]" />
                  {lang === "bn" ? "মাইক্রো-টাস্ক ও XP রিওয়ার্ড" : "Micro-Task Breakdowns & XP"}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-fg)]">
                  {lang === "bn"
                    ? "পড়াশোনার বড় অ্যাসাইনমেন্টগুলোকে ছোট সাব-টাস্কে ভাগ করুন। প্রতিটি টাস্ক সম্পূর্ণ করলে XP পয়েন্ট অর্জিত হয়, যা আপনার লেভেল বাড়ায় এবং স্ট্রিক ট্র্যাক রাখে।"
                    : "Break down overwhelming assignments into weighted sub-tasks. Complete micro-tasks to gain Experience Points (XP), build streaks, and level up."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Dopamine Detox Engine */}
          <section id="detox" className="rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#F472B6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <Lock size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">2. Dopamine Detox Engine</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">Browser Lock, OS Lock & Emergency PIN</p>
              </div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Key size={18} className="text-[#D97706]" />
                  {lang === "bn" ? "ইমার্জেন্সি পিন রুলস (6-Digit Emergency PIN)" : "Emergency PIN Setup & Enforcement"}
                </h3>
                <ul className="list-disc list-inside text-sm leading-relaxed text-[var(--muted-fg)] space-y-1">
                  <li><strong>{lang === "bn" ? "নতুন অ্যাকাউন্টের জন্য:" : "New Accounts:"}</strong> {lang === "bn" ? "প্রথমবার ফোকাস মোড শুরু করার সময় ৬ সংখ্যার ইমার্জেন্সি পিন সেট করতে বলা হবে।" : "When entering Focus Mode for the first time, you will be prompted to set a 6-digit PIN."}</li>
                  <li><strong>{lang === "bn" ? "ফোকাস সেশন চলাকালীন:" : "During Focus Mode:"}</strong> {lang === "bn" ? "সেটিংস থেকে ইমার্জেন্সি পিন পরিবর্তন করা যাবে না।" : "The Emergency PIN cannot be edited or changed in Settings during an active session."}</li>
                  <li><strong>{lang === "bn" ? "ইনস্ট্যান্ট সিঙ্ক:" : "Instant Sync:"}</strong> {lang === "bn" ? "ওয়েব অ্যাপ, ক্রোম এক্সটেনশন এবং উইন্ডোজ কম্প্যানিয়নে পিন সাথে সাথে সিঙ্ক হয়।" : "PIN changes automatically sync across Web App, Chrome Extension, and Windows Companion."}</li>
                </ul>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-5">
                  <h4 className="font-bold text-base mb-1 flex items-center gap-2">
                    <Puzzle size={16} className="text-[#059669]" /> Chrome Extension Focus Lock
                  </h4>
                  <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                    {lang === "bn"
                      ? "সোশ্যাল মিডিয়া বা ব্লকড ওয়েবসাইটে ঢুকতে গেলে এক্সটেনশন সাথে সাথে নেভিগেশন আটকে ব্লকিং স্ক্রিন দেখায়।"
                      : "Intercepts navigation to non-whitelisted domains, keeping browser focus strictly on active study resources."}
                  </p>
                </div>

                <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-5">
                  <h4 className="font-bold text-base mb-1 flex items-center gap-2">
                    <Laptop size={16} className="text-[#7C3AED]" /> Windows Companion App (OS Lock)
                  </h4>
                  <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                    {lang === "bn"
                      ? "পিসির Alt+Tab, Windows Key শর্টকাট ডিসেবল করে এবং গেমস বা ডিস্ট্র্যাক্টিং অ্যাপ জোরপূর্বক মিনিমাইজ ও বন্ধ করে দেয়।"
                      : "Hooks Win32 shortcuts (Alt+Tab, Win Key), prevents Task Manager access, and forcefully minimizes distracting desktop apps."}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Smart Notes Vault */}
          <section id="notes" className="rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#FBBF24] text-white shadow-[4px_4px_0_0_#1E293B]">
                <NotebookPen size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">3. Smart Notes Vault & AI Quiz Generator</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">Voice Notes (Bangla + English) & AI Quizzes</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Mic size={18} className="text-[#FBBF24]" />
                  {lang === "bn" ? "কন্টিনিউয়াস ভয়েস নোটস (Speech-to-Text)" : "Bilingual Continuous Voice Notes"}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-fg)]">
                  {lang === "bn"
                    ? "বাংলা (BD) এবং ইংরেজি (US) দুই ভাষাতেই বক্তৃতা বা নিজের কথা সরাসরি টেক্সটে রূপান্তর করুন। অডিও প্রসেসিং ইঞ্জিন ইনফিনিট লুপ এড়িয়ে স্বাভাবিকভাবে রেকর্ড করে।"
                    : "Hands-free study recording supporting English (US) and Bangla (BD). Features continuous speech recognition with loop protection."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <BrainCircuit size={18} className="text-[#F472B6]" />
                  {lang === "bn" ? "AI কুইজ জেনারেটর (MCQ / Q&A / Essay)" : "AI Active Recall Quizzes"}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--muted-fg)]">
                  {lang === "bn"
                    ? "নোট থেকে স্বয়ংক্রিয়ভাবে MCQ কুইজ, সংক্ষিপ্ত প্রশ্ন এবং ব্রড ডেসক্রিপটিভ উত্তর তৈরি করুন। পরীক্ষার আগে রিভিশন দেওয়ার জন্য সবচেয়ে দ্রুত উপায়।"
                    : "Instantly convert study notes into MCQs with explanations, short flashcards, or broad essay questions to test retention before exams."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Student Finance Tracker */}
          <section id="finance" className="rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#34D399] text-white shadow-[4px_4px_0_0_#1E293B]">
                <CircleDollarSign size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">4. Student Finance Tracker</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">bKash/Nagad Ledger, Debts & Savings</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-6">
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4">
                <h3 className="font-bold text-base mb-1">{lang === "bn" ? "আয়-ব্যয় লেজার" : "Income & Expenses"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                  {lang === "bn" ? "bKash, Nagad বা ক্যাশ খরচের হিসাব টাইপ বা ক্যাটাগরি অনুযায়ী ট্র্যাক করুন।" : "Log allowance, food, transport, and tutoring expenses with bKash/Nagad tags."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4">
                <h3 className="font-bold text-base mb-1">{lang === "bn" ? "ধার/কর্জ ট্র্যাকার" : "Lent & Borrowed Debts"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                  {lang === "bn" ? "বন্ধুদের কাছে পাওনা বা ধারের টাকা হিসাব রাখুন যাতে টাকা ভুলে না যান।" : "Track pending loans with peers and mark settled status to avoid forgotten debts."}
                </p>
              </div>

              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4">
                <h3 className="font-bold text-base mb-1">{lang === "bn" ? "সেভিংস গোলস" : "Savings Goals"}</h3>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                  {lang === "bn" ? "নতুন বই, কোর্স বা গ্যাজেটের জন্য জমানো টাকার প্রোগ্রেস ট্র্যাক করুন।" : "Set savings targets for gadgets, tuition, or books with real-time deposit tracking."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: AI Behavioral Coach & Daily Free Limits */}
          <section id="coach" className="rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#8B5CF6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <BrainCircuit size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">5. AI Behavioral Coach & API Quota</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">5 Free Daily Queries & Custom API Keys</p>
              </div>
            </div>

            <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-5 mt-4 space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2 text-[#059669]">
                <Sparkles size={18} />
                {lang === "bn" ? "দৈনিক ৫টি ফ্রি AI কোয়েরি (Free Tier Quota)" : "5 Free Daily AI Queries"}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-fg)]">
                {lang === "bn"
                  ? "নিজের API Key ছাড়া অ্যাপের যেকোনো ইউজার প্রতিদিন ৫টি AI কোয়েরি (কুইজ জেনারেশন, ফ্লোটিং AI চ্যাটবট) বিনামূল্যে ব্যবহার করতে পারবেন। এটি বাংলাদেশ সময় রাত ১২:০০ টায় (12:00 AM BDT) রিসেট হয়।"
                  : "Users without a custom API key get 5 free AI queries daily across the app (floating chatbot, AI notes quiz). The limit automatically resets at 12:00 AM Bangladesh Standard Time (BDT)."}
              </p>
              <div className="rounded-[12px] border-2 border-[var(--foreground)] bg-white p-3 text-xs font-semibold text-[var(--muted-fg)]">
                💡 <strong>{lang === "bn" ? "আনলিমিটেড ব্যবহারের জন্য:" : "For Unlimited AI Queries:"}</strong> {lang === "bn" ? "Settings এ গিয়ে আপনার নিজস্ব Groq বা Gemini API Key বসান।" : "Enter your custom Groq or Gemini API key in Settings for unlimited requests."}
              </div>
            </div>
          </section>

          {/* Section 6: Installation Guide */}
          <section id="installation" className="rounded-[28px] border-4 border-[var(--foreground)] bg-white p-6 shadow-[8px_8px_0_0_#1E293B] sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#3B82F6] text-white shadow-[4px_4px_0_0_#1E293B]">
                <Laptop size={24} />
              </span>
              <div>
                <h2 className="font-display text-2xl font-black">6. Extension & Companion Setup Guide</h2>
                <p className="text-xs font-bold text-[var(--muted-fg)]">How to Install Chrome Extension & Windows App</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mt-6">
              {/* Extension Instructions */}
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#ECFDF5] p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#059669]">
                  <Puzzle size={20} />
                  Chrome Extension Installation
                </h3>
                <ol className="list-decimal list-inside text-xs leading-relaxed text-[var(--muted-fg)] space-y-2">
                  <li>Landing Page থেকে <strong>Extension (ZIP)</strong> বাটন ক্লিক করে ডাউনলোড করুন।</li>
                  <li>ডাউনলোড করা ZIP ফাইলটি Unzip / Extract করুন।</li>
                  <li>Google Chrome খুলুন এবং অ্যাড্রেস বারে <code>chrome://extensions</code> লিখুন।</li>
                  <li>ডানপাশের উপরে <strong>Developer mode</strong> অপশন চালু (Toggle ON) করুন।</li>
                  <li><strong>Load unpacked</strong> বাটনে ক্লিক করে এক্সট্র্যাক্ট করা ফোল্ডারটি সিলেক্ট করুন।</li>
                  <li>Focusnyx পিন করুন এবং লগইন করে ফোকাস লক এনজয় করুন!</li>
                </ol>
              </div>

              {/* Windows Companion Instructions */}
              <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-[#F3E8FF] p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-[#7C3AED]">
                  <Laptop size={20} />
                  Windows Companion (.exe) Installation
                </h3>
                <ol className="list-decimal list-inside text-xs leading-relaxed text-[var(--muted-fg)] space-y-2">
                  <li>Landing Page থেকে <strong>Companion (Windows EXE)</strong> বাটন ক্লিক করে ZIP ডাউনলোড করুন।</li>
                  <li>ZIP ফাইল এক্সট্র্যাক্ট করে <code>FocusnyxCompanion.exe</code> ফাইলটি বের করুন।</li>
                  <li><code>FocusnyxCompanion.exe</code> ফাইলে রাইট-ক্লিক করে <strong>Run as Administrator</strong> নির্বাচন করুন।</li>
                  <li>এটি ব্যাকগ্রাউন্ডে চালু হবে এবং সিস্টেম ট্রে (Taskbar System Tray) এ আইকন দেখাবে।</li>
                  <li>ব্রাউজার ও পিসি একসাথে লক হয়ে আপনার সম্পূর্ণ মনোযোগ ধরে রাখবে!</li>
                </ol>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
