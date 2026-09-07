import type { BuyerLocale } from "@/lib/buyer-services";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

// An authored illustration, separate from the pinned key-rotation specimen.
export function ReviewFinding({ locale = "en" }: { locale?: BuyerLocale }) {
  return (
      <article className="reviewFinding_finding" data-review-finding>
        <p className="reviewFinding_specimenLabel">{locale === "pl" ? "Fikcyjny przykład · Nie testowano systemu" : "Fictional example · No system tested"}</p>
        <p className="reviewFinding_findingMeta">{locale === "pl" ? "Ustalenie 01 · Wysoki priorytet w tym przykładzie" : "Finding 01 · High priority in this example"}</p>
        <h3 className="reviewFinding_findingTitle">{locale === "pl" ? "Narzędzie do zwrotów nie egzekwuje zasad zatwierdzania." : "The refund tool does not enforce the approval policy."}</h3>
        <dl className="reviewFinding_findingFacts">
          <div><dt>{locale === "pl" ? "Ryzyko" : "Risk"}</dt><dd>{locale === "pl" ? "Zwrot może ominąć zatwierdzenie przez człowieka." : "A refund could bypass human approval."}</dd></div>
          <div><dt>{locale === "pl" ? "Zalecana poprawka" : "Recommended fix"}</dt><dd>{locale === "pl" ? "Wymagaj zatwierdzenia w narzędziu do zwrotów przed wykonaniem działania." : "Require approval at the refund tool before execution."}</dd></div>
        </dl>
        <details className="reviewFinding_findingEvidence">
          <summary><span>{locale === "pl" ? "Zobacz materiały i proponowany test (EN)" : "View example evidence and proposed check"}</span><ChevronRight size={18} aria-hidden="true" /></summary>
          <dl className="space-y-4 pb-2 text-sm leading-6 text-text-secondary">
            <div><dt className="font-semibold text-text-primary">Fictional input A: refund policy</dt><dd>Refunds above €100 require a human approver before execution.</dd></div>
            <div><dt className="font-semibold text-text-primary">Fictional input B: tool configuration</dt><dd>The refund tool permits up to €1,000 per request and does not require an approval reference.</dd></div>
            <div><dt className="font-semibold text-text-primary">What those inputs support</dt><dd>The described tool configuration does not enforce the policy. This is a document-level inconsistency, not an observed unauthorized refund.</dd></div>
            <div><dt className="font-semibold text-text-primary">What remains unknown</dt><dd>No execution log or provider result is supplied. A separate downstream approval control may exist; its behavior has not been established.</dd></div>
            <div><dt className="font-semibold text-text-primary">Suggested owner and follow-up check</dt><dd>The tool owner should demonstrate in an agreed test environment that an above-limit request without approval stops, and that changing the approved order, amount or currency invalidates that approval. No fix or retest has been performed in this illustration.</dd></div>
          </dl>
        </details>
      </article>
  );
}

export function AgentReviewSample() {
  return (
    <section id="sample-review" aria-labelledby="sample-review-heading" className="scroll-mt-24 border-t border-surface-border py-8 md:py-10">
      <div className="mb-5 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">Synthetic example · Not customer evidence</p>
        <h2 id="sample-review-heading" className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">See what a finding looks like.</h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">Sample review excerpt: one support agent issuing refunds. All inputs and findings below are fictional; no system was tested.</p>
      </div>
      <ReviewFinding />
      <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">Your review applies this structure to the agreed action: evidence, impact, recommended fixes and explicit unknowns.</p>
      <Link href="/review/sample-cases/ai-agent-action-proof-run" className="mt-2 inline-flex min-h-11 items-center text-sm text-text-secondary underline underline-offset-4 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">Explore the separate key-rotation verification demo →</Link>
    </section>
  );
}
