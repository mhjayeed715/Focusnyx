import { AppShell } from "@/components/layout/AppShell";
import { SmartNotesPanel } from "@/components/modules/notes/SmartNotesPanel";

export default function NotesPage() {
  return (
    <AppShell title="Smart Notes Vault">
      <SmartNotesPanel />
    </AppShell>
  );
}
