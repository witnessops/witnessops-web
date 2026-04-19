import type { Metadata } from "next";
import Link from "next/link";
import { getSurfaceUrl } from "@witnessops/config";
import { getDocCanonicalUrl } from "@witnessops/content/docs";
import { getDocsSidebar } from "@witnessops/content/sidebar";
import { CtaButton } from "@/components/shared/cta-button";

const docsDescription =
  "Start here for WitnessOps governed execution, evidence, verification, and explicit trust boundaries.";

export const metadata: Metadata = {
  title: "Docs — WitnessOps",
  description: docsDescription,
  alternates: {
    canonical: getDocCanonicalUrl("witnessops", []),
  },
  openGraph: {
    title: "Docs — WitnessOps",
    description: docsDescription,
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Docs — WitnessOps",
    description: docsDescription,
  },
};

const pageContract = [
  {
    label: "Problem",
    title: "Why this page exists",
    description:
      "Security operations usually leave scattered evidence. This page gives a single map from governed execution to independently verifiable proof.",
  },
  {
    label: "Outcome",
    title: "What you should know after reading",
    description:
      "You should understand where to start, what mechanism to inspect first, and where the trust assumptions remain.",
  },
  {
    label: "Mechanism",
    title: "How the model works at a glance",
    description:
      "Runbooks enforce policy and scope at execution time, then emit signed receipts and linked evidence that can be checked outside WitnessOps.",
  },
];

const trustAssumptions = [
  "Receipts prove governed execution was recorded with integrity; they do not prove every tool finding is correct.",
  "Approval records prove authorization events were captured; they do not prove perfect reviewer judgment.",
  "Independent verification still depends on correct public-key distribution and timestamp-authority continuity.",
];

const coreConcepts = [
  {
    label: "Controlled",
    title: "Governed execution",
    description:
      "Security work runs through explicit scope, policy, and approval controls.",
  },
  {
    label: "Provable",
    title: "Signed receipts",
    description:
      "Each governed operation emits a signed record of what ran, under what authority, and when.",
  },
  {
    label: "Bounded",
    title: "Portable verification",
    description:
      "Evidence is designed to remain verifiable outside the originating system.",
  },
  {
    label: "Explicit",
    title: "Trust boundaries",
    description:
      "Each page names what WitnessOps controls, what it delegates, and what remains an assumption.",
  },
];

const entryPaths = [
  {
    title: "Start sequence (early block)",
    description:
      "Use this queue order first so entry clarity, proof clarity, and trust-boundary clarity are established before long-tail pages.",
    items: [
      {
        href: "/docs/getting-started",
        title: "1. Getting Started",
        description:
          "Problem, reader outcome, first governed run, and the proof path.",
      },
      {
        href: "/docs/how-it-works",
        title: "2. How It Works",
        description:
          "Mechanism map from policy-gated execution to signed evidence artifacts.",
      },
      {
        href: "/docs/security-systems/governed-execution",
        title: "3. Governed Execution",
        description:
          "Runtime authority path: scope, approval, control, and receipt emission.",
      },
      {
        href: "/docs/how-it-works/verification",
        title: "4. Verification",
        description:
          "How to verify receipts and bundles independently of WitnessOps.",
      },
    ],
  },
  {
    title: "Evidence and proof surfaces",
    description:
      "Read these to inspect artifact shape, cryptographic fields, continuity, and verification contracts.",
    items: [
      {
        href: "/docs/evidence/receipts",
        title: "Receipts",
        description:
          "Conceptual contract for what a receipt proves and what it does not.",
      },
      {
        href: "/docs/evidence/receipt-spec",
        title: "Receipt Specification",
        description:
          "Canonical technical fields, chain references, and signature structure.",
      },
      {
        href: "/docs/security-systems/threat-model",
        title: "Threat Model and Trust Boundaries",
        description:
          "Explicit limits, delegated controls, and dispute/verification stance.",
      },
      {
        href: getSurfaceUrl("witnessops", "/verify"),
        title: "Public Verifier",
        description:
          "Run receipt-first checks against uploaded artifacts in the public surface.",
      },
    ],
  },
  {
    title: "Authority and approval path",
    description:
      "Read these when reviewing whether execution authority was valid before work ran.",
    items: [
      {
        href: "/docs/governance/authorization-model",
        title: "Authorization Model",
        description:
          "Approval boundaries, operator roles, and exception handling model.",
      },
      {
        href: "/docs/security-systems/policy-gates",
        title: "Policy Gates",
        description:
          "What must pass before execution proceeds and what fails closed.",
      },
      {
        href: "/docs/operations/runbooks",
        title: "Runbooks",
        description:
          "How workflows encode scope, gates, evidence outputs, and runtime sequence.",
      },
    ],
  },
];

const nextHandoff = [
  {
    href: "/docs/getting-started",
    title: "Next page: Getting Started",
    description:
      "Start here immediately. This is queue item #2 and the first full walkthrough page.",
  },
  {
    href: "/docs/how-it-works",
    title: "Then: How It Works",
    description:
      "Move from overview to mechanism-level model before deeper references.",
  },
  {
    href: "/docs/security-systems/governed-execution",
    title: "Then: Governed Execution",
    description:
      "Inspect authority boundaries and policy-controlled runtime behavior.",
  },
];

