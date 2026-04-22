import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";

export default function DashboardPage() {
  return (
    <AppShell title="Today Dashboard">
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <StatCard label="Today Progress" value="73%" hint="Tasks completed" />
        <StatCard label="Focus Streak" value="5 days" hint="Keep it going" />
        <StatCard label="XP Rewards" value="+35 XP" hint="From completed tasks" />
        <StatCard label="Next Pomodoro" value="25:00" hint="Ready to start" />
      </div>
    </AppShell>
  );
}
