export interface AcademicTask {
  id: string;
  title: string;
  subject: string;
  estimatedMinutes: number;
  xpReward: number;
  completed: boolean;
}

export interface FocusSession {
  id: string;
  startedAt: string;
  durationMinutes: number;
  blockedAttempts: number;
}

export interface ExpenseEntry {
  id: string;
  amountBdt: number;
  category: string;
  createdAt: string;
}

export interface MoodEntry {
  id: string;
  mood: "low" | "neutral" | "good";
  sleepHours: number;
  createdAt: string;
}
