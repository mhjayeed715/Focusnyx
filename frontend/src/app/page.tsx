import Link from "next/link";
import { APP_ROUTES } from "@/lib/constants/routes";

export default function HomePage() {
  return (
    <main>
      <h1>Focusnyx</h1>
      <p>
        ADHD-friendly student life OS with academics, focus, finance, wellness, notes,
        AI coaching, and analytics.
      </p>
      <div className="card">
        <h2>Modules</h2>
        <ul>
          <li>
            <Link href={APP_ROUTES.dashboard}>Dashboard</Link>
          </li>
          <li>
            <Link href={APP_ROUTES.academic}>Academic Forge</Link>
          </li>
          <li>
            <Link href={APP_ROUTES.focus}>Focus Engine</Link>
          </li>
          <li>
            <Link href={APP_ROUTES.notes}>Smart Notes Vault</Link>
          </li>
          <li>
            <Link href={APP_ROUTES.finance}>Finance Tracker</Link>
          </li>
          <li>
            <Link href={APP_ROUTES.wellness}>Wellness Shield</Link>
          </li>
          <li>
            <Link href={APP_ROUTES.coach}>AI Coach</Link>
          </li>
          <li>
            <Link href={APP_ROUTES.analytics}>Analytics</Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
