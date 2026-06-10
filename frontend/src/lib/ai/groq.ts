// Groq free tier limits: ~14,400 req/day, 6,000 tokens/min
// Strategy: cache responses by prompt hash, use fastest/cheapest model, track daily calls

const MODEL = "llama-3.1-8b-instant"; // fastest & cheapest on Groq free tier
const MAX_TOKENS = 1024;               // keep responses short
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6-hour cache per prompt
const CACHE_KEY_PREFIX = "groq_cache_v1_";
const COUNTER_KEY = "groq_daily_counter_v1";
const SOFT_DAILY_LIMIT = 20; // warn user after this many calls in a day

export type GroqUsage = { callsToday: number; limit: number; nearLimit: boolean };

// ─── Daily call counter ───────────────────────────────────────

function getCounter(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; count: number };
      const today = new Date().toISOString().split("T")[0];
      if (parsed.date === today) return parsed;
    }
  } catch {}
  return { date: new Date().toISOString().split("T")[0], count: 0 };
}

function incrementCounter(): number {
  const c = getCounter();
  const updated = { date: c.date, count: c.count + 1 };
  try { localStorage.setItem(COUNTER_KEY, JSON.stringify(updated)); } catch {}
  return updated.count;
}

export function trackGroqCall(): void {
  incrementCounter();
}

export function getGroqUsage(): GroqUsage {
  const { count } = getCounter();
  return { callsToday: count, limit: SOFT_DAILY_LIMIT, nearLimit: count >= SOFT_DAILY_LIMIT * 0.75 };
}

// ─── Simple prompt hash for cache key ────────────────────────

function hashPrompt(prompt: string): string {
  let h = 0;
  for (let i = 0; i < prompt.length; i++) {
    h = ((h << 5) - h + prompt.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

// ─── Cache helpers ────────────────────────────────────────────

function getCached(prompt: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + hashPrompt(prompt));
    if (!raw) return null;
    const { text, ts } = JSON.parse(raw) as { text: string; ts: number };
    if (Date.now() - ts < CACHE_TTL_MS) return text;
    localStorage.removeItem(CACHE_KEY_PREFIX + hashPrompt(prompt));
  } catch {}
  return null;
}

function setCached(prompt: string, text: string) {
  try {
    localStorage.setItem(
      CACHE_KEY_PREFIX + hashPrompt(prompt),
      JSON.stringify({ text, ts: Date.now() }),
    );
  } catch {}
}

// ─── Main call ────────────────────────────────────────────────

export async function callGroq(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
  if (!apiKey.trim()) throw new Error("Groq API key not set. Go to Settings → AI Provider to add your key.");

  // Return cached result if available (avoids burning quota on repeated calls)
  const cached = getCached(prompt);
  if (cached) return cached;

  const { nearLimit, callsToday, limit } = getGroqUsage();
  if (nearLimit) {
    console.warn(`[Groq] ${callsToday}/${limit} calls today — approaching soft limit.`);
  }

  const messages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    { role: "user", content: prompt },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err?.error as Record<string, unknown>)?.message ?? res.statusText;
    if (res.status === 429) throw new Error("Groq rate limit hit. Wait a minute and try again.");
    if (res.status === 401) throw new Error("Invalid Groq API key. Check Settings → AI Provider.");
    throw new Error(`Groq error: ${String(msg)}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content?.trim() ?? "";

  setCached(prompt, text);
  incrementCounter();

  return text;
}
