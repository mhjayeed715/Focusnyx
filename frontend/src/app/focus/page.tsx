import { AppShell } from "@/components/layout/AppShell";
import { PomodoroPanel } from "@/components/modules/focus/PomodoroPanel";

export default function FocusPage() {
  return (
    <AppShell title="Focus Engine" initialCollapsed={false} confirmLogout={true}>
      <PomodoroPanel />
    </AppShell>
  );
}
