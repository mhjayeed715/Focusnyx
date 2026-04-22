export type AiProvider = "gemini" | "groq";

export interface GeneratePlanInput {
  subject: string;
  examDate: string;
  availableHours: number;
}

export async function generateStudyPlan(
  provider: AiProvider,
  input: GeneratePlanInput
): Promise<string> {
  const prompt = `Create a concise ADHD-friendly study plan for ${input.subject}. Exam date: ${input.examDate}. Available weekly hours: ${input.availableHours}.`;

  if (provider === "gemini") {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }
    return `GEMINI_STUB_RESPONSE: ${prompt}`;
  }

  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }
  return `GROQ_STUB_RESPONSE: ${prompt}`;
}
