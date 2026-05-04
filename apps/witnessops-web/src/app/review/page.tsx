import type { Metadata } from "next";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "Proof-Backed Security Workflow",
  description:
    "WitnessOps packages one GitHub, Codex, AI, access, offsec, or remediation workflow into scoped evidence, a receipt, verifier result, named limits, and a challenge path.",
  alternates: {
    canonical: "/review",
  },
  openGraph: {
    title: "Proof-Backed Security Workflow | WitnessOps",
    description:
      "WitnessOps packages one GitHub, Codex, AI, access, offsec, or remediation workflow into scoped evidence, a receipt, verifier result, named limits, and a challenge path.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Proof-Backed Security Workflow | WitnessOps",
    description:
      "WitnessOps packages one GitHub, Codex, AI, access, offsec, or remediation workflow into scoped evidence, a receipt, verifier result, named limits, and a challenge path.",
  },
};

const sampleBundleHref =
  "/review/sample-cases/ai-agent-action-proof-run";

const proofOutputs = [
  {
    title: "Scope map",
    summary: "The repo, finding, workflow, system, and action boundary under review.",
  },
  {
    title: "Evidence package",
    summary: "Commands, artifacts, receipts, hashes, screenshots, reports, and known evidence gaps.",
  },
  {
    title: "Security decision record",
    summary: "What was found, fixed, blocked, deferred, or sent to human review.",
  },
  {
    title: "Signed receipt",
    summary: "A bound record of scope, action, evidence, result, and limits.",
  },
  {
    title: "Verifier result",
    summary: "What another party can independently check, fail, or mark out of scope.",
  },
  {
    title: "Challenge path",
    summary: "How a third party can inspect, dispute, or request stronger evidence.",
  },
];

const proofQuestions = [
  "What security workflow is actually in scope?",
  "What finding, repo, agent action, access path, or handoff is being reviewed?",
  "What evidence supports the claim?",
  "What was fixed, blocked, or left for a human decision?",
  "What could another party independently inspect?",
  "What remains unproven or challengeable?",
];

const buyerFit = [
  {
    label: "For",
    value:
      "GitHub security, Codex Security, AI-agent, access, offsec, or remediation workflows that need reviewable evidence.",
  },
  {
    label: "You get",
    value:
      "A scoped package naming evidence, result, receipt, verifier path, limits, and the next gate.",
  },
  {
    label: "Do not submit",
    value:
      "Secrets, credentials, private keys, customer records, MFA codes, or unrelated production data.",
  },
];

const workflowTriggers = [
  "GitHub security findings or pull requests",
  "Codex Security reports and remediation lanes",
  "AI-agent actions touching code, access, or data",
  "identity, exception, or access-change decisions",
  "governed offsec handoffs and security-operations evidence",
];

export default function ReviewPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Proof-Backed Security Workflow</div>
        <h1
          className="mt-2 max-w-3xl text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          One security workflow in. Proof package out.
        </h1>
        <p className="mt-5 max-w-[760px] text-base leading-8 text-text-secondary">
          Use WitnessOps when a GitHub finding, Codex Security report, AI-agent
          action, access decision, offsec handoff, or remediation lane needs to
          survive another reviewer.
        </p>
        <p className="mt-4 max-w-[760px] text-sm leading-7 text-text-muted">
          This is one scoped security workflow package. It is not a legal compliance
          claim, not a complete AI governance program, not a production deployment
          claim, and not a whole-environment guarantee.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-surface-border bg-surface-card/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              What the package does
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
              <p>
                We define the scope, inspect the evidence, package the result,
                preserve the receipt path, and name what another reviewer can
                inspect before the workflow is closed.
              </p>
              <p>
                No dashboard subscription. No vague audit promise. One bounded
                package for one security workflow.
              </p>
            </div>
          </div>
          <div className="border border-surface-border bg-surface-card/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Scope
            </h2>
            <div className="mt-4 space-y-2 text-sm leading-relaxed text-text-muted">
              <p><span className="font-semibold text-text-primary">One workflow.</span></p>
              <p><span className="font-semibold text-text-primary">One repo or system boundary.</span></p>
              <p><span className="font-semibold text-text-primary">One evidence package.</span></p>
              <p><span className="font-semibold text-text-primary">One result path.</span></p>
              <p><span className="font-semibold text-text-primary">One challenge path.</span></p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-6">
          <div>
            <CtaButton href="/review/request" variant="primary" label="Package one security workflow" />
            <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-text-muted">
              Send the non-secret fit check first.
            </p>
          </div>
          <div>
            <CtaButton href={sampleBundleHref} variant="secondary" label="Inspect sample package" />
            <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-text-muted">
              Inspect the receipt shape and verifier path first.
            </p>
          </div>
        </div>
        <div className="mt-8 grid gap-px border border-surface-border bg-surface-border md:grid-cols-3">
          {buyerFit.map((item) => (
            <div key={item.label} className="bg-surface-bg p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                {item.label}
              </div>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </header>

      <section className="mb-10 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Good fit</div>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Use this when the security work is too important to leave as chat, screenshots, or a loose report.
        </h2>
        <ul className="mt-6 grid gap-3 text-sm leading-relaxed text-text-muted md:grid-cols-2">
          {workflowTriggers.map((item) => (
            <li key={item} className="border border-surface-border bg-surface-card/40 p-4">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Outputs</div>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What the package contains
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {proofOutputs.map((item, index) => (
            <div key={item.title} className="border border-surface-border bg-surface-card/40 p-4">
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-brand-accent">
                {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 grid gap-6 border-b border-surface-border pb-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="kb-section-tag">Proof questions</div>
          <h2
            className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What the workflow package answers
          </h2>
        </div>
        <ul className="space-y-3 text-sm leading-relaxed text-text-muted">
          {proofQuestions.map((item) => (
            <li key={item} className="border-b border-surface-border pb-3">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section
        id="sample-bundle"
        className="mb-10 scroll-mt-24 border-b border-surface-border pb-8"
      >
        <div className="kb-section-tag">Sample bundle</div>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Inspect the public proof-package shape
        </h2>
        <p className="mt-4 max-w-[760px] text-sm leading-relaxed text-text-muted">
          The public sample shows how another party checks the action boundary,
          evidence manifest, receipt, verifier result, challenge path, and
          digest manifest after a governed action.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton
            href={sampleBundleHref}
            variant="secondary"
            label="Inspect sample package"
          />
          <CtaButton
            href="/review/request"
            variant="primary"
            label="Package one security workflow"
          />
        </div>
      </section>

      <section className="border border-surface-border bg-surface-card/40 p-5">
        <h2
          className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Boundary
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          The public sample proves receipt shape and verifier path only. It does
          not claim production deployment, legal compliance, complete AI
          governance, or whole-environment guarantee. WitnessOps names what is
          verified, what is declared, and what remains challengeable.
        </p>
      </section>
    </main>
  );
}
