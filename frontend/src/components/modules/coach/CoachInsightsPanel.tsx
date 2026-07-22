"use client";

import { WeeklyInsightCard } from "./WeeklyInsightCard";
import { DistractionPatterns } from "./DistractionPatterns";

interface CoachInsightsPanelProps {
  userId?: string;
}

export function CoachInsightsPanel({ userId }: CoachInsightsPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Weekly AI Insight Report */}
      <WeeklyInsightCard userId={userId} />

      {/* Distraction Pattern Visualizations */}
      <DistractionPatterns userId={userId} />
    </div>
  );
}
