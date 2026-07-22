import { AppShell } from "@/components/layout/AppShell";
import { PomodoroPanel } from "@/components/modules/focus/PomodoroPanel";
import { FocusSkeleton } from "@/components/ui/PageSkeleton";

export default function FocusPage() {
  return (
    <AppShell title="Focus Engine" initialCollapsed={false} confirmLogout={true} skeleton={<FocusSkeleton />}>
      <PomodoroPanel />
    </AppShell>
  );
}
