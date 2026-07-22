import { AnalyticsSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell title="Productivity Analytics" loading skeleton={<AnalyticsSkeleton />}>
      <AnalyticsSkeleton />
    </AppShell>
  );
}
