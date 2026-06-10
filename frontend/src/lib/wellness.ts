// Weighting: sleep 30pts · mood 20pts · hydration 25pts · steps 25pts

type MoodKey = "awful" | "sad" | "okay" | "good" | "great";

const MOOD_SCORE: Record<MoodKey, number> = { awful: 0, sad: 5, okay: 12, good: 17, great: 20 };

export function calculateWellnessScore(opts: {
  sleepHours: number;
  moodKey: string | null;
  hydrationPct: number; // 0–100
  stepsPct: number;     // 0–100
}): number {
  // Sleep: 30pts — full at 8h, proportional down to 5h, 0 below 5h
  const sleepScore = opts.sleepHours >= 8
    ? 30
    : opts.sleepHours >= 5
    ? Math.round(((opts.sleepHours - 5) / 3) * 30)
    : 0;

  // Mood: 20pts
  const moodScore = opts.moodKey ? (MOOD_SCORE[opts.moodKey as MoodKey] ?? 0) : 0;

  // Hydration: 25pts proportional
  const hydrationScore = Math.round(Math.min(opts.hydrationPct, 100) / 100 * 25);

  // Steps: 25pts proportional
  const stepsScore = Math.round(Math.min(opts.stepsPct, 100) / 100 * 25);

  return sleepScore + moodScore + hydrationScore + stepsScore;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 55) return "#fbbf24";
  if (score >= 30) return "#f97316";
  return "#ef4444";
}
