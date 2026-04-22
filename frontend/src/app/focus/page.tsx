import { AppShell } from "@/components/layout/AppShell";
import { PomodoroPanel } from "@/components/modules/focus/PomodoroPanel";

export default function FocusPage() {
  return (
    <AppShell title="Dopamine Detox Engine">
      <PomodoroPanel />
    </AppShell>
  );
}
