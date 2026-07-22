import { CoachSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell title="AI Behavioral Coach" loading skeleton={<CoachSkeleton />}>
      <CoachSkeleton />
    </AppShell>
  );
}
