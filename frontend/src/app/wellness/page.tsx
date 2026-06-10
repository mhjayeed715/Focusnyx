import { AppShell } from "@/components/layout/AppShell";
import { WellnessPanel } from "@/components/modules/wellness/WellnessPanel";
import { WellnessSkeleton } from "@/components/ui/PageSkeleton";

export default function WellnessPage() {
  return (
    <AppShell title="Wellness Shield" skeleton={<WellnessSkeleton />}>
      <WellnessPanel />
    </AppShell>
  );
}
