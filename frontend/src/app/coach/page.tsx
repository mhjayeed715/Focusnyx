import { AppShell } from "@/components/layout/AppShell";
import { CoachInsightsPanel } from "@/components/modules/coach/CoachInsightsPanel";

export default function CoachPage() {
  return (
    <AppShell title="AI Behavioral Coach">
      <CoachInsightsPanel />
    </AppShell>
  );
}
