"use client";

import { useState, useEffect } from "react";
import { WeeklyInsightCard } from "./WeeklyInsightCard";

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
    <div className="space-y-8">
      <WeeklyInsightCard userId={resolvedUserId} />
    </div>
  );
}
