import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        main: "var(--main)",
        background: "var(--background)",
        "secondary-background": "var(--secondary-background)",
        foreground: "var(--foreground)",
        "main-foreground": "var(--main-foreground)",
        border: "var(--border)",
        overlay: "var(--overlay)",
        ring: "var(--ring)",
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
      },
      spacing: {
        boxShadowX: "var(--box-shadow-x)",
        boxShadowY: "var(--box-shadow-y)",
        reverseBoxShadowX: "var(--reverse-box-shadow-x)",
        reverseBoxShadowY: "var(--reverse-box-shadow-y)",
      },
      borderRadius: {
        base: "var(--border-radius)",
      },
      boxShadow: {
        shadow: "var(--shadow)",
      },
      fontWeight: {
        base: "var(--base-font-weight)",
        heading: "var(--heading-font-weight)",
      },
    },
  },
  plugins: [],
};

export default config;
