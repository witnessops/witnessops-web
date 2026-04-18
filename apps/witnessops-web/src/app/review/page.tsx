import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";
import { SectionShell } from "@/components/shared/section-shell";

export const metadata: Metadata = {
  title: "Review",
  description:
    "Review one real system before you trust it. WitnessOps returns a bounded review report on authority, execution, evidence, and replayability.",
  alternates: getCanonicalAlternates("witnessops", "/review"),
  openGraph: {
    title: "Review | WitnessOps",
    description:
      "Review one real system before you trust it. WitnessOps returns a bounded review report on authority, execution, evidence, and replayability.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
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

const sampleReportItems = [
  "What was inspected",
  "Which authorities could act",
  "Which execution path was observed",
  "Which artifacts supported judgment",
  "Which gaps blocked stronger conclusions",
];

export default function ReviewPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell>
        <div className="space-y-20">
          <section className="space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                Review
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-text-primary">
                Review one real system before you trust it
              </h1>
              <p className="max-w-3xl text-base leading-8 text-text-secondary">
                Send one workflow, one automation boundary, or one operator
                decision path. WitnessOps returns a bounded review report
                showing who can act, how execution actually happens, what
                evidence is captured, and whether the result can be
                independently replayed.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 md:gap-8">
              <div className="space-y-3">
                <CtaButton
                  label="Request a review"
                  href="/contact"
                  variant="primary"
                  className="w-full md:w-auto"
                />
                <p className="text-sm leading-7 text-text-muted">
                  Submit one real workflow, control path, or operator handoff
                  for bounded inspection.
                </p>
              </div>
              <div className="space-y-3">
                <CtaButton
                  label="View sample report"
                  href="#sample-report"
                  variant="secondary"
                  className="w-full md:w-auto"
                />
                <p className="text-sm leading-7 text-text-muted">
                  See the structure, scope, and judgment style before you
                  engage.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
              What you get
            </h2>
            <ul className="list-disc space-y-3 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              {whatYouGet.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/60 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Scope note
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              One real system. One real decision path. One bounded report. This
              is not a broad audit, not a generic security assessment, and not
              a claim of continuous assurance.
            </p>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/60 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Trust boundary note
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              Findings are limited to the workflow, access, artifacts, and
              evidence available during review. Conclusions are bounded to that
              inspection path.
            </p>
          </section>

          <section id="sample-report" className="scroll-mt-24 space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                Sample report
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                See what a bounded review looks like
              </h2>
              <p className="max-w-3xl text-base leading-8 text-text-secondary">
                Open a sample dossier and inspect the exact review shape:
                system boundary, authority map, execution path, observed
                evidence, replayability judgment, and named failure modes. No
                marketing summary in place of the report.
              </p>
            </div>
            <ul className="list-disc space-y-3 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              {sampleReportItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <p className="text-center text-sm leading-7 text-text-muted">
            Designed for teams that need a legible judgment on one real
            mechanism before wider reliance.
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
