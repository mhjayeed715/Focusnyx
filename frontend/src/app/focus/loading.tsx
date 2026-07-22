import { FocusSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell title="Focus Lock" loading skeleton={<FocusSkeleton />}>
      <FocusSkeleton />
    </AppShell>
  );
}
