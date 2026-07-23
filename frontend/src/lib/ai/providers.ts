import { callGroq } from "./groq";

export type AiProvider = "gemini" | "groq";

const STORAGE_KEY_GROQ = "academicAiKeyGroqV1";
const STORAGE_KEY_GEMINI = "academicAiKeyGeminiV1";
const STORAGE_AI_PROVIDER = "academicAiProviderV1";

export function getStoredProvider(): AiProvider {
  try {
    const p = localStorage.getItem(STORAGE_AI_PROVIDER);
    if (p === "gemini" || p === "groq") return p;
  } catch {}
  return "groq";
}

export function getStoredApiKey(provider: AiProvider): string {
  try {
    return localStorage.getItem(provider === "groq" ? STORAGE_KEY_GROQ : STORAGE_KEY_GEMINI) ?? "";
  } catch {}
  return "";
}

export async function getStoredApiKeyAsync(provider: AiProvider): Promise<string> {
  let key = getStoredApiKey(provider);
  if (key) return key;

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: profile } = await sb
        .from("profiles")
        .select("groq_api_key, gemini_api_key")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        if (provider === "groq" && profile.groq_api_key) {
          key = profile.groq_api_key;
          try { localStorage.setItem(STORAGE_KEY_GROQ, key); } catch {}
        } else if (provider === "gemini" && profile.gemini_api_key) {
          key = profile.gemini_api_key;
          try { localStorage.setItem(STORAGE_KEY_GEMINI, key); } catch {}
        }
      }
    }
  } catch {}

  return key;
}

export interface GeneratePlanInput {
  subject: string;
  examDate: string;
  availableHours: number;
}

export async function generateStudyPlan(
  provider: AiProvider,
  input: GeneratePlanInput,
): Promise<string> {
  const prompt = `Create a concise ADHD-friendly weekly study plan for "${input.subject}". Exam date: ${input.examDate}. Available hours per week: ${input.availableHours}. Use bullet points, keep it under 300 words.`;

  if (provider === "groq") {
    const key = await getStoredApiKeyAsync("groq");
    return callGroq(key, prompt, "You are a concise academic study coach. Respond in plain text with bullet points.");
  }

  // Gemini stub (not yet implemented)
  throw new Error("Gemini not yet configured. Switch to Groq in Settings.");
}

export async function askAiCoach(question: string): Promise<string> {
  const provider = getStoredProvider();
  const key = await getStoredApiKeyAsync(provider);

  const systemPrompt = `You are the Focusnyx AI Academic & Productivity Assistant.
You MUST ONLY answer questions regarding Focusnyx app features, study planning, academic subjects (math, science, programming, literature, engineering, etc.), and student productivity.
If the user asks about off-topic subjects (movies, sports, pop culture gossip, gaming, general chit-chat), politely decline and state that you only answer Focusnyx app and educational questions.`;

  if (provider === "groq") {
    return callGroq(key, question, systemPrompt);
  }

  throw new Error("Gemini not yet configured. Switch to Groq in Settings.");
}
