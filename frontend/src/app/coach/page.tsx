import { AppShell } from "@/components/layout/AppShell";
import { CoachInsightsPanel } from "@/components/modules/coach/CoachInsightsPanel";
import { CoachSkeleton } from "@/components/ui/PageSkeleton";

export default function CoachPage() {
  return (
    <AppShell title="AI Behavioral Coach" skeleton={<CoachSkeleton />}>
      <CoachInsightsPanel />
    </AppShell>
  );
}
