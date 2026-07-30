import type { Metadata } from "next";
import { CtaButton } from "@/components/shared/cta-button";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";

export const metadata: Metadata = {
  title: "Bounded Review",
  description:
    "WitnessOps reviews one bounded technical action and, when scoped evidence is available, returns evidence references, receipt artifacts where produced, named limits, and a clear next step.",
  alternates: {
    canonical: "/review",
  },
  openGraph: {
    title: "Bounded Review | WitnessOps",
    description:
      "WitnessOps reviews one bounded technical action and, when scoped evidence is available, returns evidence references, receipt artifacts where produced, named limits, and a clear next step.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Bounded Review | WitnessOps",
    description:
      "WitnessOps reviews one bounded technical action and, when scoped evidence is available, returns evidence references, receipt artifacts where produced, named limits, and a clear next step.",
  },
};

const sampleBundleHref =
  "/review/sample-cases/ai-agent-action-proof-run";

const proofOutputs = [
  {
    title: "Scope map",
    summary: "The action, system, owner, and boundary under review.",
  },
  {
    title: "Evidence package",
    summary: "Available artifacts, receipts, hashes, screenshots, reports, and known gaps.",
  },
  {
    title: "Decision record",
    summary: "What changed, what was decided, and what remains outside scope.",
  },
  {
    title: "Receipt artifact",
    summary: "A generated package artifact that binds scope, action, evidence references, result, and limits when produced.",
  },
  {
    title: "Verifier path",
    summary: "Package artifacts and instructions another party can inspect offline, check, or mark out of scope.",
  },
  {
    title: "Challenge path",
    summary: "How a third party can inspect, dispute, or request stronger evidence.",
  },
];

const proofQuestions = [
  "What technical action is in scope?",
  "What workflow, repo, access path, finding, or handoff is being reviewed?",
  "What evidence supports the package?",
  "What changed or was decided?",
  "What can another party inspect offline?",
  "What remains outside scope or challengeable?",
];

const buyerFit = [
  {
    label: "For",
    value:
      "Code patches, security findings, AI-agent actions, access changes, or operational handoffs that need reviewable evidence.",
  },
  {
    label: "You get",
    value:
      "A bounded review package naming scope, evidence, receipt path where produced, limits, and the next gate.",
  },
  {
    label: "Do not submit",
    value:
      "Secrets, credentials, private keys, customer records, MFA codes, or unrelated production data.",
  },
];

const workflowTriggers = [
  "Code patches or pull requests",
  "Security findings or remediation work",
  "AI-agent actions touching code, access, or data",
  "Access, identity, exception, or approval decisions",
  "Operational handoffs that need evidence",
];

export default function ReviewPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Bounded review</div>
        <h1
          className="mt-2 max-w-3xl text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          One bounded technical action. One scoped review package.
        </h1>
        <p className="mt-5 max-w-[760px] text-base leading-8 text-text-secondary">
          Use WitnessOps when a code patch, security finding, AI-agent action,
          access decision, or operational handoff needs to be explained to
          another reviewer.
        </p>
        <p className="mt-4 max-w-[760px] text-sm leading-7 text-text-muted">
          This is not certification, production validation, or a whole-system
          audit. It is one bounded review with stated evidence, limits, and a
          path for inspection.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-surface-border bg-surface-card/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              What the package does
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
              <p>
                We name the boundary, inspect available evidence, package the
                result, preserve the receipt path, and show what another
                reviewer can inspect.
              </p>
              <p>
                No dashboard subscription. No vague audit promise. One scoped
                package for one bounded technical action.
              </p>
            </div>
          </div>
          <div className="border border-surface-border bg-surface-card/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Scope
            </h2>
            <div className="mt-4 space-y-2 text-sm leading-relaxed text-text-muted">
              <p><span className="font-semibold text-text-primary">One technical action.</span></p>
              <p><span className="font-semibold text-text-primary">One system boundary.</span></p>
              <p><span className="font-semibold text-text-primary">One evidence package.</span></p>
              <p><span className="font-semibold text-text-primary">One receipt path.</span></p>
              <p><span className="font-semibold text-text-primary">One challenge path.</span></p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-6">
          <div>
            <CtaButton href="/review/request" variant="primary" label="Start a review" />
            <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-text-muted">
              Send the non-secret fit check first.
            </p>
          </div>
          <div>
            <CtaButton href={sampleBundleHref} variant="secondary" label="Inspect sample package" />
            <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-text-muted">
              See a public sample before you request work.
            </p>
          </div>
          <div>
            <CtaButton href="/verify" variant="secondary" label="Verify a receipt" />
            <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-text-muted">
              Check receipt JSON you already have.
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
          Use this when one action needs more than chat, screenshots, or a loose report.
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
          What the review package contains
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
        <div className="kb-section-tag">Examples</div>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Inspect public example reviews
        </h2>
        <p className="mt-4 max-w-[760px] text-sm leading-relaxed text-text-muted">
          See how a bounded review is packaged before you request work: situation,
          evidence references, limits, and what another party can re-check.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <a
            href={sampleBundleHref}
            className="block border border-brand-accent/40 bg-brand-accent/5 p-4 transition-colors hover:border-brand-accent"
          >
            <h3 className="text-sm font-semibold text-text-primary">AI agent change package</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Full sample package for one approved agent change.
            </p>
          </a>
          <a
            href="/review/sample-cases/local-server-security-review"
            className="block border border-brand-accent/40 bg-brand-accent/5 p-4 transition-colors hover:border-brand-accent"
          >
            <h3 className="text-sm font-semibold text-text-primary">Local server security review</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Read-only host package with receipt path — labelled sample only.
            </p>
          </a>
          <a
            href="/review/sample-cases"
            className="block border border-surface-border bg-surface-card/40 p-4 transition-colors hover:border-brand-accent"
          >
            <h3 className="text-sm font-semibold text-text-primary">All examples</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Access, containment, local server review, and more.
            </p>
          </a>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton
            href="/review/request"
            variant="primary"
            label="Start a review"
          />
          <CtaButton
            href="/review/sample-cases"
            variant="secondary"
            label="Browse all examples"
          />
          <CtaButton
            href={sampleBundleHref}
            variant="secondary"
            label="Inspect sample package"
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
          The public sample demonstrates package shape and verifier path only.
          It does not claim production deployment, legal compliance,
          whole-system security, or independent approval. WitnessOps names what
          is evidenced, what is declared, and what remains challengeable.
        </p>
      </section>

      <div className="mt-10">
        <PublicContactRoute subject="fit-check" />
      </div>
    </main>
  );
}
