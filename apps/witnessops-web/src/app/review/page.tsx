import type { Metadata } from "next";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Review",
  description:
    "Review one real workflow before you rely on it. WitnessOps returns a bounded report on who can act, what ran, what evidence exists, and what can be checked later.",
  alternates: {
    canonical: "/review",
  },
  openGraph: {
    title: "Review | WitnessOps",
    description:
      "Review one real workflow before you rely on it. WitnessOps returns a bounded report on who can act, what ran, what evidence exists, and what can be checked later.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Review | WitnessOps",
    description:
      "Review one real workflow before you rely on it. WitnessOps returns a bounded report on who can act, what ran, what evidence exists, and what can be checked later.",
  },
};

const whatYouGet = [
  "Who can approve or act",
  "Which tools and permissions matter",
  "What the execution path looks like",
  "What evidence is kept",
  "What can be replayed later",
  "What looks weak",
  "What to do next",
];

const sampleReportBullets = [
  "What was reviewed",
  "Who could act",
  "What path was observed",
  "What evidence supported the judgment",
  "What remained unclear or out of scope",
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
          Review one real workflow before you rely on it
        </h1>
        <p className="mt-4 max-w-[680px] text-sm leading-relaxed tracking-wide text-text-muted">
          Bring one workflow, one automation boundary, or one operator decision
          path. WitnessOps returns a bounded report showing who can act, what
          runs, what evidence is kept, and what another person could check later.
        </p>
        <div className="mt-6 border border-surface-border bg-surface-card/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            At a glance
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-muted">
            <li>
              <span className="font-semibold text-text-primary">Who should submit:</span>{" "}
              teams with one real workflow, one automation boundary, or one operator handoff to review.
            </li>
            <li>
              <span className="font-semibold text-text-primary">What qualifies:</span>{" "}
              one path with real approvals, execution records, and evidence.
            </li>
            <li>
              <span className="font-semibold text-text-primary">What you get:</span>{" "}
              a bounded report on authority, execution, evidence, replayability, and next steps.
            </li>
            <li>
              <span className="font-semibold text-text-primary">Out of scope:</span>{" "}
              broad audits, open-ended consulting, or claims about the whole environment.
            </li>
          </ul>
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-6">
          <div>
            <CtaButton href="/review/request" variant="primary" label="Request a review" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              Submit one workflow or control path for bounded review.
            </p>
          </div>
          <div>
            <CtaButton href="/review/sample-report" variant="secondary" label="View sample report" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              See the generic report shape before you submit a real workflow.
            </p>
          </div>
          <div>
            <CtaButton href="/review/sample-cases/privileged-access-grant" variant="secondary" label="Access grant case" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              Inspect a published privileged access grant review case.
            </p>
          </div>
          <div>
            <CtaButton href="/review/sample-cases/approval-gated-containment" variant="secondary" label="Containment case" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              Inspect a published approval-gated containment review case.
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
          AI-related workflow review
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-text-muted">
          <p>
            If a workflow includes AI assistance or AI-driven steps, the review
            stays bounded to the workflow evidence path.
          </p>
          <p>
            We check whether the authority boundary, execution path, and
            evidence package survive external review. That can include whether
            an approval existed, whether the workflow ran within defined scope,
            whether decision points were preserved, and whether the resulting
            evidence can be inspected outside the source system.
          </p>
          <p>
            This is a review of one real workflow, not a blanket judgment on an
            AI system or a legal opinion about AI Act obligations.
          </p>
          <p>
            Example: review an AI-assisted access approval, escalation, or triage
            workflow to see whether approval, execution, and evidence still line
            up under external scrutiny.
          </p>
        </div>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Scope note
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          This is a bounded review of one path. It is not a broad audit and it
          does not claim to cover everything in your stack.
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
          The result is limited to the workflow, access, and evidence available
          during review. Anything outside that boundary stays outside the claim.
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
          See what the report looks like
        </h2>
        <p className="mt-4 max-w-[680px] text-sm leading-relaxed text-text-muted">
          Open a sample dossier and inspect the exact review shape: system
          boundary, authority map, execution path, observed evidence,
          replayability judgment, and named failure modes.
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
          Built for teams that need a clear judgment on one real mechanism.
        </p>
      </section>
    </main>
  );
}
