"use client";

import {
  boundaryLabel,
  type DocsAssistantUiAnswer,
} from "./docs-assistant-response";
import { boundarySourceHref } from "./docs-assistant-source-links";

interface Props {
  answer?: DocsAssistantUiAnswer;
  compact?: boolean;
}

export function DocsAssistantBoundaryMeta({ answer, compact = false }: Props) {
  if (!answer) return null;

  const notProven = answer.not_proven ?? [];
  const findings = answer.boundary_findings ?? [];
  const hasBoundary =
    answer.human_review_required || notProven.length > 0 || findings.length > 0;

  if (!hasBoundary) return null;

  const visibleNotProven = notProven.slice(0, compact ? 4 : 8);
  const remaining = notProven.length - visibleNotProven.length;

  return (
    <div className="mt-3 border-l border-surface-border pl-3 text-xs text-text-muted">
      {answer.human_review_required && (
        <p className="mb-2 text-text-primary">
          Human review is required for broader claims.
        </p>
      )}

      {visibleNotProven.length > 0 && (
        <div>
          <p
            className="mb-1.5 uppercase tracking-wider"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Not proven
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visibleNotProven.map((label) => {
              const href = boundarySourceHref(label);

              return href ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-surface-border px-2 py-0.5 transition-colors hover:border-brand-accent hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                  title="Open source line for this boundary"
                >
                  {boundaryLabel(label)}
                </a>
              ) : (
                <span
                  key={label}
                  className="rounded border border-surface-border px-2 py-0.5"
                >
                  {boundaryLabel(label)}
                </span>
              );
            })}
            {remaining > 0 && (
              <span className="rounded border border-surface-border px-2 py-0.5">
                +{remaining} more
              </span>
            )}
          </div>
        </div>
      )}

      {!compact && findings.length > 0 && (
        <p className="mt-2">
          Boundary: {findings.map(boundaryLabel).join(", ")}.
        </p>
      )}
    </div>
  );
}
