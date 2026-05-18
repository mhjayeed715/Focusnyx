"use client";

import { useLanguage } from "./language-context";

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`inline-flex h-10 items-center rounded-full border-2 border-[var(--foreground)] bg-white p-1 shadow-[4px_4px_0_0_#1E293B] ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`nav-pill flex h-8 min-w-[3.25rem] items-center justify-center rounded-full px-3 text-xs font-black transition ${lang === "en" ? "bg-[var(--foreground)] text-white" : "text-[var(--foreground)]"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("bn")}
        aria-pressed={lang === "bn"}
        className={`nav-pill flex h-8 min-w-[3.25rem] items-center justify-center rounded-full px-3 text-xs font-black transition ${lang === "bn" ? "bg-[var(--foreground)] text-white" : "text-[var(--foreground)]"}`}
      >
        BN
      </button>
    </div>
  );
}