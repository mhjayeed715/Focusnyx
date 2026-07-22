import { DashboardSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell title="Dashboard" loading skeleton={<DashboardSkeleton />}>
      <DashboardSkeleton />
    </AppShell>
  );
}
