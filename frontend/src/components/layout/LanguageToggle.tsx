"use client";

import { useLanguage } from "./language-context";

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex h-10 items-center rounded-full border-2 border-[#1E293B] bg-white p-1 shadow-[3px_3px_0_0_#1E293B] ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        style={{
          backgroundColor: lang === "en" ? "#1E293B" : "transparent",
          color: lang === "en" ? "#ffffff" : "#1E293B",
        }}
        className={`flex h-8 min-w-[3.25rem] items-center justify-center rounded-full px-3 text-xs font-black transition-all ${
          lang === "en"
            ? "border-2 border-[#1E293B] shadow-[2px_2px_0_0_#1E293B]"
            : "border-2 border-transparent hover:bg-[#F1F5F9]"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("bn")}
        aria-pressed={lang === "bn"}
        style={{
          backgroundColor: lang === "bn" ? "#1E293B" : "transparent",
          color: lang === "bn" ? "#ffffff" : "#1E293B",
        }}
        className={`flex h-8 min-w-[3.25rem] items-center justify-center rounded-full px-3 text-xs font-black transition-all ${
          lang === "bn"
            ? "border-2 border-[#1E293B] shadow-[2px_2px_0_0_#1E293B]"
            : "border-2 border-transparent hover:bg-[#F1F5F9]"
        }`}
      >
        BN
      </button>
    </div>
  );
}