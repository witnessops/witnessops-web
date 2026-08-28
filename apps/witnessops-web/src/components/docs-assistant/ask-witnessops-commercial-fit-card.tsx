import Link from "next/link";

import type { AskWitnessOpsUiAnswer } from "./ask-witnessops-response";

interface Props {
  answer: AskWitnessOpsUiAnswer;
  compact?: boolean;
  onRequestScope?: () => void;
}

const SPECIMEN_HREF =
  "/review/sample-cases/ai-agent-action-proof-run";

export function AskWitnessOpsCommercialFitCard({
  answer,
  compact = false,
  onRequestScope,
}: Props) {
  const fit = answer.commercial_fit;
  const offer = fit.offer;
  if (!offer || (fit.result !== "likely" && fit.result !== "needs_boundary")) {
    return null;
  }

  const likely = fit.result === "likely";
  const fitCheckHref = `/review/request?offerId=bounded-workflow-review&source=ask&result=${fit.result}`;
  const heading = likely
    ? fit.intent === "offer"
      ? "This is the live paid offer."
      : "This is a paid-review candidate."
    : "This needs one bounded workflow.";
  const body = likely
    ? fit.intent === "offer"
      ? "WitnessOps scopes one consequential agentic or automated workflow, then maps authority, evidence gaps, the proposed receipt shape, and the challenge path."
      : "Your non-secret description matches the stated shape of the Agent Risk & Control Review: one consequential agent or automation workflow touching a sensitive system."
    : "It may fit once it is narrowed to one named workflow, owner, consequential action, and system boundary.";

  const cardClassName = compact
    ? "mt-4 border border-brand-accent/45 bg-brand-accent/[0.06] p-3"
    : "mt-5 border border-brand-accent/45 bg-brand-accent/[0.06] p-4";
  const primaryClassName =
    "inline-flex min-h-10 items-center justify-center rounded bg-brand-accent px-3 py-2 text-center text-xs font-semibold text-text-inverse transition-colors hover:bg-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";

  return (
    <section className={cardClassName} aria-label="Commercial fit">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-accent"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Commercial fit · {likely ? "likely" : "needs boundary"}
      </p>
      <h3 className="mt-2 text-base font-semibold text-text-primary">
        {heading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{body}</p>

      {fit.intent === "workflow" && (
        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          Review focus: authority, exact action path, independent read-back,
          unresolved gaps, and the challenge path.
        </p>
      )}

      <p className="mt-3 border-l-2 border-surface-border pl-3 text-[11px] leading-relaxed text-text-muted">
        Fit signal only. No evidence was reviewed and no security, compliance,
        correctness, or action-outcome conclusion was made.
      </p>

      <div className="mt-4 border-t border-brand-accent/30 pt-3">
        <p className="text-xs font-semibold text-text-primary">{offer.name}</p>
        <p className="mt-1 text-[11px] text-text-muted">
          {offer.price_label} · {offer.unit_label}
        </p>
        <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {onRequestScope ? (
            <button
              type="button"
              onClick={onRequestScope}
              className={primaryClassName}
            >
              Request scope for this workflow
            </button>
          ) : (
            <Link href={fitCheckHref} className={primaryClassName}>
              Request scope for this workflow
            </Link>
          )}

          {fit.matching_specimen_id === "ai-agent-action-proof-run" && (
            <Link
              href={SPECIMEN_HREF}
              className="inline-flex min-h-10 items-center justify-center px-2 py-2 text-center text-xs font-semibold text-brand-accent underline decoration-brand-accent/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              Inspect matching specimen
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
