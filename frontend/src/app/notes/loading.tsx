import { NotesSkeleton } from "@/components/ui/PageSkeleton";
import { AppShell } from "@/components/layout/AppShell";

export default function Loading() {
  return (
    <AppShell title="Smart Notes Vault" loading skeleton={<NotesSkeleton />}>
      <NotesSkeleton />
    </AppShell>
  );
}
