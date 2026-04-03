"use client";

import Link from "next/link";

interface QuickActionFrameProps {
  whenToStop: string;
  escalationTrigger: string;
  evidenceRequired: string;
  nextPath: { label: string; href: string };
}

const rows = [
  { key: "whenToStop", label: "When to stop" },
  { key: "escalationTrigger", label: "Escalation trigger" },
  { key: "evidenceRequired", label: "Evidence required" },
  { key: "nextPath", label: "Next path" },
] as const;

export function QuickActionFrame({
  whenToStop,
  escalationTrigger,
  evidenceRequired,
  nextPath,
}: QuickActionFrameProps) {
  const values: Record<string, string> = {
    whenToStop,
    escalationTrigger,
    evidenceRequired,
  };

  return (
    <table
      className="my-6 w-full border-collapse border border-surface-border bg-surface-bg-alt"
      style={{ borderRadius: 0 }}
    >
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-surface-border last:border-b-0">
            <td
              className="border-l-2 border-l-brand-accent px-3 py-2 align-top"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--color-brand-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {row.label}
            </td>
            <td
              className="px-3 py-2 align-top"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                color: "var(--color-text-secondary)",
              }}
            >
              {row.key === "nextPath" ? (
                <Link
                  href={nextPath.href}
                  className="underline decoration-brand-accent/40 underline-offset-2 transition-colors hover:text-brand-accent"
                  style={{ fontSize: "12px" }}
                >
                  {nextPath.label}
                </Link>
              ) : (
                values[row.key]
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default QuickActionFrame;
