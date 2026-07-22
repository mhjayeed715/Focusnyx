import { WellnessSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell title="Wellness Shield" loading skeleton={<WellnessSkeleton />}>
      <WellnessSkeleton />
    </AppShell>
  );
}
