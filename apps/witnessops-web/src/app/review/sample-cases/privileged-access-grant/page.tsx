import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Sample Case — Privileged Access Grant",
  description:
    "Named sample case showing how WitnessOps reviews a privileged access grant path: authority, execution, evidence, replayability, and failure modes. This is a published explanatory sample case, not a live customer artifact.",
  alternates: getCanonicalAlternates(
    "witnessops",
    "/review/sample-cases/privileged-access-grant",
  ),
  openGraph: {
    title: "Sample Case — Privileged Access Grant | WitnessOps",
    description:
      "Named sample case showing how WitnessOps reviews a privileged access grant path: authority, execution, evidence, replayability, and failure modes. This is a published explanatory sample case, not a live customer artifact.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Case — Privileged Access Grant | WitnessOps",
    description:
      "Named sample case showing how WitnessOps reviews a privileged access grant path: authority, execution, evidence, replayability, and failure modes. This is a published explanatory sample case, not a live customer artifact.",
  },
};

const statusChips = [
  { label: "Artifact class", value: "Explanatory sample case" },
  { label: "Class", value: "Workflow type" },
  { label: "Status", value: "Not live" },
];

const caseFacts = [
  {
    label: "Case name",
    value: "Privileged access grant review",
  },
  {
    label: "Decision class",
    value: "Time-bounded administrative access request",
  },
  {
    label: "Primary question",
    value:
      "Did the granted access trace back to real authority, recorded execution, and evidence that can survive outside the source system?",
  },
  {
    label: "Publication status",
    value:
      "Published named sample case for product explanation. Not a live customer artifact and not a claim of completed verification for your environment.",
  },
];

const artifactManifest = [
  {
    label: "Artifact class",
    value: "Published explanatory sample case",
  },
  {
    label: "Receipt status",
    value: "No live customer receipt published on this page",
  },
  {
    label: "Publication status",
    value: "Public named sample case with stable route",
  },
  {
    label: "Replay scope",
    value: "Narrative review path and named evidence expectations only",
  },
  {
    label: "Trust-dependent gaps",
    value:
      "Approval-to-execution binding, target-side entitlement confirmation, and portable replay outside source systems",
  },
];

const reviewBoundary = [
  "Access request record and submitted business justification",
  "Approver identity, standing, and approval event",
  "Provisioning execution path and system-side grant record",
  "Resulting entitlement evidence and exportable artifacts",
  "Replayability of the judgment outside the operator environment",
];

const authorityMap = [
  {
    authority: "Requesting operator",
    detail:
      "Requests elevated access for one bounded task and provides business justification.",
  },
  {
    authority: "Approving authority",
    detail:
      "Approves or denies the grant under role, standing, and policy constraints.",
  },
  {
    authority: "Identity platform",
    detail:
      "Applies the role or entitlement assignment and records the provisioning event.",
  },
  {
    authority: "Directory or target system",
    detail:
      "Reflects the granted privilege on the controlled surface.",
  },
  {
    authority: "Evidence export path",
    detail:
      "Carries approval, execution, and entitlement evidence out for later inspection.",
  },
];

const executionPath = [
  "Operator submits a privileged access request with a stated task and requested duration.",
  "Approver reviews standing, scope, and justification, then records a decision.",
  "Identity platform receives the approved grant instruction and applies the entitlement.",
  "Directory or target system reflects the new privilege on the named account.",
  "System emits audit events for grant creation, actor, target, and timing.",
  "Evidence is exported for later inspection outside the source workflow.",
];

const evidenceInspected = [
  "Access request record with requester identity and stated purpose",
  "Approval event showing approver identity, time, and decision state",
  "Provisioning or entitlement change record from the identity platform",
  "Target-side role or group membership evidence where available",
  "Exported artifacts used to replay the judgment outside the source system",
];

const findings = [
  {
    title: "Authority may exist but not be strongly bound to execution",
    observed:
      "The approval event exists, but the provisioning record does not always carry a durable binding back to the exact approval artifact.",
    impact:
      "A reviewer can see that approval and provisioning both happened, but may not be able to prove that this exact approval governed this exact grant without extra operator trust.",
    strongerEvidence:
      "Bind approver identity, policy version, request ID, and provisioning event ID in one signed exportable artifact.",
  },
  {
    title: "Grant evidence may stop at the identity platform boundary",
    observed:
      "The identity system records the assignment, but target-side evidence can be weaker or missing depending on the downstream surface.",
    impact:
      "A reviewer may prove that a grant was issued without being able to prove that the effective privilege appeared on the final controlled system at the same fidelity.",
    strongerEvidence:
      "Export both identity-platform assignment evidence and target-side entitlement confirmation with stable identifiers.",
  },
  {
    title: "Replay path can remain operator-dependent",
    observed:
      "Evidence often stays legible only inside the original IAM or ticketing environment.",
    impact:
      "Outside reviewers may still need screenshots, oral explanation, or privileged console access instead of a portable proof path.",
    strongerEvidence:
      "Publish a bounded artifact set with receipt, request, approval, execution, and replay instructions that work outside the operator system.",
  },
];

export default function PrivilegedAccessGrantSampleCasePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <div className="space-y-8">
          <section className="space-y-4 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample case
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              Privileged access grant review
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              This is a named published explanatory sample case showing how
              WitnessOps would review a privileged access grant path. It is a stable explanatory
              route, not a live customer artifact and not a claim of completed
              verification for your environment.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {statusChips.map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-full border border-surface-border bg-surface-bg px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-text-muted"
                >
                  <span className="font-semibold text-text-primary">{chip.label}:</span>{" "}
                  {chip.value}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <CtaButton href="/review/request" variant="primary" label="Request a Review" />
              <CtaButton href="/review/sample-report" variant="secondary" label="Compare with sample report" />
              <CtaButton href="/review/sample-cases" variant="secondary" label="Browse all named sample cases" />
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

          <section className="rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Artifact manifest
            </h2>
            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              {artifactManifest.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-sm leading-7 text-text-secondary">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
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
                request record, approver identity, provisioning event, and exported evidence when the identifiers line up across systems.
              </li>
              <li>
                <span className="font-semibold text-text-primary">Still trust-dependent:</span>{" "}
                continuity between approval intent and effective privilege if the systems do not emit one durable shared binding.
              </li>
              <li>
                <span className="font-semibold text-text-primary">Blocking gap:</span>{" "}
                lack of one exportable artifact that binds request, approval, execution, and resulting entitlement in a portable way.
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
              Publish one bounded artifact set for the grant path: request,
              approver standing, decision event, provisioning event, resulting
              entitlement evidence, and a replayable receipt that binds them
              together outside the source systems.
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Boundary note
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              This sample case is limited to the access-grant path described on
              this page. It does not claim broader IAM assurance, directory
              correctness, or environment-wide verification.
            </p>
          </section>
        </div>
      </SectionShell>
    </main>
  );
}
