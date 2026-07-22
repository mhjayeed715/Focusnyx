import { AcademicSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell title="Academic Forge" loading skeleton={<AcademicSkeleton />}>
      <AcademicSkeleton />
    </AppShell>
  );
}
