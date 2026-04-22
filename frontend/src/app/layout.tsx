import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Focusnyx",
  description: "A unified daily operating system for Bangladeshi university students"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
