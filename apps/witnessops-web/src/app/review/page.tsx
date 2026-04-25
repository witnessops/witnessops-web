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

const whatYouGet = [
  "Authority map",
  "Agent action boundary",
  "Approval gate",
  "Evidence manifest",
  "Signed receipt",
  "Verifier result",
  "Challenge path",
  "Failure-state notes",
];

const proofQuestions = [
  "who approved the action",
  "what agent, tool, or workflow ran",
  "what system it touched",
  "what evidence was captured",
  "what result was produced",
  "what could and could not be independently verified",
  "how a third party can challenge the proof",
];

const sampleBundleHref =
  "/review/sample-cases/ai-agent-action-proof-run";

const ctaBridgeCopy = [
  "Start with one consequential agent-assisted workflow.",
  "We map the approval boundary, capture the evidence path, produce a signed receipt, and return a verifier result showing what another party can check.",
  "If the evidence is incomplete, the proof says so.",
];

export default function ReviewPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-3xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="kb-section-tag">AI Agent Action Proof Run</div>
        <h1
          className="mt-2 text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Agents act. WitnessOps proves.
        </h1>
        <p className="mt-4 max-w-[680px] text-sm leading-relaxed tracking-wide text-text-muted">
          Signed, portable proof bundles for consequential AI-agent actions.
          WitnessOps turns one agent-assisted workflow into a bounded proof run
          that a buyer, auditor, security team, or operator can inspect outside
          the vendor UI.
        </p>
        <div className="mt-6 border border-surface-border bg-surface-card/50 p-4">
          <div className="space-y-3 text-sm leading-relaxed text-text-muted">
            {ctaBridgeCopy.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
        <div className="mt-6 border border-surface-border bg-surface-card/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            At a glance
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-muted">
            <li>
              <span className="font-semibold text-text-primary">Good fit:</span>{" "}
              one consequential agent-assisted workflow touching code, support,
              finance, access, or regulated operations.
            </li>
            <li>
              <span className="font-semibold text-text-primary">Scope:</span>{" "}
              one workflow, one agent/tool path, one approval boundary, one
              evidence manifest, one signed receipt, one verifier result, and
              one challenge path.
            </li>
            <li>
              <span className="font-semibold text-text-primary">Out of scope:</span>{" "}
              production deployment, legal compliance, complete AI governance,
              or whole-environment claims.
            </li>
          </ul>
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-6">
          <div>
            <CtaButton href="/review/request" variant="primary" label="Request an AI Agent Action Proof Run" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              Submit one agent-assisted action path for scoping.
            </p>
          </div>
          <div>
            <CtaButton href={sampleBundleHref} variant="secondary" label="View sample proof run" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              Inspect the artifact list before requesting a proof run.
            </p>
          </div>
          <div>
            <CtaButton href="/review/sample-report" variant="secondary" label="View sample report" />
            <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-text-muted">
              See the older review report shape.
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
          What the proof run answers
        </h2>
        <ul className="space-y-2 text-sm leading-relaxed text-text-muted">
          {proofQuestions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2
          className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Boundary note
        </h2>
        <p className="text-sm leading-relaxed text-text-muted">
          The public sample proves the receipt shape and verifier path only. It
          does not claim production deployment, legal compliance, or complete AI
          governance coverage.
        </p>
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
        <p className="mt-4 max-w-[680px] text-sm leading-relaxed text-text-muted">
          The merged sample bundle shows the buyer-facing artifact set for an
          AI agent proposing and performing a bounded code or configuration
          change after human approval.
        </p>
        <div className="mt-6">
          <CtaButton
            href={sampleBundleHref}
            variant="secondary"
            label="Open AI Agent Action Proof Run sample"
          />
        </div>
      </section>
    </main>
  );
}
