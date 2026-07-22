import { AppShell } from "@/components/layout/AppShell";
import { FinancePanel } from "@/components/modules/finance/FinancePanel";
import { FinanceSkeleton } from "@/components/ui/PageSkeleton";

export default function FinancePage() {
  return (
    <AppShell title="Student Finance Tracker" skeleton={<FinanceSkeleton />}>
      <FinancePanel />
    </AppShell>
  );
}
