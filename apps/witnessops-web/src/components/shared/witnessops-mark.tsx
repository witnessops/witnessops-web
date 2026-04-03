"use client";

type MarkVariant = "phi" | "hex" | "diamond" | "scope" | "bounded" | "tux";
type MarkSize = "xs" | "sm" | "md" | "lg";

interface OffsecMarkProps {
  /** Symbol variant */
  variant?: MarkVariant;
  /** Size preset */
  size?: MarkSize;
  /** Animate a subtle glow pulse */
  pulse?: boolean;
  /** Extra className */
  className?: string;
}

const SYMBOLS: Record<MarkVariant, string> = {
  phi: "\u03C6",      // φ — proof mark
  hex: "\u2B21",      // ⬡ — governance / manifest
  diamond: "\u25C8",  // ◈ — scope / target
  scope: "\u2295",    // ⊕ — controlled execution
  bounded: "\u25A3",  // ▣ — bounded system
  tux: "\uD83D\uDC27",     // 🐧 — respect the penguin
};

const SIZES: Record<MarkSize, { box: number; font: number; border: number; shadow: number }> = {
  xs: { box: 18, font: 10, border: 5, shadow: 4 },
  sm: { box: 24, font: 12, border: 6, shadow: 6 },
  md: { box: 28, font: 14, border: 8, shadow: 8 },
  lg: { box: 36, font: 18, border: 10, shadow: 10 },
};

export function OffsecMark({
  variant = "phi",
  size = "md",
  pulse = false,
  className = "",
}: OffsecMarkProps) {
  const s = SIZES[size];
  const symbol = SYMBOLS[variant];

  return (
    <span
      className={`witnessops-mark ${pulse ? "witnessops-mark--pulse" : ""} ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s.box,
        height: s.box,
        border: `1px solid rgba(255, 107, 53, 0.1)`,
        borderRadius: s.border,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: s.font,
        fontWeight: 500,
        color: "rgba(255, 140, 80, 0.92)",
        background: "linear-gradient(180deg, rgba(16, 19, 28, 0.92) 0%, rgba(8, 10, 16, 0.96) 100%)",
        boxShadow: [
          `0 0 0 1px rgba(255, 107, 53, 0.03)`,
          `inset 0 1px 0 rgba(255, 255, 255, 0.03)`,
          `0 0 ${s.shadow}px rgba(255, 107, 53, 0.06)`,
        ].join(", "),
        textShadow: `0 0 5px rgba(255, 107, 53, 0.12)`,
        lineHeight: 1,
        userSelect: "none",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {symbol}
    </span>
  );
}
