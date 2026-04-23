import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Sample Case — Approval-Gated Containment",
  description:
    "Named sample case showing how WitnessOps reviews an approval-gated containment path: authority, execution, evidence, replayability, and failure modes. This is a published sample case, not a live customer artifact.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/approval-gated-containment",
  ),
  openGraph: {
    title: "Sample Case — Approval-Gated Containment | WitnessOps",
    description:
      "Named sample case showing how WitnessOps reviews an approval-gated containment path: authority, execution, evidence, replayability, and failure modes. This is a published sample case, not a live customer artifact.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Case — Approval-Gated Containment | WitnessOps",
    description:
      "Named sample case showing how WitnessOps reviews an approval-gated containment path: authority, execution, evidence, replayability, and failure modes. This is a published sample case, not a live customer artifact.",
  },
};

const caseFacts = [
  {
    label: "Case name",
    value: "Approval-gated containment review",
  },
  {
    label: "Decision class",
    value: "Containment action requiring recorded approval before execution",
  },
  {
    label: "Primary question",
    value:
      "Did the containment action occur only after real authority was recorded, and does the evidence path survive outside the response system?",
  },
  {
    label: "Publication status",
    value:
      "Published named sample case for product explanation. Not a live customer artifact and not a claim of completed verification for your environment.",
  },
];

const reviewBoundary = [
  "Containment request and stated incident rationale",
  "Approver identity, standing, and approval event",
  "Execution path for the containment action",
  "Target-side evidence that the action actually took effect",
  "Exportable artifacts used to replay the judgment outside the operator environment",
];

const authorityMap = [
  {
    authority: "Incident operator",
    detail:
      "Requests the containment action for one bounded target based on incident context.",
  },
  {
    authority: "Containment approver",
    detail:
      "Approves, rejects, or delays the action under incident authority and policy constraints.",
  },
  {
    authority: "Execution surface",
    detail:
      "Runs the actual containment command or workflow after the gate condition is met.",
  },
  {
    authority: "Target system",
    detail:
      "Reflects the blocked account, isolated host, revoked token, or other containment result.",
  },
  {
    authority: "Evidence export path",
    detail:
      "Carries approval, execution, and target-state evidence out for later inspection.",
  },
];

const executionPath = [
  "Operator opens a containment request for one named target and one defined action.",
  "Approver reviews urgency, scope, and blast radius, then records a decision.",
  "Execution surface checks the recorded approval state before running the action.",
  "Containment action is applied to the target system or identity surface.",
  "System emits execution events and target-side state evidence.",
  "Artifacts are exported for later replay outside the source environment.",
];

const evidenceInspected = [
  "Containment request record with target, action, and incident rationale",
  "Approval event showing approver identity, time, and decision state",
  "Execution record from the workflow runner or command surface",
  "Target-side confirmation that the containment state actually changed",
  "Exported artifacts used to replay the judgment outside the source system",
];

const findings = [
  {
    title: "Approval may exist without hard pre-execution enforcement proof",
    observed:
      "The approval event is recorded, but the execution record does not always prove that the runner enforced approval as a hard gate before the action fired.",
    impact:
      "A reviewer may see both approval and execution while still lacking proof that execution was impossible before approval.",
    strongerEvidence:
      "Emit one signed artifact binding approval state, gate evaluation, execution start time, and target action ID.",
  },
  {
    title: "Target-side effect evidence can be weaker than command evidence",
    observed:
      "The workflow shows that a containment command ran, but target-side proof of the blocked or isolated state may be incomplete or delayed.",
    impact:
      "Reviewers can prove that the command was attempted without proving at the same fidelity that the target actually entered the intended containment state.",
    strongerEvidence:
      "Capture target-state confirmation alongside the execution record with stable identifiers and timestamps.",
  },
  {
    title: "Replay path may depend on incident tooling access",
    observed:
      "Judgment often relies on internal consoles, SIEM views, or response tooling that outside reviewers cannot access.",
    impact:
      "Third parties may need screenshots or operator narration instead of a portable replay path.",
    strongerEvidence:
      "Publish a bounded artifact set with request, approval, execution, target-state evidence, and replay instructions that work outside the original tooling.",
  },
];

export default function ApprovalGatedContainmentSampleCasePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <div className="space-y-8">
          <section className="space-y-4 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample case
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Approval-gated containment review
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              This is a named published sample case showing how WitnessOps would
              review a containment path that requires recorded approval before
              execution. It is a stable explanatory route, not a live customer
              artifact and not a claim of completed verification for your environment.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaButton href="/review/request" variant="primary" label="Request this review type" />
              <CtaButton href="/review/sample-report" variant="secondary" label="Compare with sample report" />
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6 md:grid-cols-2">
            {caseFacts.map((fact) => (
              <div key={fact.label}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {fact.label}
                </div>
                <p className="mt-2 text-base leading-8 text-text-secondary">
                  {fact.value}
                </p>
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Review boundary
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              {reviewBoundary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Authority map
            </h2>
            <dl className="space-y-4">
              {authorityMap.map((item) => (
                <div key={item.authority}>
                  <dt className="text-sm font-semibold text-text-primary">
                    {item.authority}
                  </dt>
                  <dd className="text-base leading-8 text-text-secondary">
                    {item.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Execution path observed
            </h2>
            <ol className="list-decimal space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              {executionPath.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Evidence inspected
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              {evidenceInspected.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Replayability judgment
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              <li>
                <span className="font-semibold text-text-primary">Potentially replayable:</span>{" "}
                request record, approval event, execution event, and target-state evidence when they share stable identifiers.
              </li>
              <li>
                <span className="font-semibold text-text-primary">Still trust-dependent:</span>{" "}
                proof that approval was technically enforced as a no-bypass gate unless the execution artifact explicitly binds the gate result.
              </li>
              <li>
                <span className="font-semibold text-text-primary">Blocking gap:</span>{" "}
                lack of one exportable artifact that binds approval, gate enforcement, action execution, and resulting target state.
              </li>
            </ul>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Integrity risks
            </h2>
            <div className="space-y-6">
              {findings.map((finding) => (
                <article key={finding.title} className="border-l-2 border-brand-accent pl-4">
                  <h3 className="text-base font-semibold text-text-primary">
                    {finding.title}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm leading-7 text-text-secondary">
                    <li>
                      <span className="font-semibold text-text-primary">Observed condition:</span>{" "}
                      {finding.observed}
                    </li>
                    <li>
                      <span className="font-semibold text-text-primary">Why it matters:</span>{" "}
                      {finding.impact}
                    </li>
                    <li>
                      <span className="font-semibold text-text-primary">Stronger evidence to close:</span>{" "}
                      {finding.strongerEvidence}
                    </li>
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Operator recommendation
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              Publish one bounded artifact set for the containment path: request,
              approver standing, gate result, execution event, target-state
              confirmation, and a replayable receipt that binds them together
              outside the source systems.
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Boundary note
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              This sample case is limited to the containment path described on
              this page. It does not claim broader incident-response assurance,
              SOC maturity, or environment-wide verification.
            </p>
          </section>
        </div>
      </SectionShell>
    </main>
  );
}
