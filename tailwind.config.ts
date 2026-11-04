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
        // ATHLIX Minimalist Light Palette
        warmWhite: "#F4F3EE",
        pureWhite: "#FFFFFF",
        midnightNavy: "#101820",
        graphite: "#202A32",
        electricLime: "#C6F432",
        steelGrey: "#8B969E",
        lightBorder: "#DCE1E3",

        // Semantic bindings
        border: "#DCE1E3",
        input: "#FFFFFF",
        ring: "#C6F432",
        background: "#F4F3EE",
        foreground: "#101820",
        primary: {
          DEFAULT: "#C6F432",
          foreground: "#101820",
          hover: "#B4E61F",
        },
        secondary: {
          DEFAULT: "#FFFFFF",
          foreground: "#101820",
          hover: "#F4F3EE",
        },
        destructive: {
          DEFAULT: "#E53E3E",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F4F3EE",
          foreground: "#8B969E",
        },
        accent: {
          DEFAULT: "#C6F432",
          foreground: "#101820",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#101820",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#101820",
        },
        athletic: {
          warmWhite: "#F4F3EE",
          white: "#FFFFFF",
          navy: "#101820",
          graphite: "#202A32",
          lime: "#C6F432",
          limeHover: "#B4E61F",
          border: "#DCE1E3",
          textMuted: "#8B969E",
          danger: "#E53E3E",
          warning: "#D97706",
          success: "#059669",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "Manrope", "system-ui", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(16, 24, 32, 0.05), 0 1px 2px 0 rgba(16, 24, 32, 0.03)",
        card: "0 2px 6px 0 rgba(16, 24, 32, 0.04), 0 1px 2px 0 rgba(16, 24, 32, 0.02)",
        lime: "0 0 0 3px rgba(198, 244, 50, 0.35)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