export default async function DocsIndexPage() {
  const sidebar = await getDocsSidebar("witnessops");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter"
      data-docs-nav-surface="docs-index"
      data-docs-layer-context="docs_home"
    >
      <header className="mb-10 border-b border-surface-border pb-10">
        <div className="kb-section-tag">Docs</div>

        <h1
          className="mt-2 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Documentation for the model, verification path, and review surfaces.
        </h1>

        <p className="mt-4 max-w-[700px] text-sm leading-relaxed tracking-wide text-text-muted">
          Choose your next step: understand the model, verify a bundle, inspect
          sample artifacts, or request workflow review.
        </p>

        <p className="mt-3 max-w-[700px] text-sm leading-relaxed tracking-wide text-text-muted">
          These docs map mechanisms and limits. They do not claim complete
          runtime truth by default. If you need one starting point, begin with{" "}
          <Link className="text-brand-accent hover:opacity-80" href="/docs/getting-started">
            Getting Started
          </Link>
          . Then follow the early block in order.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton
            href="/docs/getting-started"
            variant="primary"
            label="Understand the model"
          />
          <CtaButton
            href="/docs/how-it-works/verification"
            variant="secondary"
            label="Verify a bundle"
          />
          <CtaButton
            href="/library"
            variant="secondary"
            label="Inspect sample bundles"
          />
          <CtaButton
            href="/contact?intent=review"
            variant="secondary"
            label="Request workflow review"
          />
        </div>
      </header>

      <section className="mb-12">
        <h2
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Page contract
          <span className="h-px flex-1 bg-surface-border" />
        </h2>

        <div className="grid gap-0 border border-surface-border md:grid-cols-3">
          {pageContract.map((item, index) => (
            <div
              key={item.label}
              className={`p-5 ${index < pageContract.length - 1 ? "border-b border-surface-border md:border-b-0 md:border-r md:border-surface-border" : ""}`}
            >
              <div
                className="mb-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--color-brand-accent)",
                }}
              >
                {item.label}
              </div>
              <h3
                className="mb-2 text-sm font-semibold uppercase text-text-primary"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
              >
                {item.title}
              </h3>
              <p
                className="text-text-muted"
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7 }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Where to begin
          <span className="h-px flex-1 bg-surface-border" />
        </h2>

        <div className="mb-5 border border-brand-accent/40 bg-brand-accent/5 p-4">
          <h3
            className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Verify First quickstart
          </h3>
          <p className="mt-2 max-w-[760px] text-sm leading-relaxed text-text-muted">
            Start with a bounded, mechanism-first verification pass: inspect
            receipt artifacts, run verifier checks, and keep execution, proof,
            evidence, and interpretation as separate lanes.
          </p>
          <Link
            href="/docs/quickstart/verify-first"
            className="mt-3 inline-flex items-center border border-surface-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent"
          >
            Open Verify First quickstart
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {entryPaths.map((path) => (
            <div
              key={path.title}
              className="border border-surface-border bg-surface-bg p-5"
            >
              <h3
                className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {path.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-text-muted">
                {path.description}
              </p>
              <div className="space-y-4">
                {path.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block border-l-2 border-surface-border pl-3 transition-colors hover:border-brand-accent"
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {item.title}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Trust assumptions still in play
          <span className="h-px flex-1 bg-surface-border" />
        </h2>

        <div className="border border-surface-border bg-surface-bg p-5">
          <ul className="space-y-3 text-sm leading-relaxed text-text-muted">
            {trustAssumptions.map((assumption) => (
              <li key={assumption} className="border-l-2 border-surface-border pl-3">
                {assumption}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Documentation layers
          <span className="h-px flex-1 bg-surface-border" />
        </h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {sidebar.map((section) => (
            <div key={section.id} className="border-l-2 border-surface-border pl-4">
              <h3
                className="mb-3"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                  fontWeight: 600,
                }}
              >
                {section.title}
              </h3>
              <p
                className="mb-3"
                style={{
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: "var(--color-text-muted)",
                }}
              >
                {section.description}
              </p>
              <div className="space-y-1">
                {section.items.map((item, idx) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 text-text-muted transition-colors hover:text-brand-accent"
                    style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: "var(--color-brand-muted)",
                        fontVariantNumeric: "tabular-nums",
                        minWidth: 16,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Core concepts
          <span className="h-px flex-1 bg-surface-border" />
        </h2>

        <div className="grid gap-0 border border-surface-border md:grid-cols-2">
          {coreConcepts.map((card, i) => (
            <div
              key={card.label}
              className={`p-5 ${i < 2 ? "border-b border-surface-border" : ""} ${i % 2 === 0 ? "md:border-r md:border-surface-border" : ""}`}
            >
              <div
                className="mb-2"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--color-brand-accent)",
                }}
              >
                {card.label}
              </div>
              <h3
                className="mb-2 text-sm font-semibold text-text-primary"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  lineHeight: 1.7,
                  color: "var(--color-text-muted)",
                }}
              >
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        data-docs-nav-surface="index-handoff"
        data-docs-event-type="next_click"
      >
        <h2
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Next page handoff
          <span className="h-px flex-1 bg-surface-border" />
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {nextHandoff.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`kb-hover-card kb-hover-row kb-hover-row--rail-top relative border p-5 ${index === 0 ? "border-brand-accent bg-brand-accent/10" : "border-surface-border bg-surface-bg"}`}
            >
              <h3
                className="mb-2 text-sm font-semibold uppercase text-text-primary"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em" }}
              >
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
