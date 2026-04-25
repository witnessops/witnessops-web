import type { Metadata } from "next";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "AI Agent Action Proof Run",
  description:
    "WitnessOps produces signed, portable proof bundles for one consequential AI-agent action path, with a public sample bundle buyers can inspect.",
  alternates: {
    canonical: "/review",
  },
  openGraph: {
    title: "AI Agent Action Proof Run | WitnessOps",
    description:
      "WitnessOps produces signed, portable proof bundles for one consequential AI-agent action path, with a public sample bundle buyers can inspect.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AI Agent Action Proof Run | WitnessOps",
    description:
      "WitnessOps produces signed, portable proof bundles for one consequential AI-agent action path, with a public sample bundle buyers can inspect.",
  },
};

const sampleBundleHref =
  "/review/sample-cases/ai-agent-action-proof-run";

const proofOutputs = [
  {
    title: "Authority map",
    summary: "Who approved the action, who ran it, who reviewed it, and where authority stopped.",
  },
  {
    title: "Action boundary",
    summary: "The one workflow, one agent/tool path, and one touched system under review.",
  },
  {
    title: "Evidence manifest",
    summary: "Captured artifacts, hashes, sources, and known evidence gaps.",
  },
  {
    title: "Signed receipt",
    summary: "A bound record of approval, action, evidence, result, and limits.",
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
  "Who approved the agent action?",
  "What agent, tool, workflow, or handoff ran?",
  "What system did it touch?",
  "What evidence was captured and what was missing?",
  "What result was produced?",
  "What could another party verify or challenge?",
];

const workflowTriggers = [
  "code or configuration changes",
  "customer-support actions with tool access",
  "finance, procurement, or payment workflows",
  "access, identity, or exception approvals",
  "policy, record, or regulated-operation updates",
];

export default function ReviewPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="kb-section-tag">AI Agent Action Proof Run</div>
        <h1
          className="mt-2 max-w-3xl text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Agents act. WitnessOps proves.
        </h1>
        <p className="mt-5 max-w-[760px] text-base leading-8 text-text-secondary">
          Signed, portable proof bundles for consequential AI-agent actions.
          Start with one workflow where an agent touches code, customer records,
          finance, access, or another system someone may later audit or dispute.
        </p>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border border-surface-border bg-surface-card/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              What the first run does
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-muted">
              <p>
                We map the approval boundary, capture the evidence path,
                produce a signed receipt, and return a verifier result showing
                what another party can check.
              </p>
              <p>
                If the evidence is incomplete, the proof says so.
              </p>
            </div>
          </div>
          <div className="border border-surface-border bg-surface-card/50 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Scope
            </h2>
            <div className="mt-4 space-y-2 text-sm leading-relaxed text-text-muted">
              <p><span className="font-semibold text-text-primary">One workflow.</span></p>
              <p><span className="font-semibold text-text-primary">One action path.</span></p>
              <p><span className="font-semibold text-text-primary">One receipt.</span></p>
              <p><span className="font-semibold text-text-primary">One verifier result.</span></p>
              <p><span className="font-semibold text-text-primary">One challenge path.</span></p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-6">
          <div>
            <CtaButton href="/review/request" variant="primary" label="Request an AI Agent Action Proof Run" />
            <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-text-muted">
              Submit one agent-assisted action path for scoping.
            </p>
          </div>
          <div>
            <CtaButton href={sampleBundleHref} variant="secondary" label="View sample proof run" />
            <p className="mt-2 max-w-[300px] text-xs leading-relaxed text-text-muted">
              Inspect the receipt shape and verifier path first.
            </p>
          </div>
        </div>
      </header>

      <section className="mb-10 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Good fit</div>
        <h2
          className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Use this when agent work needs to survive later scrutiny.
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
          What you get back
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
            What the proof run answers
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
          Inspect the public proof-run shape
        </h2>
        <p className="mt-4 max-w-[760px] text-sm leading-relaxed text-text-muted">
          The public sample shows how another party checks the action boundary,
          authority map, evidence manifest, receipt, verifier result, challenge
          path, and digest manifest after an AI agent acts.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton
            href={sampleBundleHref}
            variant="secondary"
            label="Open AI Agent Action Proof Run sample"
          />
          <CtaButton
            href="/review/request"
            variant="primary"
            label="Request a proof run"
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
          governance, or whole-environment assurance. WitnessOps names what is
          verified, what is declared, and what remains challengeable.
        </p>
      </section>
    </main>
  );
}
