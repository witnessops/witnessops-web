interface SparklineProps {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  values,
  color = "var(--color-brand-accent)",
  width = 80,
  height = 28,
}: SparklineProps) {
  if (values.length < 2) {
    return (
      <span style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>
        &mdash;
      </span>
    );
  }

  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / max) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      style={{ display: "block" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
