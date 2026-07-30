"use client";

type MarkVariant = "mark" | "phi" | "hex" | "diamond" | "scope" | "bounded" | "tux";
type MarkSize = "xs" | "sm" | "md" | "lg";
type MarkTone = "white" | "black" | "current";

interface WitnessOpsMarkProps {
  /**
   * `mark` = approved geometric W (default).
   * `hex` remains accepted and renders the geometric mark (legacy navbar prop).
   * Glyph variants are retained for non-buyer decorative use only.
   */
  variant?: MarkVariant;
  /** Size preset */
  size?: MarkSize;
  /** Fill tone for the geometric mark */
  tone?: MarkTone;
  /** Reserved for compatibility (no visual pulse in current flat style) */
  pulse?: boolean;
  /**
   * When true (and geometric), mark is decorative: aria-hidden, no accessible name.
   * Use when adjacent wordmark text already names WitnessOps.
   */
  decorative?: boolean;
  /** Extra className */
  className?: string;
}

const SYMBOLS: Record<Exclude<MarkVariant, "mark" | "hex">, string> = {
  phi: "\u03C6",
  diamond: "\u25C8",
  scope: "\u2295",
  bounded: "\u25A3",
  tux: "\uD83D\uDC27",
};

const SIZES: Record<MarkSize, { box: number; font: number; radius: number; markH: number }> = {
  xs: { box: 16, font: 9, radius: 4, markH: 14 },
  sm: { box: 22, font: 10, radius: 5, markH: 18 },
  md: { box: 26, font: 12, radius: 6, markH: 22 },
  lg: { box: 32, font: 14, radius: 8, markH: 28 },
};

const TONE_FILL: Record<MarkTone, string> = {
  white: "#FFFFFF",
  black: "#0B0D10",
  current: "currentColor",
};

/** Approved geometric W — same path geometry as public/brand/witnessops-mark-*.svg */
function GeometricMark({
  height,
  fill,
  className = "",
  decorative = false,
}: {
  height: number;
  fill: string;
  className?: string;
  decorative?: boolean;
}) {
  // viewBox 746×427 — width scales with height to preserve aspect
  const width = Math.round((height * 746) / 427);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 746 427"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "WitnessOps"}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      {decorative ? null : <title>WitnessOps</title>}
      <g fill={fill} shapeRendering="geometricPrecision">
        <polygon points="0,0 269,427 372,266 474,427 746,1 663,2 474,298 373,137 270,299 83,1" />
        <polygon points="216,0 320,170 358,110 330,65 330,61 418,62 389,111 427,170 531,1" />
      </g>
    </svg>
  );
}

export function WitnessOpsMark({
  variant = "mark",
  size = "md",
  tone = "white",
  pulse: _pulse = false,
  decorative = false,
  className = "",
}: WitnessOpsMarkProps) {
  const s = SIZES[size];
  const useGeometric = variant === "mark" || variant === "hex";

  if (useGeometric) {
    return (
      <span
        className={`witnessops-mark witnessops-mark--geometric ${className}`}
        suppressHydrationWarning
        aria-hidden={decorative ? true : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        <GeometricMark height={s.markH} fill={TONE_FILL[tone]} decorative={decorative} />
      </span>
    );
  }

  return (
    <span
      className={`witnessops-mark ${className}`}
      suppressHydrationWarning
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s.box,
        height: s.box,
        border: "1px solid var(--color-surface-border)",
        borderRadius: s.radius,
        color: "var(--color-brand-accent)",
        background: "var(--color-surface-card)",
        lineHeight: 1,
        userSelect: "none",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: s.font,
          fontWeight: 500,
          color: "var(--color-text-secondary)",
        }}
      >
        {SYMBOLS[variant]}
      </span>
    </span>
  );
}
