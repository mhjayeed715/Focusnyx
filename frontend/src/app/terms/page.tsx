"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FileCheck2, Scale, AlertCircle, HelpCircle, CheckCircle2, Shield } from "lucide-react";
import { useLanguage } from "@/components/layout/language-context";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function TermsPage() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-body">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-[var(--foreground)] bg-white shadow-[0_4px_0_0_#1E293B]">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/icons/focusnyx.png"
              alt="Focusnyx"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl border-2 border-[var(--foreground)] bg-white object-cover shadow-[3px_3px_0_0_#1E293B]"
            />
            <div>
              <p className="font-display text-lg font-black tracking-tight">Focusnyx</p>
              <p className="text-xs font-semibold text-[var(--muted-fg)]">
                {lang === "bn" ? "ব্যবহারের শর্তাবলী" : "Terms of Service"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/"
              className="secondary-button inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3 text-xs font-bold"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              {lang === "bn" ? "হোমে ফিরুন" : "Back to Home"}
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border-2 border-[var(--foreground)] bg-white p-6 sm:p-10 shadow-[8px_8px_0_0_#1E293B]">
          <div className="mb-8 flex items-center gap-4 border-b-2 border-[#E2E8F0] pb-6">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#F3E8FF] text-[#8B5CF6] shadow-[4px_4px_0_0_#1E293B]">
              <FileCheck2 size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-black text-[var(--foreground)] sm:text-4xl">
                {lang === "bn" ? "ব্যবহারের শর্তাবলী" : "Terms of Service"}
              </h1>
              <p className="mt-1 text-xs font-bold text-[var(--muted-fg)]">
                {lang === "bn" ? "সর্বশেষ আপডেট: জুলাই ২০২৬" : "Last updated: July 2026"}
              </p>
            </div>
          </div>

          {lang === "bn" ? (
            <div className="space-y-8 leading-relaxed text-[var(--foreground)] font-medium">
              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <CheckCircle2 size={20} /> ১. শর্তাবলী গ্রহণ
                </h2>
                <p className="text-sm">
                  Focusnyx (PWA, ব্রাউজার এক্সটেনশন, বা উইন্ডোজ কম্প্যানিয়ন) ব্যবহার করার মাধ্যমে আপনি এই ব্যবহারের শর্তাবলী মেনে নিতে সম্মত হচ্ছেন।
                </p>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Scale size={20} /> ২. সেবার বিবরণ
                </h2>
                <p className="text-sm">
                  Focusnyx শিক্ষার্থীদের পড়াশোনা, ফোকাস টাইম, বাজেট ও সুস্থতা ব্যবস্থার জন্য নির্মিত একটি স্টুডেন্ট লাইফ অপারেটিং সিস্টেম। এতে রয়েছে একাডেমিক ট্র্যাকার, পমোদোরো টাইমার, ব্রাউজার ফোকাস লক, স্মার্ট নোটস, এবং AI কোচ সার্ভিস।
                </p>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Shield size={20} /> ৩. অ্যাকাউন্ট নিরাপত্তা ও দায়িত্ব
                </h2>
                <ul className="ml-5 list-disc space-y-1 text-sm text-[var(--muted-fg)]">
                  <li>ব্যবহারকারী নিজ অ্যাকাউন্টের তথ্যের গোপনীয়তা রক্ষার জন্য দায়ী।</li>
                  <li>কোনো অননুমোদিত অ্যাক্সেস দেখা দিলে অবিলম্বে আমাদের অবহিত করতে হবে।</li>
                  <li>অ্যাপের কোনো ফিচার অপব্যবহার বা ক্ষতির উদ্দেশ্যে ব্যবহার করা নিষেধ।</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <AlertCircle size={20} /> ৪. দায়বদ্ধতার সীমাবদ্ধতা
                </h2>
                <p className="text-sm">
                  Focusnyx সেরা সেবা প্রদানে প্রতিশ্রুতিবদ্ধ, তবে তৃতীয় পক্ষের API (যেমন Groq, Gemini, বা Supabase) সাময়িক অনুপলব্ধতার কারণে কোনো ক্ষতির দায় বহন করে না।
                </p>
              </section>

              <section className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#F3E8FF] p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h2 className="mb-2 flex items-center gap-2 font-display text-base font-black text-[var(--foreground)]">
                  <HelpCircle size={18} /> যেকোনো প্রশ্ন?
                </h2>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                  আমাদের শর্তাবলী বা সেবার বিষয়ে জানতে মেইল করুন support@focusnyx.app ঠিকানায়।
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-8 leading-relaxed text-[var(--foreground)] font-medium">
              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <CheckCircle2 size={20} /> 1. Acceptance of Terms
                </h2>
                <p className="text-sm">
                  By accessing or using Focusnyx (PWA, Browser Extension, or Windows Companion), you agree to be bound by these Terms of Service.
                </p>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Scale size={20} /> 2. Description of Service
                </h2>
                <p className="text-sm">
                  Focusnyx provides a Student Life Operating System designed for academic tracking, focus session management, student finance logging, wellness shielding, and AI study coaching.
                </p>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Shield size={20} /> 3. Account Responsibilities
                </h2>
                <ul className="ml-5 list-disc space-y-1 text-sm text-[var(--muted-fg)]">
                  <li>Users are responsible for maintaining the confidentiality of their credentials.</li>
                  <li>Focusnyx must be notified immediately of any unauthorized account activity.</li>
                  <li>Abuse, automated scraping, or malicious disruption of service features is strictly prohibited.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <AlertCircle size={20} /> 4. Disclaimer & Limitation of Liability
                </h2>
                <p className="text-sm">
                  Focusnyx is provided &quot;as is&quot; without warranties of any kind. We are not liable for temporary downtime or external third-party API service interruptions (e.g. Groq or Gemini AI services).
                </p>
              </section>

              <section className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#F3E8FF] p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h2 className="mb-2 flex items-center gap-2 font-display text-base font-black text-[var(--foreground)]">
                  <HelpCircle size={18} /> Have Questions?
                </h2>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                  For inquiries regarding our Terms of Service, please contact support@focusnyx.app.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
