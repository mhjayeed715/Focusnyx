"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, MessageSquareText, Mail, Phone, Linkedin, ArrowRight } from "lucide-react";

interface FooterProps {
  onContactClick: () => void;
  lang?: "en" | "bn";
}

export function Footer({ onContactClick, lang = "en" }: FooterProps) {
  const isBn = lang === "bn";
  return (
    <footer id="about" className="mt-auto border-t-2 border-[var(--foreground)] bg-white w-full">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid gap-8 md:grid-cols-12 pb-6">
          {/* Column 1: Brand & Socials */}
          <div className="md:col-span-6 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src="/icons/focusnyx.png"
                  alt="Focusnyx"
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-xl border-2 border-[var(--foreground)] object-cover shadow-[3px_3px_0_0_#1E293B]"
                />
                <div>
                  <p className="font-display text-xl font-black">Focusnyx</p>
                  <p className="text-xs font-semibold text-[var(--muted-fg)] leading-none mt-0.5">
                    {isBn ? "ADHD-বান্ধব স্টাডি ও ফোকাস ইঞ্জিন" : "ADHD-Friendly Study & Focus Engine"}
                  </p>
                </div>
              </div>
              <p className="max-w-md text-xs leading-5 text-[var(--muted-fg)]">
                {isBn 
                  ? "আপনার পড়াশোনা এবং একাগ্রতা বজায় রাখার জন্য একটি আধুনিক প্ল্যাটফর্ম।" 
                  : "Supercharge your productivity, lock out distractions, and master your study sessions with our ADHD-friendly workspace."}
              </p>
            </div>
            
            {/* Social Buttons */}
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://linkedin.com/in/mhjayeed715"
                target="_blank"
                rel="noreferrer"
                className="h-9 w-9 rounded-xl border-2 border-[var(--foreground)] bg-white flex items-center justify-center shadow-[3px_3px_0_0_#1E293B] hover:bg-[var(--muted)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_#1E293B]"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} strokeWidth={2.5} />
              </a>
              <button
                onClick={onContactClick}
                className="h-9 w-9 rounded-xl border-2 border-[var(--foreground)] bg-white flex items-center justify-center shadow-[3px_3px_0_0_#1E293B] hover:bg-[var(--muted)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_#1E293B]"
                aria-label="Contact Email"
              >
                <Mail size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Column 2: Help Center */}
          <div className="md:col-span-3 lg:col-span-3">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
              <ShieldCheck size={16} strokeWidth={2.5} />
              Help & Support
            </h3>
            <ul className="space-y-2 text-sm text-[var(--muted-fg)]">
              <li>
                <button
                  onClick={onContactClick}
                  className="inline-flex items-center gap-2 leading-6 transition-colors hover:text-[var(--foreground)] text-left cursor-pointer font-bold"
                >
                  <MessageSquareText size={16} strokeWidth={2.5} />
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div className="md:col-span-3 lg:col-span-4">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
              <Mail size={16} strokeWidth={2.5} />
              Get in Touch
            </h3>
            <ul className="space-y-3 text-xs font-bold text-[var(--muted-fg)]">
              <li className="flex items-center gap-2.5">
                <Mail size={14} strokeWidth={2.5} className="text-[var(--foreground)]" />
                <span>mehrabjayeed715@gmail.com</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={14} strokeWidth={2.5} className="text-[var(--foreground)]" />
                <span>+8801533652232</span>
              </li>
              <li>
                <a 
                  href="https://linkedin.com/in/mhjayeed715" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-[var(--foreground)]"
                >
                  <Linkedin size={14} strokeWidth={2.5} className="text-[var(--foreground)]" />
                  <span>linkedin.com/in/mhjayeed715</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t-2 border-[var(--foreground)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[var(--muted-fg)]">
          <p>© 2026 Focusnyx. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[var(--foreground)] hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[var(--foreground)] hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
