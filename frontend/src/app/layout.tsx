import type { Metadata } from "next";
import Script from "next/script";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Focusnyx",
  description: "Student Life Operating System for Bangladeshi university students",
  icons: [
    {
      rel: "icon",
      url: "/icons/focusnyx.png"
    }
  ]
};

export const viewport = {
  themeColor: "#FFFDF5"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakartaSans.variable}`}>
      <body style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
        <Script id="tailwind-runtime-config" strategy="beforeInteractive">
          {`window.tailwind = window.tailwind || {}; window.tailwind.config = { darkMode: "class", theme: { extend: { colors: { background: "var(--background)", foreground: "var(--foreground)", muted: "var(--muted)", "muted-fg": "var(--muted-fg)", accent: "var(--accent)", secondary: "var(--secondary)", tertiary: "var(--tertiary)", quaternary: "var(--quaternary)", border: "var(--border)", card: "var(--card)", primary: "var(--accent)", "on-background": "var(--foreground)", "on-surface": "var(--foreground)", "on-surface-variant": "var(--muted-fg)", outline: "var(--border)", "outline-variant": "var(--border)", error: "#ef4444" }, fontFamily: { display: ["var(--font-display)", "sans-serif"], body: ["var(--font-body)", "sans-serif"] }, boxShadow: { hard: "4px 4px 0 0 #1E293B", hardHover: "6px 6px 0 0 #1E293B", hardActive: "2px 2px 0 0 #1E293B", pink: "8px 8px 0 0 #F472B6" }, borderRadius: { sm: "8px", md: "16px", lg: "24px", pill: "9999px" } } } };`}
        </Script>
        <Script
          src="https://cdn.tailwindcss.com?plugins=forms,container-queries"
          strategy="beforeInteractive"
        />
        <div className="font-body">{children}</div>
      </body>
    </html>
  );
}
