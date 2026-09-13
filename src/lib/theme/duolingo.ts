// Sari Duolingo design tokens — the exact palette the UI uses.
export const DUO = {
  bgTop: "#0a0a1a",
  bgBottom: "#131628",
  surface: "#1f2233",
  surfaceBorder: "rgba(255,255,255,0.06)",
  divider: "rgba(255,255,255,0.08)",

  // Brand
  purple: "#a560f0",
  purpleDark: "#7d3fbf",
  purpleLight: "#c79bf5",
  gradient: "linear-gradient(135deg, #a560f0 0%, #ff8ba7 100%)",

  // Feedback
  green: "#58cc02",
  greenDark: "#46a302",
  gold: "#ffc800",
  goldDark: "#e5a500",
  red: "#ff4b4b",
  redDark: "#cc3b3b",
  blue: "#1cb0f6",
  blueDark: "#1899d6",
  orange: "#ff9600",
  grey: "#52656d",
  greyDark: "#3a4a52",

  // Text
  text: "#ffffff",
  textSecondary: "#8e9caa",
  muted: "#52656d",
} as const;

// 3D button shadow pairs (base → pushed). "Pushed" = translateY(4px) + no shadow.
export const BTN_3D: Record<string, { bg: string; shadow: string; text: string }> = {
  green: { bg: DUO.green, shadow: DUO.greenDark, text: "#ffffff" },
  purple: { bg: DUO.purple, shadow: DUO.purpleDark, text: "#ffffff" },
  gold: { bg: DUO.gold, shadow: DUO.goldDark, text: "#854c00" },
  red: { bg: DUO.red, shadow: DUO.redDark, text: "#ffffff" },
  blue: { bg: DUO.blue, shadow: DUO.blueDark, text: "#ffffff" },
  white: { bg: "#ffffff", shadow: "#cfd6dd", text: DUO.grey },
};