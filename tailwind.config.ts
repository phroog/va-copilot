import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito"', "ui-rounded", "system-ui", "sans-serif"],
      },
      colors: {
        kawaii: {
          pink: "#F9A8D4",
          purple: "#C084FC",
          lavender: "#E9D5FF",
          peach: "#FDE68A",
          mint: "#6EE7B7",
          coral: "#FCA5A5",
          bg: "#FFF0F5",
          card: "#FFFFFF",
        },
        dark: {
          bg: "#1E1B2E",
          card: "#2D2A44",
          surface: "#3D3A5C",
        },
      },
      borderRadius: {
        kawaii: "1rem",
        "kawaii-lg": "1.5rem",
      },
      animation: {
        blob: "blob 7s infinite",
        "spin-slow": "spin 8s linear infinite",
        bounce: "bounce 0.5s ease-in-out",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
