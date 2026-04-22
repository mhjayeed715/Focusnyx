import { AppShell } from "@/components/layout/AppShell";
import { AcademicForgePanel } from "@/components/modules/academic/AcademicForgePanel";

export default function AcademicPage() {
  return (
    <AppShell title="Smart Academic Forge">
      <AcademicForgePanel />
    </AppShell>
  );
}
