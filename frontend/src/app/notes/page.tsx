import { AppShell } from "@/components/layout/AppShell";
import { SmartNotesPanel } from "@/components/modules/notes/SmartNotesPanel";
import { NotesSkeleton } from "@/components/ui/PageSkeleton";

export default function NotesPage() {
  return (
    <AppShell title="Smart Notes Vault" skeleton={<NotesSkeleton />}>
      <SmartNotesPanel />
    </AppShell>
  );
}
