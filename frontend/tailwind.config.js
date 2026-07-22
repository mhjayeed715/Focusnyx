/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-fg": "var(--muted-fg)",
        accent: "var(--accent)",
        secondary: "var(--secondary)",
        tertiary: "var(--tertiary)",
        quaternary: "var(--quaternary)",
        border: "var(--border)",
        card: "var(--card)",
        primary: "var(--accent)",
        "on-background": "var(--foreground)",
        "on-surface": "var(--foreground)",
        "on-surface-variant": "var(--muted-fg)",
        outline: "var(--border)",
        "outline-variant": "var(--border)",
        error: "#ef4444",
      },
      fontFamily: {
        display: ["var(--font-display)", "Outfit", "sans-serif"],
        body: ["var(--font-body)", "Plus Jakarta Sans", "sans-serif"],
      },
      boxShadow: {
        hard: "4px 4px 0 0 #1E293B",
        hardHover: "6px 6px 0 0 #1E293B",
        hardActive: "2px 2px 0 0 #1E293B",
        pink: "8px 8px 0 0 #F472B6",
      },
      borderRadius: {
        sm: "8px",
        md: "16px",
        lg: "24px",
        pill: "9999px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
