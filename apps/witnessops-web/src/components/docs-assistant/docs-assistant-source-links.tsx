import type { MouseEvent } from "react";

import {
  citationLabel,
  citationSourceHref,
  citationSourceTarget,
  docsAssistantSourceId,
  supportingCitations,
  visibleCitations,
  type DocsAssistantUiAnswer,
} from "./docs-assistant-response";

interface Props {
  answer?: DocsAssistantUiAnswer;
  citations?: DocsAssistantUiAnswer["citations"];
  compact?: boolean;
}

function focusInPageSource(
  event: MouseEvent<HTMLAnchorElement>,
  sourceId: string,
) {
  event.preventDefault();

  const target = document.getElementById(sourceId);
  target?.scrollIntoView({ block: "nearest" });
  target?.focus({ preventScroll: true });
}

export function DocsAssistantSourceLinks({
  answer,
  citations,
  compact = false,
}: Props) {
  const visible = answer
    ? supportingCitations(answer)
    : visibleCitations(citations ?? []);
  if (visible.length === 0) return null;

  const corpusCitations = visible.filter(
    (citation) => citation.source_type === "openai_file_search_result",
  );

  return (
    <div className="mt-3">
      <p
        className="mb-1.5 text-xs uppercase tracking-wider text-text-muted"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((citation) => {
          const href = citationSourceHref(citation);
          const target = citationSourceTarget(citation);
          const sourceId =
            target === "in_page" ? docsAssistantSourceId(citation) : null;

          if (!href) {
            return (
              <span
                key={citation.citation_id}
                className="rounded border border-surface-border px-2 py-0.5 text-xs text-text-muted"
              >
                {citationLabel(citation)}
              </span>
            );
          }

          return (
            <a
              key={citation.citation_id}
              href={href}
              target={target === "external" ? "_blank" : undefined}
              rel={target === "external" ? "noreferrer" : undefined}
              onClick={
                compact && sourceId
                  ? (event) => focusInPageSource(event, sourceId)
                  : undefined
              }
              className="rounded border border-surface-border px-2 py-0.5 text-xs text-text-muted transition-colors hover:border-brand-accent hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              {citationLabel(citation)}
            </a>
          );
        })}
      </div>

      {corpusCitations.length > 0 && (
        <div className="mt-2 space-y-2">
          {corpusCitations.map((citation) => (
            <div
              key={citation.citation_id}
              id={docsAssistantSourceId(citation)}
              tabIndex={-1}
              className="scroll-mt-28 rounded border border-surface-border px-3 py-2 text-xs text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <p
                className="uppercase tracking-wider"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {citation.filename} · retrieved result{" "}
                {citation.retrieved_result_index}
              </p>
              {typeof citation.source_line_start === "number" && (
                <p className="mt-1">
                  Source line {citation.source_line_start}
                  {typeof citation.source_line_end === "number" &&
                  citation.source_line_end > citation.source_line_start
                    ? `-${citation.source_line_end}`
                    : ""}
                </p>
              )}
              {citation.source_excerpt ? (
                <blockquote className="mt-2 whitespace-pre-wrap border-l border-surface-border pl-2 leading-relaxed text-text-primary">
                  {citation.source_excerpt}
                </blockquote>
              ) : (
                <p className="mt-2 leading-relaxed">
                  Exact corpus line unavailable in this citation payload. This
                  target is the retrieved file-search result for the approved
                  corpus artifact.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function boundarySourceHref(label: string): string | null {
  const base =
    "https://github.com/witnessops/witnessops-web/blob/main/docs/docs-assistant/DOCS_ASSISTANT_CORPUS_MANIFEST_RUNBOOK.md";
  const anchors: Record<string, string> = {
    source_freshness: "#L15",
    answer_correctness: "#L18",
    general_answer_correctness: "#L117",
    assistant_production_ready: "#L119",
    production_readiness: "#L20",
    public_release_approved: "#L124",
  };

  return anchors[label] ? `${base}${anchors[label]}` : null;
}
