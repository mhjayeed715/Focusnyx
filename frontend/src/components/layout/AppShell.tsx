import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants/routes";

const NAV_ITEMS = [
  { label: "Dashboard", href: APP_ROUTES.dashboard },
  { label: "Academic", href: APP_ROUTES.academic },
  { label: "Focus", href: APP_ROUTES.focus },
  { label: "Notes", href: APP_ROUTES.notes },
  { label: "Finance", href: APP_ROUTES.finance },
  { label: "Wellness", href: APP_ROUTES.wellness },
  { label: "Coach", href: APP_ROUTES.coach },
  { label: "Analytics", href: APP_ROUTES.analytics }
];

export function AppShell({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main>
      <header className="card" style={{ marginBottom: 16 }}>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </main>
  );
}
