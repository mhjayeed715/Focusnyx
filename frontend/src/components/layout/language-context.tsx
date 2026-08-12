"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type Lang = "en" | "bn";
export type InteractionMode = "adhd" | "standard";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [interactionMode, setInteractionModeState] = useState<InteractionMode>("adhd");

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("lang");
      if (savedLang === "en" || savedLang === "bn") {
        setLang(savedLang);
      }
    } catch {
      // ignore
    }

    try {
      const savedMode = localStorage.getItem("interaction_mode");
      if (savedMode === "adhd" || savedMode === "standard") {
        setInteractionModeState(savedMode as InteractionMode);
      }
    } catch {
      // ignore
    }

    // Sync interaction_mode from Supabase user profile on session load
    async function syncProfileMode() {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data: profile } = await sb
            .from("profiles")
            .select("interaction_mode")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.interaction_mode && (profile.interaction_mode === "adhd" || profile.interaction_mode === "standard")) {
            setInteractionModeState(profile.interaction_mode as InteractionMode);
            localStorage.setItem("interaction_mode", profile.interaction_mode);
          }
        }
      } catch {
        // ignore
      }
    }

    void syncProfileMode();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const setInteractionMode = useCallback((nextMode: InteractionMode) => {
    setInteractionModeState(nextMode);
    try {
      localStorage.setItem("interaction_mode", nextMode);
    } catch {
      // ignore
    }

    // Async write to Supabase without blocking UI
    void (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          await sb.from("profiles").update({ interaction_mode: nextMode }).eq("id", user.id);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      interactionMode,
      setInteractionMode,
    }),
    [lang, interactionMode, setInteractionMode]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    return {
      lang: "en" as Lang,
      setLang: () => undefined,
      interactionMode: "adhd" as InteractionMode,
      setInteractionMode: () => undefined,
    };
  }

  return context;
}

export function useInteractionMode() {
  const { interactionMode, setInteractionMode } = useLanguage();
  return { interactionMode, setInteractionMode };
}