import type { Metadata } from "next";
import Link from "next/link";
import { getSurfaceUrl } from "@witnessops/config";
import { getDocCanonicalUrl } from "@witnessops/content/docs";
import { getDocsSidebar } from "@witnessops/content/sidebar";
import { CtaButton } from "@/components/shared/cta-button";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

const docsDescription =
  "Start here for WitnessOps execution, evidence, verification, and trust limits.";

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
    images: DEFAULT_OPEN_GRAPH_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: "Docs — WitnessOps",
    description: docsDescription,
    images: DEFAULT_TWITTER_IMAGES,
  },
};

const pageContract = [
  {
    label: "Problem",
    title: "Why this page exists",
    description:
      "Consequential work often leaves behind scattered evidence. This page shows where to start and what to read next.",
  },
  {
    label: "Outcome",
    title: "What you should know after reading",
    description:
      "You should know where to start, what the main model is, and where the trust limits still are.",
  },
  {
    label: "Mechanism",
    title: "How the model works in one line",
    description:
      "A workflow is approved, run, recorded, and published so another person can check the result later.",
  },
];

const trustAssumptions = [
  "Receipts can show that governed execution was recorded with integrity, but they do not prove every finding is correct.",
  "Approval records can show that an approval was captured, but they do not prove the approver made the right call.",
  "Independent verification still depends on correct public-key distribution and timestamp continuity.",
];

const coreConcepts = [
  {
    label: "Controlled",
    title: "Governed execution",
    description:
      "Consequential workflows run through explicit scope, policy, and approval controls.",
  },
  {
    label: "Provable",
    title: "Signed receipts",
    description:
      "Each governed action leaves a signed record of what ran, under what authority, and when.",
  },
  {
    label: "Bounded",
    title: "Portable verification",
    description:
      "Evidence is designed so other people can check it outside the system that produced it.",
  },
  {
    label: "Explicit",
    title: "Trust limits",
    description:
      "Each page says what WitnessOps controls, what it delegates, and what still needs trust.",
  },
];

const entryPaths = [
  {
    title: "Start sequence",
    description:
      "Use this order first so you understand the model, the proof path, and the trust limits before going deeper.",
    items: [
      {
        href: "/docs/getting-started",
        title: "1. Getting Started",
        description:
          "Start here for the first walkthrough of the model and the proof path.",
      },
      {
        href: "/docs/how-it-works",
        title: "2. How It Works",
        description:
          "See the path from policy-gated execution to signed evidence.",
      },
      {
        href: "/docs/security-systems/governed-execution",
        title: "3. Governed Execution",
        description:
          "Inspect scope, approval, control, and receipt emission.",
      },
      {
        href: "/docs/how-it-works/verification",
        title: "4. Verification",
        description:
          "Learn how to check receipts and proof bundles outside WitnessOps.",
      },
    ],
  },
  {
    title: "Proof and evidence",
    description:
      "Read these pages to inspect artifact shape, cryptographic fields, continuity, and verification rules.",
    items: [
      {
        href: "/docs/evidence/receipts",
        title: "Receipts",
        description:
          "What a receipt can prove and what it cannot prove.",
      },
      {
        href: "/docs/evidence/receipt-spec",
        title: "Receipt Specification",
        description:
          "The core technical fields, chain references, and signature structure.",
      },
      {
        href: "/docs/security-systems/threat-model",
        title: "Threat Model and Trust Boundaries",
        description:
          "The limits, delegated controls, and dispute model.",
      },
      {
        href: getSurfaceUrl("witnessops", "/verify"),
        title: "Public Verifier",
        description:
          "Run receipt-first checks against receipt JSON in the public surface.",
      },
    ],
  },
  {
    title: "Authority and approval",
    description:
      "Read these when you need to know whether execution authority was valid before work ran.",
    items: [
      {
        href: "/docs/governance/authorization-model",
        title: "Authorization Model",
        description:
          "Approval boundaries, operator roles, and exception handling.",
      },
      {
        href: "/docs/security-systems/policy-gates",
        title: "Policy Gates",
        description:
          "What must pass before execution can proceed and what fails closed.",
      },
      {
        href: "/docs/operations/runbooks",
        title: "Runbooks",
        description:
          "How workflows define scope, gates, evidence outputs, and runtime order.",
      },
    ],
  },
];

const nextHandoff = [
  {
    href: "/docs/getting-started",
    title: "Next page: Getting Started",
    description:
      "Start here first. It is the first full walkthrough page.",
  },
  {
    href: "/docs/how-it-works",
    title: "Then: How It Works",
    description:
      "Move from overview to mechanism before going deeper.",
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
          Docs for the model, proof path, and review surfaces.
        </h1>

        <p className="mt-4 max-w-[700px] text-sm leading-relaxed tracking-wide text-text-muted">
          Choose your next step: learn the model, verify a receipt, inspect sample
          cases, or request a review.
        </p>

        <p className="mt-3 max-w-[700px] text-sm leading-relaxed tracking-wide text-text-muted">
          These docs explain how the system works and where the limits are. They
          do not claim complete runtime truth by default. If you need one place
          to start, begin with{" "}
          <Link className="text-brand-accent hover:opacity-80" href="/docs/getting-started">
            Getting Started
          </Link>
          . Then follow the early pages in order.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <CtaButton
            href="/docs/getting-started"
            variant="primary"
            label="Learn the model"
          />
          <CtaButton
            href="/docs/how-it-works/verification"
            variant="secondary"
            label="Verify a receipt"
          />
          <CtaButton
            href="/review/sample-cases"
            variant="secondary"
            label="Inspect sample cases"
          />
          <CtaButton
            href="/review/request"
            variant="secondary"
            label="Request a Review"
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
            Start with a bounded verification pass: inspect the receipt, run the
            verifier, and keep execution, evidence, and interpretation as
            separate concerns.
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
