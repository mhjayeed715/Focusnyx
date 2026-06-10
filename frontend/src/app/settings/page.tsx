"use client";
import React, { useEffect, useState } from 'react';
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

  // Load saved values on mount
  useEffect(() => {
    try {
      const savedGemini = localStorage.getItem(STORAGE_KEY_GEMINI);
      if (savedGemini) setGeminiApiKey(savedGemini);
      const savedGroq = localStorage.getItem(STORAGE_KEY_GROQ);
      if (savedGroq) setGroqApiKey(savedGroq);
      const savedProvider = localStorage.getItem(STORAGE_AI_PROVIDER);
      if (savedProvider === 'gemini' || savedProvider === 'groq') setProvider(savedProvider);
    } catch {}
    setReady(true);
  }, []);

  // Persist changes
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

  const handleSaveKey = (val: string) => {
    if (provider === 'gemini') setGeminiApiKey(val);
    else setGroqApiKey(val);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
                    onChange={(e) => handleSaveKey(e.target.value)}
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

                <div className="flex items-center justify-between text-xs text-[var(--muted-fg)]">
                  <span>Stored in browser only · never sent to our servers</span>
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
          <div className="mt-6 flex justify-center">
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
