import { AppShell } from "@/components/layout/AppShell";
import { ProductivityOverview } from "@/components/modules/analytics/ProductivityOverview";
import { AnalyticsSkeleton } from "@/components/ui/PageSkeleton";

export default function AnalyticsPage() {
  return (
    <AppShell title="3-Tier Productivity Analytics" skeleton={<AnalyticsSkeleton />}>
      <ProductivityOverview />
    </AppShell>
  );
}
