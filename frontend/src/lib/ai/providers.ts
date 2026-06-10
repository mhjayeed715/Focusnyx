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
    const key = getStoredApiKey("groq");
    return callGroq(key, prompt, "You are a concise academic study coach. Respond in plain text with bullet points.");
  }

  // Gemini stub (not yet implemented)
  throw new Error("Gemini not yet configured. Switch to Groq in Settings.");
}

export async function askAiCoach(question: string): Promise<string> {
  const provider = getStoredProvider();
  const key = getStoredApiKey(provider);

  const systemPrompt = "You are a supportive student productivity coach. Be concise, warm, and practical. Max 3 short paragraphs.";

  if (provider === "groq") {
    return callGroq(key, question, systemPrompt);
  }

  throw new Error("Gemini not yet configured. Switch to Groq in Settings.");
}
