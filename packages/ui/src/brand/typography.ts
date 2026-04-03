export const typography = {
  fontSans: "Inter, system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",

  scale: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
  },

  lineHeight: {
    tight: "1.15",
    snug: "1.3",
    normal: "1.5",
    relaxed: "1.65",
  },

  weight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export type Typography = typeof typography;
