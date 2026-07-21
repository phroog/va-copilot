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
          pink: "#E8A598",
          purple: "#6C4E8F",
          lavender: "#B39DDB",
          peach: "#FFDAB9",
          mint: "#A8D8B9",
          coral: "#E8A598",
          bg: "#FFF8F0",
          card: "#FFFDF9",
        },
        dark: {
          bg: "#2E1E3A",
          card: "#3C2A4A",
          surface: "#4A3560",
        },
        sari: {
          ube: "#6C4E8F",
          lavender: "#B39DDB",
          peach: "#FFDAB9",
          coral: "#E8A598",
          cream: "#FFF8F0",
          plum: "#2E1E3A",
        },
      },
      borderRadius: {
        kawaii: "1rem",
        "kawaii-lg": "1.5rem",
        "kawaii-xl": "2rem",
      },
      boxShadow: {
        "sari": "0 8px 30px rgba(108,78,143,0.15)",
        "sari-sm": "0 4px 15px rgba(108,78,143,0.1)",
        "sari-lg": "0 12px 40px rgba(108,78,143,0.2)",
      },
      animation: {
        blob: "blob 7s infinite",
        "spin-slow": "spin 8s linear infinite",
        bounce: "bounce 0.5s ease-in-out",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
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
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
