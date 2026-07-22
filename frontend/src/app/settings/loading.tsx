import { SettingsSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell title="Settings" loading skeleton={<SettingsSkeleton />}>
      <SettingsSkeleton />
    </AppShell>
  );
}
