import type { Metadata } from "next";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Review",
  description:
    "Review one real system before you trust it. WitnessOps returns a bounded review report on authority, execution, evidence, and replayability.",
  alternates: {
    canonical: "/review",
  },
  openGraph: {
    title: "Review | WitnessOps",
    description:
      "Review one real system before you trust it. WitnessOps returns a bounded review report on authority, execution, evidence, and replayability.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Review | WitnessOps",
    description:
      "Review one real system before you trust it. WitnessOps returns a bounded review report on authority, execution, evidence, and replayability.",
  },
};

const whatYouGet = [
  "Authority boundary map",
  "Tool and permission review",
  "Execution path inspection",
  "Evidence capture assessment",
  "Replayability judgment",
  "Concrete integrity risks",
  "Operator recommendations",
];

const sampleReportBullets = [
  "What was inspected",
  "Which authorities could act",
  "Which execution path was observed",
  "Which artifacts supported judgment",
  "Which gaps blocked stronger conclusions",
];

export default function ReviewPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-3xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Review</div>
        <h1
          className="mt-2 text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Review one real system before you trust it
        </h1>
        <p className="mt-4 max-w-[680px] text-sm leading-relaxed tracking-wide text-text-muted">
          Send one workflow, one automation boundary, or one operator decision
          path. WitnessOps returns a bounded review report showing who can act,
          how execution actually happens, what evidence is captured, and whether
          the result can be independently replayed.
        </p>
        <div className="mt-6 border border-surface-border bg-surface-card/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            At a glance
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-muted">
            <li>
              <span className="font-semibold text-text-primary">Who should submit:</span>{" "}
              teams bringing one real workflow, automation boundary, or operator handoff.
            </li>
            <li>
              <span className="font-semibold text-text-primary">What qualifies:</span>{" "}
              one path with observable approvals, execution records, and evidence artifacts.
            </li>
            <li>
              <span className="font-semibold text-text-primary">What you get:</span>{" "}
              a bounded report with authority map, execution-path inspection, evidence assessment,
              replayability judgment, and operator recommendations.
            </li>
            <li>
              <span className="font-semibold text-text-primary">Out of scope:</span>{" "}
              broad audit coverage, continuous assurance claims, and open-ended consulting.
            </li>
          </ul>
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-6">
          <div>
            <CtaButton href="/contact" variant="primary" label="Request a review" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              Submit one real workflow, control path, or operator handoff for
              bounded inspection.
            </p>
          </div>
          <div>
            <CtaButton href="/review/sample-report" variant="secondary" label="View sample report" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              Inspect the sample report first, then submit one real workflow for bounded review.
            </p>
          </div>
        </div>
      </header>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What you get
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-text-muted">
          {whatYouGet.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Scope note
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Bounded review only: one workflow path, one authority map, one evidence
          judgment. Not broad audit coverage or continuous assurance.
        </p>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Trust boundary note
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          Findings are limited to the workflow, access, artifacts, and evidence
          available during review. Conclusions are bounded to that inspection
          path.
        </p>
      </section>

      <section
        id="sample-report"
        className="mb-10 scroll-mt-24 border-b border-surface-border pb-8"
      >
        <div className="kb-section-tag">Sample report</div>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          See what a bounded review looks like
        </h2>
        <p className="mt-4 max-w-[680px] text-sm leading-relaxed text-text-muted">
          Open a sample dossier and inspect the exact review shape: system
          boundary, authority map, execution path, observed evidence,
          replayability judgment, and named failure modes. No marketing summary
          in place of the report.
        </p>
        <ul className="mt-6 space-y-2 text-sm leading-relaxed text-text-muted">
          {sampleReportBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <p
          className="text-center text-xs leading-relaxed text-text-muted"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
        >
          Designed for teams that need a legible judgment on one real mechanism
          before wider reliance.
        </p>
      </section>
    </main>
  );
}
