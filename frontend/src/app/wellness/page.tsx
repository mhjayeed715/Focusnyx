import { AppShell } from "@/components/layout/AppShell";
import { WellnessPanel } from "@/components/modules/wellness/WellnessPanel";

export default function WellnessPage() {
  return (
    <AppShell title="Wellness Shield">
      <WellnessPanel />
    </AppShell>
  );
}
