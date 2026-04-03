"use client";

interface DocProofStripProps {
  section: string;
  slug: string[];
  lastModified?: string;
}

function computeHash(slug: string[]): string {
  const joined = slug.join("/");
  return btoa(joined).slice(0, 8);
}

function formatDate(date?: string): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

interface CellProps {
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}

function Cell({ label, value, valueColor = "#8088a4", isLast = false }: CellProps) {
  return (
    <div
      className="flex flex-col gap-0.5"
      style={{
        padding: "6px 14px",
        borderRight: isLast ? "none" : "1px solid #232738",
      }}
    >
      <span
        className="uppercase select-none"
        style={{
          fontSize: "8px",
          letterSpacing: "0.16em",
          color: "#52556a",
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "12px",
          color: valueColor,
          fontFamily: "'IBM Plex Mono', monospace",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function DocProofStrip({ section, slug, lastModified }: DocProofStripProps) {
  const hash = computeHash(slug);
  const modified = formatDate(lastModified);
  const slugDisplay = slug.join("/");

  return (
    <div
      className="flex flex-row w-full"
      style={{
        border: "1px solid #232738",
        borderRadius: 0,
      }}
    >
      <Cell label="SURFACE" value={section} />
      <Cell label="SLUG" value={slugDisplay} />
      <Cell label="MODIFIED" value={modified} />
      <Cell label="HASH" value={hash} valueColor="#ff6b35" />
      <Cell label="STATUS" value="LIVE" valueColor="#00d47e" isLast />
    </div>
  );
}
