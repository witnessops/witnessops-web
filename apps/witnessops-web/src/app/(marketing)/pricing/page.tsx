import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/shared/cta-button";
import { getWorkflowSkus } from "@witnessops/catalog";

export const metadata: Metadata = {
  title: "Pricing and Commercial Scope | WitnessOps",
  description:
    "Commercial scope for WitnessOps proof-backed security workflows: one bounded workflow, no proof run starts from pricing, and fee/timing are confirmed after fit and evidence handling are agreed.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing and Commercial Scope | WitnessOps",
    description:
      "Commercial scope for WitnessOps proof-backed security workflows: one bounded workflow, no proof run starts from pricing, and fee/timing are confirmed after fit and evidence handling are agreed.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing and Commercial Scope | WitnessOps",
    description:
      "Commercial scope for WitnessOps proof-backed security workflows: one bounded workflow, no proof run starts from pricing, and fee/timing are confirmed after fit and evidence handling are agreed.",
  },
};

const commercialScope = [
  {
    label: "Primary public lane",
    value: "Proof-Backed Security Workflow",
  },
  {
    label: "Unit of sale",
    value: "One bounded security workflow packaged into scope, evidence, receipt, verifier result, limits, and challenge path.",
  },
  {
    label: "Commercial step",
    value: "Fit, scope, fee, timing, and evidence handling are confirmed by email before any source materials are accepted.",
  },
];

const includedOutputs = [
  "scope map",
  "security decision record",
  "evidence package",
  "receipt and verifier result",
  "challenge path",
  "named limits and unresolved gaps",
];

const boundaries = [
  "No proof run starts from this page.",
  "No customer evidence is accepted through pricing.",
  "No legal compliance claim is made here.",
  "No production deployment claim is made here.",
  "No complete AI governance program is promised here.",
  "Access-change scoping is handled through Support first.",
];

const nextSteps = [
  {
    title: "Inspect the sample",
    body: "Inspect the public AI-agent sample package before submitting your own security workflow.",
    href: "/review/sample-cases/ai-agent-action-proof-run",
    label: "Inspect sample package",
  },
  {
    title: "Read package offer",
    body: "See what the package returns, what fits, and what remains outside the claim boundary.",
    href: "/review",
    label: "Read package offer",
  },
  {
    title: "Package workflow",
    body: "Submit one non-secret GitHub, Codex, AI, access, offsec, or remediation workflow for the first fit check.",
    href: "/review/request",
    label: "Package one security workflow",
  },
];

export default function PricingPage() {
  const workflowSkus = getWorkflowSkus().filter((s) => s.id !== "WORKFLOW-FIT");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Pricing and commercial scope</div>
        <h1
          className="mt-2 max-w-4xl text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Price the package after the workflow is bounded.
        </h1>
        <div className="mt-6 max-w-[760px] space-y-4 text-base leading-8 text-text-secondary">
          <p>
            WitnessOps sells a bounded security-workflow package, not an open-ended
            dashboard, retainer, or broad assurance claim. The first commercial
            step is a fit check for one workflow and one evidence path.
          </p>
          <p>
            Fee, timing, and evidence handling are confirmed after the workflow,
            authority boundary, action path, and expected evidence are scoped.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton href="/review/request" variant="primary" label="Package one security workflow" />
          <CtaButton href="/review/sample-cases/ai-agent-action-proof-run" variant="secondary" label="Inspect sample package" />
        </div>
      </header>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2
          className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Workflow price anchors
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          Anchors from the{" "}
          <Link href="/catalog/workflows" className="text-brand-accent hover:underline">
            product catalog
          </Link>
          . Confirmed after scope — not self-serve checkout.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-text-secondary md:grid-cols-2">
          {workflowSkus.map((sku) => (
            <li key={sku.id} className="border border-surface-border bg-surface-card/40 p-4">
              <span className="font-semibold text-text-primary">{sku.name}</span>
              <span className="ml-2 text-brand-accent">{sku.price.display}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2
          className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Commercial contract
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {commercialScope.map((item) => (
            <div key={item.label} className="border border-surface-border bg-surface-card/40 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                {item.label}
              </div>
              <p className="mt-3 text-sm leading-7 text-text-secondary">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10 grid gap-8 border-b border-surface-border pb-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2
            className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What a workflow package returns
          </h2>
          <p className="mt-4 text-sm leading-7 text-text-muted">
            The output is an inspectable evidence package with named verification
            limits, not a broad compliance certification.
          </p>
        </div>
        <ul className="grid gap-3 text-sm leading-7 text-text-secondary md:grid-cols-2">
          {includedOutputs.map((item) => (
            <li key={item} className="border border-surface-border bg-surface-card/40 p-4">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2
          className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Boundary
        </h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {boundaries.map((item) => (
            <div key={item} className="border border-surface-border bg-surface-bg p-4 text-sm leading-7 text-text-secondary">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Next step
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {nextSteps.map((item) => (
            <div key={item.href} className="border border-surface-border bg-surface-card/40 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-text-muted">{item.body}</p>
              <div className="mt-5">
                <CtaButton href={item.href} variant="secondary" label={item.label} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
