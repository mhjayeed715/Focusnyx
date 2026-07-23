"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, CheckCircle2, AlertTriangle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import GradeScaleSettings from '@/components/modules/settings/GradeScaleSettings';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { APP_ROUTES } from '@/lib/constants/routes';
import { AppShell } from '@/components/layout/AppShell';
import { getGroqUsage } from '@/lib/ai/groq';
import { SettingsSkeleton } from '@/components/ui/PageSkeleton';

const STORAGE_KEY_GEMINI = 'academicAiKeyGeminiV1';
const STORAGE_KEY_GROQ = 'academicAiKeyGroqV1';
const STORAGE_AI_PROVIDER = 'academicAiProviderV1';

type AiProvider = 'gemini' | 'groq';

export default function SettingsPage() {
  const [settingsTab, setSettingsTab] = useState<'general' | 'academic'>('general');
  const [provider, setProvider] = useState<AiProvider>('groq');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState({ callsToday: 0, limit: 20, nearLimit: false });
  const [ready, setReady] = useState(false);

  // Load saved values on mount (localStorage + Supabase DB fallback)
  useEffect(() => {
    async function loadKeys() {
      let gKey = "";
      let rKey = "";
      let prov: AiProvider = "groq";

      try {
        gKey = localStorage.getItem(STORAGE_KEY_GEMINI) || "";
        rKey = localStorage.getItem(STORAGE_KEY_GROQ) || "";
        const savedProvider = localStorage.getItem(STORAGE_AI_PROVIDER);
        if (savedProvider === "gemini" || savedProvider === "groq") prov = savedProvider;
      } catch {}

      // Fetch from Supabase DB to restore keys if cache was cleared
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data: profile } = await sb
            .from("profiles")
            .select("groq_api_key, gemini_api_key, ai_provider")
            .eq("id", user.id)
            .maybeSingle();

          if (profile) {
            if (profile.groq_api_key && !rKey) rKey = profile.groq_api_key;
            if (profile.gemini_api_key && !gKey) gKey = profile.gemini_api_key;
            if (profile.ai_provider && (profile.ai_provider === "gemini" || profile.ai_provider === "groq")) {
              prov = profile.ai_provider as AiProvider;
            }
          }
        }
      } catch {}

      if (gKey) setGeminiApiKey(gKey);
      if (rKey) setGroqApiKey(rKey);
      setProvider(prov);

      try {
        if (gKey) localStorage.setItem(STORAGE_KEY_GEMINI, gKey);
        if (rKey) localStorage.setItem(STORAGE_KEY_GROQ, rKey);
        localStorage.setItem(STORAGE_AI_PROVIDER, prov);
      } catch {}

      setReady(true);
    }

    void loadKeys();
  }, []);

  // Persist changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_GEMINI, geminiApiKey);
      localStorage.setItem(STORAGE_KEY_GROQ, groqApiKey);
      localStorage.setItem(STORAGE_AI_PROVIDER, provider);
    } catch {}
  }, [geminiApiKey, groqApiKey, provider]);

  // Load usage counter — refresh on tab focus so count stays current
  useEffect(() => {
    const refresh = () => { try { setUsage(getGroqUsage()); } catch {} };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  const handleInputChange = (val: string) => {
    if (provider === "gemini") {
      setGeminiApiKey(val);
      try { localStorage.setItem(STORAGE_KEY_GEMINI, val); } catch {}
    } else {
      setGroqApiKey(val);
      try { localStorage.setItem(STORAGE_KEY_GROQ, val); } catch {}
    }
  };

  const handleProviderChange = (newProv: AiProvider) => {
    setProvider(newProv);
    try { localStorage.setItem(STORAGE_AI_PROVIDER, newProv); } catch {}
    void saveToDatabase(geminiApiKey, groqApiKey, newProv);
  };

  const saveToDatabase = async (geminiVal = geminiApiKey, groqVal = groqApiKey, provVal = provider) => {
    try {
      localStorage.setItem(STORAGE_KEY_GEMINI, geminiVal);
      localStorage.setItem(STORAGE_KEY_GROQ, groqVal);
      localStorage.setItem(STORAGE_AI_PROVIDER, provVal);

      // Persist directly to Supabase DB profiles table
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb.from("profiles").update({
          groq_api_key: groqVal.trim(),
          gemini_api_key: geminiVal.trim(),
          ai_provider: provVal,
        }).eq("id", user.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push(APP_ROUTES.auth);
  };

  return (
    <AppShell title="Settings" confirmLogout={true} loading={!ready} skeleton={<SettingsSkeleton />}>
      <section className="w-full bg-[var(--background)] text-[var(--foreground)]">
        {/* Header with back/close */}
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <h2 className="text-2xl font-display font-black">Settings</h2>
          <button onClick={() => router.back()} className="rounded-full border-2 border-[var(--foreground)] p-2">
            <X size={20} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="mt-4 flex border-b border-[var(--foreground)]">
          <button
            className={`px-4 py-2 ${settingsTab === 'general' ? 'border-b-2 border-[var(--foreground)] font-bold' : ''}`}
            onClick={() => setSettingsTab('general')}
          >
            General
          </button>
          <button
            className={`px-4 py-2 ${settingsTab === 'academic' ? 'border-b-2 border-[var(--foreground)] font-bold' : ''}`}
            onClick={() => setSettingsTab('academic')}
          >
            Academic
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {settingsTab === 'general' && (
            <>
              {/* Language */}
              <div className="rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">Language</p>
                <p className="mt-1 text-sm font-semibold text-[var(--muted-fg)]">
                  Use the EN / BN toggle at the top-right of the screen.
                </p>
              </div>

              {/* AI Integration */}
              <div className="rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">AI Provider</p>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as AiProvider)}
                  className="mt-2 w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-3 py-2 text-sm font-bold outline-none"
                >
                  <option value="gemini">Gemini</option>
                  <option value="groq">Groq</option>
                </select>
              </div>

              {/* API Key Input */}
              <div className="rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted-fg)]">
                    {provider === 'gemini' ? 'Gemini API Key' : 'Groq API Key'}
                  </p>
                  {saved && (
                    <span className="flex items-center gap-1 text-xs font-black text-[#34d399]">
                      <CheckCircle2 size={13} strokeWidth={2.5} /> Saved
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={provider === 'gemini' ? geminiApiKey : groqApiKey}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onBlur={() => void saveToDatabase()}
                    placeholder={provider === 'gemini' ? 'Enter Gemini API key' : 'gsk_...'}
                    className="w-full rounded-[10px] border-2 border-[var(--foreground)] bg-white px-3 py-2 pr-10 text-sm font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-fg)]"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void saveToDatabase()}
                    className="candy-button rounded-[10px] border-2 border-[var(--foreground)] px-4 py-2 text-xs font-black"
                  >
                    Save API Key
                  </button>
                  <span className="text-[11px] text-[var(--muted-fg)]">Saved to Profile & Browser</span>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--muted-fg)]">
                  <span>Synced securely with your Focusnyx profile</span>
                  {provider === 'groq' && (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-bold text-[#8b5cf6] hover:underline"
                    >
                      Get free key <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {/* Usage counter — Groq only */}
                {provider === 'groq' && (
                  <div className={`flex items-center gap-2 rounded-[10px] border-2 px-3 py-2 ${
                    usage.nearLimit ? 'border-[#f97316] bg-orange-50' : 'border-[var(--border)] bg-white'
                  }`}>
                    {usage.nearLimit
                      ? <AlertTriangle size={14} className="text-[#f97316] shrink-0" />
                      : <CheckCircle2 size={14} className="text-[#34d399] shrink-0" />}
                    <p className="text-xs font-semibold">
                      <span className="font-black">{usage.callsToday}</span>/{usage.limit} AI calls today
                      {usage.nearLimit ? ' — use sparingly, responses are cached for 6h' : ' — responses cached to save quota'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
          {settingsTab === 'academic' && <GradeScaleSettings />}

          {/* Coming soon placeholder */}
          <div className="rounded-[16px] border-2 border-dashed border-[var(--foreground)] bg-white p-4 text-center">
            <p className="text-sm font-semibold text-[var(--muted-fg)]">
              More settings coming soon — notifications, theme, data export.
            </p>
          </div>
          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-bold text-[var(--muted-fg)]">
            <Link href="/privacy" className="hover:text-[var(--foreground)] hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[var(--foreground)] hover:underline">
              Terms of Service
            </Link>
          </div>

          <div className="mt-4 flex justify-center">
            <button onClick={handleLogout} className="flex items-center gap-2 rounded-[18px] border-2 border-[var(--foreground)] bg-[#FDF2F8] px-4 py-3 font-bold text-[var(--foreground)] shadow-[4px_4px_0_0_#1E293B] hover:translate-y-[-2px]">
              <LogOut size={16} strokeWidth={2.5} />
              Logout
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
