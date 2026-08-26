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
  return getStoredApiKey(provider);
}

export async function getOrFetchApiKey(provider: "groq" | "gemini"): Promise<string> {
  return getStoredApiKey(provider);
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

  const key = await getStoredApiKeyAsync(provider);
  const systemPrompt = "You are a concise academic study coach. Respond in plain text with bullet points.";

  if (provider === "gemini" && key && key.trim().length > 10) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key.trim())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    if (!res.ok) throw new Error("Gemini plan generation failed.");
    const d = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  }

  // Fallback to Groq (custom key or free tier server proxy)
  return callGroq(key, prompt, systemPrompt);
}

export async function askAiCoach(question: string): Promise<string> {
  const provider = getStoredProvider();
  const key = await getStoredApiKeyAsync(provider);

  const systemPrompt = `You are the Focusnyx AI Academic & Productivity Assistant.
You MUST ONLY answer questions regarding Focusnyx app features, study planning, academic subjects (math, science, programming, literature, engineering, etc.), and student productivity.
If the user asks about off-topic subjects (movies, sports, pop culture gossip, gaming, general chit-chat), politely decline and state that you only answer Focusnyx app and educational questions.`;

  if (provider === "gemini" && key && key.trim().length > 10) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key.trim())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: question }] }],
      }),
    });
    if (!res.ok) throw new Error("Gemini AI Coach request failed.");
    const d = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  }

  // Fallback to Groq (custom key or free tier server proxy)
  return callGroq(key, question, systemPrompt);
}
