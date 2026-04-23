import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Sample Review Report",
  description:
    "Illustrative sample dossier showing bounded-review structure and judgment style. This is not a live customer report and not a claim of completed verification for your system.",
  alternates: getCanonicalAlternates("witnessops", "/review/sample-report"),
  openGraph: {
    title: "Sample Review Report | WitnessOps",
    description:
      "Illustrative sample dossier showing bounded-review structure and judgment style. This is not a live customer report and not a claim of completed verification for your system.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Review Report | WitnessOps",
    description:
      "Illustrative sample dossier showing bounded-review structure and judgment style. This is not a live customer report and not a claim of completed verification for your system.",
  },
};

const statusChips = [
  { label: "Surface", value: "Illustrative sample" },
  { label: "Form", value: "Generic dossier" },
  { label: "Status", value: "Not live" },
];

const artifactManifest = [
  {
    label: "Artifact class",
    value: "Illustrative sample dossier",
  },
  {
    label: "Receipt status",
    value: "No live customer receipt published on this page",
  },
  {
    label: "Publication status",
    value: "Public generic sample report with stable route",
  },
  {
    label: "Replay scope",
    value: "Narrative dossier shape and bounded judgment pattern only",
  },
  {
    label: "Trust-dependent gaps",
    value:
      "Approval-to-execution identity binding, immutable deployment digest proof, and portable replay outside operator tooling",
  },
];

const authorityMap = [
  {
    authority: "Human approver",
    detail:
      "Approves the production change request and authorizes the deployment gate transition.",
  },
  {
    authority: "Workflow runner",
    detail:
      "Executes the approved deployment workflow and emits execution records.",
  },
  {
    authority: "Secret store",
    detail:
      "Releases deployment credentials to the runner under scoped policy.",
  },
  {
    authority: "Deployment surface",
    detail:
      "Applies the configuration change to the target environment and reports status.",
  },
  {
    authority: "Evidence store",
    detail:
      "Stores approval records, run logs, and emitted manifests for later inspection.",
  },
];

const executionPath = [
  "Operator opens change request and attaches deployment policy reference.",
  "Human approver authorizes the change request in the approval system.",
  "Workflow runner reads approval state and starts the deployment job.",
  "Runner retrieves scoped credentials from the secret store.",
  "Deployment surface applies the approved configuration change.",
  "Runner emits execution evidence and writes artifacts to evidence storage.",
];

const evidenceInspected = [
  "Policy and workflow configuration artifact",
  "Approval record from the change-management system",
  "Execution log and workflow event record",
  "Emitted deployment receipt or manifest artifact",
  "Replay/verification output from exported evidence",
];

const integrityRisks = [
  {
    title: "Authority ambiguity between approval and execution",
    observed:
      "The workflow run references an approval event, but approver identity is not cryptographically bound to the execution record.",
    whyItMatters:
      "Independent reviewers cannot prove that the same authorized decision directly governed the executed run.",
    strongerEvidence:
      "Bind approver identity, policy version, and workflow run ID in one signed artifact.",
  },
  {
    title: "Incomplete evidence capture at deployment boundary",
    observed:
      "Deployment surface status is logged, but no immutable record confirms the exact artifact digest applied.",
    whyItMatters:
      "Reviewers can see that a deployment happened but cannot independently confirm which artifact was deployed.",
    strongerEvidence:
      "Emit a signed deployment record that includes artifact digest and environment binding.",
  },
  {
    title: "Non-portable verification path",
    observed:
      "Replay steps depend on internal runner tooling that is not available outside the operator environment.",
    whyItMatters:
      "Third-party reviewers must trust operator-controlled tooling instead of replaying verification independently.",
    strongerEvidence:
      "Provide portable replay instructions and a verifier that runs on exported artifacts without internal dependencies.",
  },
];

export default function SampleReportPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <SectionShell narrow>
        <div className="space-y-8">
          <section className="space-y-4 border-b border-surface-border pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Sample report
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">
              See what a bounded review looks like
            </h1>
            <p className="text-base leading-8 text-text-secondary">
              This page is an illustrative sample of dossier structure and
              judgment style. It is not a live customer report and not a claim
              of completed verification for your system.
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
              <CtaButton href="/review/sample-cases" variant="secondary" label="Browse named sample cases" />
              <CtaButton href="/review/request" variant="primary" label="Request a workflow review" />
            </div>
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

          <section className="space-y-3 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Inspection target
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              A deployment approval workflow for a production configuration
              change: human approval, workflow execution, credential release,
              deployment action, and evidence writeback.
            </p>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Review boundary
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-base leading-8 text-text-secondary marker:text-brand-accent">
              <li>
                <span className="font-semibold text-text-primary">In scope:</span>{" "}
                approval event, workflow run, credential release gate, deployment
                execution record, and evidence export.
              </li>
              <li>
                <span className="font-semibold text-text-primary">
                  Out of scope:
                </span>{" "}
                runtime vulnerability discovery, host hardening posture, and
                unrelated operational processes.
              </li>
              <li>
                <span className="font-semibold text-text-primary">
                  Assumed available:
                </span>{" "}
                workflow policy/config artifacts, approval records, run logs,
                deployment outputs, and replay output from exported evidence.
              </li>
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
                <span className="font-semibold text-text-primary">
                  Independently replayable:
                </span>{" "}
                policy-to-workflow binding and deployment event sequence from
                exported artifacts.
              </li>
              <li>
                <span className="font-semibold text-text-primary">
                  Still operator-trust dependent:
                </span>{" "}
                identity continuity between human approval and workflow trigger.
              </li>
              <li>
                <span className="font-semibold text-text-primary">
                  Missing evidence blocking stronger conclusion:
                </span>{" "}
                immutable artifact digest attestation from deployment surface.
              </li>
            </ul>
          </section>

          <section className="space-y-4 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Integrity risks
            </h2>
            <div className="space-y-6">
              {integrityRisks.map((risk) => (
                <article key={risk.title} className="border-l-2 border-brand-accent pl-4">
                  <h3 className="text-base font-semibold text-text-primary">
                    {risk.title}
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm leading-7 text-text-secondary">
                    <li>
                      <span className="font-semibold text-text-primary">
                        Observed condition:
                      </span>{" "}
                      {risk.observed}
                    </li>
                    <li>
                      <span className="font-semibold text-text-primary">
                        Why it matters:
                      </span>{" "}
                      {risk.whyItMatters}
                    </li>
                    <li>
                      <span className="font-semibold text-text-primary">
                        Stronger evidence to close:
                      </span>{" "}
                      {risk.strongerEvidence}
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
              Bind approval identity, policy version, and deployment artifact
              digest into one signed exportable artifact. Pair that artifact
              with a portable replay script so a third party can reproduce the
              judgment path without internal operator tooling.
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-surface-border bg-surface-card/40 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
              Boundary note
            </h2>
            <p className="text-base leading-8 text-text-secondary">
              Conclusions on this page are limited to the observed execution path
              and the artifacts assumed available in this sample boundary.
            </p>
          </section>
        </div>
      </SectionShell>
    </main>
  );
}
