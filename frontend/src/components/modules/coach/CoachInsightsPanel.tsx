"use client";

import { useState, useEffect } from "react";
import { WeeklyInsightCard } from "./WeeklyInsightCard";
import { DistractionPatterns } from "./DistractionPatterns";

interface CoachInsightsPanelProps {
  userId?: string;
}

export function CoachInsightsPanel({ userId }: CoachInsightsPanelProps) {
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(userId);

  useEffect(() => {
    if (userId) return;
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => {
        if (data.user?.id) setResolvedUserId(data.user.id);
      });
    });
  }, [userId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <WeeklyInsightCard userId={resolvedUserId} />
      <DistractionPatterns userId={resolvedUserId} />
    </div>
  );
}
