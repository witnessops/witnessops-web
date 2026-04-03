export const witnessops = {
  name: "WITNESSOPS",
  domain: "witnessops.com",
  tagline: "Proof-backed security systems.",
  proofMark: "\u03C6",
  copyright: "\u00A9 WITNESSOPS Foundation",

  colors: {
    primary: "#0C0E14",
    primaryHover: "#161A24",
    secondary: "#1C2030",
    accent: "#FF6B35",
    muted: "#52556A",

    surfaceBg: "#000000",
    surfaceBgAlt: "#080A10",
    surfaceCard: "#10131C",
    surfaceBorder: "#232738",

    textPrimary: "#F0F2F8",
    textSecondary: "#B0B8CC",
    textMuted: "#6B7190",
    textInverse: "#0C0E14",

    signalGreen: "#00D47E",
    signalAmber: "#F59E0B",
    signalRed: "#EF4444",
  },

  tokens: {
    radius: "4px",
    radiusSm: "2px",
    radiusLg: "8px",
    maxWidthContent: "1200px",
    maxWidthNarrow: "720px",
    spacingSection: "120px",
    spacingSectionSm: "80px",
  },
} as const;

export type WitnessOpsBrand = typeof witnessops;
