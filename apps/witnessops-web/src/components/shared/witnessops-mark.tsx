"use client";

type MarkVariant = "phi" | "hex" | "diamond" | "scope" | "bounded" | "tux";
type MarkSize = "xs" | "sm" | "md" | "lg";

interface WitnessOpsMarkProps {
  /** Symbol variant */
  variant?: MarkVariant;
  /** Size preset */
  size?: MarkSize;
   /** Reserved for compatibility (no visual pulse in current flat style) */
  pulse?: boolean;
  /** Extra className */
  className?: string;
}

const SYMBOLS: Record<MarkVariant, string> = {
  phi: "\u03C6",
  hex: "\u2B21",
  diamond: "\u25C8",
  scope: "\u2295",
  bounded: "\u25A3",
  tux: "\uD83D\uDC27",
};

const SIZES: Record<MarkSize, { box: number; font: number; radius: number }> = {
  xs: { box: 16, font: 9, radius: 4 },
  sm: { box: 22, font: 10, radius: 5 },
  md: { box: 26, font: 12, radius: 6 },
  lg: { box: 32, font: 14, radius: 8 },
};

export function WitnessOpsMark({
  variant = "phi",
  size = "md",
  pulse: _pulse = false,
  className = "",
}: WitnessOpsMarkProps) {
  const s = SIZES[size];
  const isPlainHexGlyph = variant === "hex";

  return (
    <span
      className={`witnessops-mark ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: isPlainHexGlyph ? "auto" : s.box,
        height: isPlainHexGlyph ? "auto" : s.box,
        border: isPlainHexGlyph ? "none" : "1px solid var(--color-surface-border)",
        borderRadius: isPlainHexGlyph ? 0 : s.radius,
        color: isPlainHexGlyph
          ? "var(--color-text-secondary)"
          : "var(--color-brand-accent)",
        background: isPlainHexGlyph ? "transparent" : "var(--color-surface-card)",
        lineHeight: 1,
        userSelect: "none",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: isPlainHexGlyph ? Math.round(s.box * 0.72) : s.font,
          fontWeight: isPlainHexGlyph ? 600 : 500,
          color: "var(--color-text-secondary)",
        }}
      >
        {SYMBOLS[variant]}
      </span>
    </span>
  );
}
