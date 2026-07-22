import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { LanguageProvider } from "@/components/layout/language-context";
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
      url: "/icons/focusnyx.png",
    },
  ],
};

export const viewport = {
  themeColor: "#FFFDF5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakartaSans.variable}`}>
      <body style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
        <LanguageProvider>
          <div className="font-body">{children}</div>
        </LanguageProvider>
      </body>
    </html>
  );
}
