"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, Server, UserCheck } from "lucide-react";
import { useLanguage } from "@/components/layout/language-context";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function PrivacyPage() {
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
                {lang === "bn" ? "গোপনীয়তা নীতি" : "Privacy Policy"}
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
            <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-[var(--foreground)] bg-[#ECFDF5] text-emerald-700 shadow-[4px_4px_0_0_#1E293B]">
              <ShieldCheck size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-black text-[var(--foreground)] sm:text-4xl">
                {lang === "bn" ? "গোপনীয়তা নীতি" : "Privacy Policy"}
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
                  <Eye size={20} /> ১. আমরা যে তথ্য সংগ্রহ করি
                </h2>
                <p className="text-sm">
                  Focusnyx আপনার একাডেমি এবং ফোকাস অভিজ্ঞতা পরিচালনা করতে নিম্নলিখিত তথ্য সংগ্রহ করতে পারে:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-[var(--muted-fg)]">
                  <li><strong>অ্যাকাউন্ট তথ্য:</strong> সাইনআপ ও অথেন্টিকেশনের জন্য আপনার নাম ও ইমেইল ঠিকানা।</li>
                  <li><strong>পড়াশোনা ও ফোকাস লগ:</strong> ফোকাস সেশনের সময়কাল, কাজ সম্পন্ন হওয়ার পরিসংখ্যান, এবং ডিস্ট্র্যাকশন ঘটনা।</li>
                  <li><strong>ওয়েলনেস ও ফাইন্যান্স নোট:</strong> আপনার ইচ্ছাধীন মেজাজ, ঘুম, খরচের এন্ট্রি এবং ভয়েস নোট।</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Server size={20} /> ২. তথ্যের ব্যবহার
                </h2>
                <p className="text-sm">
                  আমরা সংগৃহীত তথ্য শুধুমাত্র আপনার ব্যবহার অভিজ্ঞতা উন্নত করতে ব্যবহার করি:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-[var(--muted-fg)]">
                  <li>Nyx AI এর মাধ্যমে সাপ্তাহিক বিহেভিয়োরাল পারসোনালাইজড রিপোর্ট তৈরি করতে।</li>
                  <li>আপনার সেমিস্টার সিজিপিএ, বাজেট ও ওয়েলনেস ড্যাশবোর্ড আপডেট রাখতে।</li>
                  <li>ফোকাস লক ও ব্রাউজার ব্লক এনফোর্স করতে।</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Lock size={20} /> ৩. তথ্য সুরক্ষা ও ডেটা নিরাপত্তা
                </h2>
                <p className="text-sm">
                  আপনার ডেটা সুরক্ষিত রাখতে Supabase Row Level Security (RLS) ব্যবহার করা হয়, যার ফলে আপনার ডেটা শুধুমাত্র আপনার নিজস্ব অথেন্টিকেটেড অ্যাকাউন্ট থেকেই অ্যাক্সেসযোগ্য। আমরা কখনোই আপনার ব্যক্তিগত তথ্য কোনো তৃতীয় পক্ষের কাছে বিক্রি করি না।
                </p>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <UserCheck size={20} /> ৪. ব্রাউজার এক্সটেনশন ও পারমিশন
                </h2>
                <p className="text-sm">
                  Focusnyx ব্রাউজার এক্সটেনশন এবং উইন্ডোজ কম্প্যানিয়ন অ্যাপ শুধুমাত্র ফোকাস সেশনের সময় আপনার অনুমোদিত ব্লক করা ডোমেইন সাইটগুলো সাময়িকভাবে ফিল্টার করে। আপনার ব্রাউজিং হিস্ট্রি কোথাও আপলোড বা সেভ করা হয় না।
                </p>
              </section>

              <section className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h2 className="mb-2 flex items-center gap-2 font-display text-base font-black text-[var(--foreground)]">
                  <FileText size={18} /> প্রশ্ন বা তথ্য মুছে ফেলা?
                </h2>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                  আপনার অ্যাকাউন্ট তথ্য মুছে ফেলতে বা গোপনীয়তা নীতি সম্পর্কিত যেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করতে পারেন support@focusnyx.app এ।
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-8 leading-relaxed text-[var(--foreground)] font-medium">
              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Eye size={20} /> 1. Information We Collect
                </h2>
                <p className="text-sm">
                  Focusnyx collects information required to operate your academic and productivity dashboard:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-[var(--muted-fg)]">
                  <li><strong>Account Details:</strong> Your name and university email address used for authentication.</li>
                  <li><strong>Focus & Academic Logs:</strong> Focus session duration, completed tasks, CGPA targets, and distraction logs.</li>
                  <li><strong>Wellness & Finance Entries:</strong> Optional mood entries, sleep hours, allowance tracking, and voice notes.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Server size={20} /> 2. How We Use Information
                </h2>
                <p className="text-sm">
                  Your data is strictly utilized to power your personal Focusnyx features:
                </p>
                <ul className="mt-2 ml-5 list-disc space-y-1 text-sm text-[var(--muted-fg)]">
                  <li>Generating weekly AI behavioral study summaries via Nyx AI.</li>
                  <li>Calculating semester CGPA projections, budget health, and burnout risk scores.</li>
                  <li>Enforcing focus lock rules during your active Pomodoro sessions.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <Lock size={20} /> 3. Data Storage & Security
                </h2>
                <p className="text-sm">
                  We enforce Row Level Security (RLS) via Supabase to ensure your records are only accessible by your authenticated session. We do not sell or monetize your personal information to third parties.
                </p>
              </section>

              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-black text-[#8B5CF6]">
                  <UserCheck size={20} /> 4. Extension & Companion Privacy
                </h2>
                <p className="text-sm">
                  The Focusnyx Browser Extension and Windows Companion enforce domain restrictions locally during your active focus sessions. Your general browsing history is never tracked or transmitted.
                </p>
              </section>

              <section className="rounded-[18px] border-2 border-[var(--foreground)] bg-[#FFF7D6] p-5 shadow-[4px_4px_0_0_#1E293B]">
                <h2 className="mb-2 flex items-center gap-2 font-display text-base font-black text-[var(--foreground)]">
                  <FileText size={18} /> Questions or Data Erasure?
                </h2>
                <p className="text-xs text-[var(--muted-fg)] leading-relaxed">
                  If you have any questions or would like to request data deletion, feel free to reach out to our team at support@focusnyx.app.
                </p>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
