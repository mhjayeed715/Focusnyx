import { AppShell } from "@/components/layout/AppShell";
import { ProductivityOverview } from "@/components/modules/analytics/ProductivityOverview";

export default function AnalyticsPage() {
  return (
    <AppShell title="3-Tier Productivity Analytics">
      <ProductivityOverview />
    </AppShell>
  );
}
