import type { Config } from "tailwindcss";

/**
 * VIB AI — Tailwind CSS Configuration
 *
 * Matches the Figma-extracted design tokens exactly.
 * Source of truth: design-system/tokens/*.css
 *
 * IMPORTANT: When updating tokens in CSS, sync them here too.
 */

const config: Config = {
  content: ["./design-system/**/*.{html,ts}", "./src/**/*.ts"],
  theme: {
    extend: {
      colors: {
        // Brand — Figma extracted 2026-05-05
        "vib-brand": {
          primary: "#4E41FF",
          "primary-hover": "#3A2EE8",
          "primary-muted": "#6345F7",
          "primary-soft": "rgba(78, 65, 255, 0.1)",
          gold: "#F3CE86",
          "gold-light": "#FFDE6C",
          "gold-dark": "#F7981D",
          orange: "#F88527",
        },
        // Background — dark theme default
        "vib-bg": {
          base: "#0E0E0E",
          primary: "#121212",
          secondary: "#1D1D1F",
          card: "#1F1F1F",
          "card-alt": "#262626",
          elevated: "#2B2B2B",
          hover: "#303030",
          input: "#1F1F1F",
          overlay: "rgba(5, 5, 5, 0.7)",
        },
        // Text
        "vib-text": {
          primary: "#FFFFFF",
          secondary: "#838383",
          tertiary: "#6E6E6E",
          muted: "#999999",
          link: "#4E41FF",
          "on-brand": "#FFFFFF",
        },
        // Semantic
        "vib-semantic": {
          success: "#86F3A8",
          error: "#E93055",
          warning: "#F3CE86",
          info: "#72B1FF",
        },
        // Gray scale
        "vib-gray": {
          90: "#0E0E0E",
          80: "#1F1F1F",
          70: "#303030",
          60: "#3C3C3C",
          50: "#505050",
          40: "#6E6E6E",
          30: "#858E91",
          20: "#999999",
          10: "#BABCBF",
          5: "#D5D5D5",
          0: "#FFFFFF",
        },
      },
      fontFamily: {
        cn: ["HarmonyOS Sans SC", "PingFang SC", "Noto Sans SC", "-apple-system", "sans-serif"],
        en: ["Inter", "SF Pro Text", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Consolas", "monospace"],
        display: ["HarmonyOS Sans SC", "Inter", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "vib-hero": ["8rem", { lineHeight: "1" }],
        "vib-display": ["5rem", { lineHeight: "1" }],
        "vib-h1": ["2.25rem", { lineHeight: "1.17" }],
        "vib-h2": ["2rem", { lineHeight: "1.2" }],
        "vib-h3": ["1.5rem", { lineHeight: "1.17" }],
        "vib-h4": ["1.25rem", { lineHeight: "1.2" }],
        "vib-xxl": ["1.125rem", { lineHeight: "1.43" }],
        "vib-xl": ["1.0625rem", { lineHeight: "1.43" }],
        "vib-lg": ["1rem", { lineHeight: "1.5" }],
        "vib-md": ["0.875rem", { lineHeight: "1.43" }],
        "vib-sm": ["0.8125rem", { lineHeight: "1.43" }],
        "vib-xs": ["0.75rem", { lineHeight: "1.43" }],
        "vib-2xs": ["0.625rem", { lineHeight: "1.43" }],
        "vib-3xs": ["0.5625rem", { lineHeight: "1.43" }],
      },
      spacing: {
        "vib-1": "0.25rem",
        "vib-2": "0.5rem",
        "vib-3": "0.75rem",
        "vib-4": "1rem",
        "vib-5": "1.25rem",
        "vib-6": "1.5rem",
        "vib-8": "2rem",
        "vib-10": "2.5rem",
        "vib-12": "3rem",
        "vib-16": "4rem",
        "vib-20": "5rem",
      },
      borderRadius: {
        "vib-xs": "8px",
        "vib-sm": "12px",
        "vib-md": "16px",
        "vib-lg": "20px",
        "vib-xl": "30px",
        "vib-2xl": "50px",
        "vib-full": "9999px",
      },
      boxShadow: {
        "vib-sm": "0 2px 8px rgba(0, 0, 0, 0.3)",
        "vib-md": "0 4px 16px rgba(0, 0, 0, 0.4)",
        "vib-lg": "0 8px 32px rgba(0, 0, 0, 0.5)",
        "vib-xl": "0 12px 48px rgba(0, 0, 0, 0.6)",
        "vib-gold": "0 4px 24px rgba(247, 152, 29, 0.25)",
        "vib-purple": "0 4px 24px rgba(78, 65, 255, 0.25)",
        "vib-green": "0 4px 24px rgba(134, 243, 168, 0.2)",
      },
      maxWidth: {
        "vib-screen": "402px",
      },
      transitionTimingFunction: {
        "vib-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "vib-in": "cubic-bezier(0.4, 0, 1, 1)",
        "vib-inout": "cubic-bezier(0.4, 0, 0.2, 1)",
        "vib-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
