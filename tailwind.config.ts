import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#292E2B",
        input: "#1F2422",
        ring: "#A3FF00",
        background: "#080A09",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#A3FF00",
          foreground: "#080A09",
          hover: "#8BE000",
        },
        secondary: {
          DEFAULT: "#151817",
          foreground: "#FFFFFF",
          hover: "#1F2422",
        },
        destructive: {
          DEFAULT: "#FF334B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#1F2422",
          foreground: "#A0A6A2",
        },
        accent: {
          DEFAULT: "#A3FF00",
          foreground: "#080A09",
        },
        card: {
          DEFAULT: "#151817",
          foreground: "#FFFFFF",
          hover: "#1B201E",
        },
        popover: {
          DEFAULT: "#151817",
          foreground: "#FFFFFF",
        },
        athletic: {
          black: "#080A09",
          charcoal: "#151817",
          elevated: "#1F2422",
          lime: "#A3FF00",
          limeHover: "#8BE000",
          border: "#292E2B",
          textMuted: "#A0A6A2",
          danger: "#FF334B",
          warning: "#FFB800",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Impact", "Montserrat", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
