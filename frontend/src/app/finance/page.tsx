import { AppShell } from "@/components/layout/AppShell";
import { FinancePanel } from "@/components/modules/finance/FinancePanel";

export default function FinancePage() {
  return (
    <AppShell title="Student Finance Tracker">
      <FinancePanel />
    </AppShell>
  );
}
