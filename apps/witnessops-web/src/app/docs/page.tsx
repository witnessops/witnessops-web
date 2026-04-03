import type { Metadata } from "next";
import Link from "next/link";
import { getSurfaceUrl } from "@public-surfaces/config";
import { getDocCanonicalUrl, listDocPages } from "@public-surfaces/content/docs";
import { getDocsSidebar } from "@public-surfaces/content/sidebar";

export const metadata: Metadata = {
  title: "Docs — WitnessOps",
  description:
    "Everything you need to run governed security operations and verify the resulting evidence.",
  alternates: {
    canonical: getDocCanonicalUrl("witnessops", []),
  },
};

const trustCards = [
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
      "Each governed operation produces a signed record of what ran, under what authority, and when.",
  },
  {
    label: "Bounded",
    title: "Portable verification",
    description:
      "Evidence is designed to remain useful outside the originating system.",
  },
  {
    label: "Fail-safe",
    title: "Trust boundaries and failure modes",
    description:
      "Understand what WitnessOps controls, what it delegates, and what remains a trust assumption.",
  },
];

const entryPaths = [
  {
    title: "Get started",
    description: "First steps for readers who want to see a governed run from start to evidence.",
    items: [
      {
        href: "/docs/getting-started",
        title: "Run your first governed recon",
        description: "See how domain verification, scope approval, execution, and receipt issuance fit together from end to end.",
      },
      {
        href: "/docs/evidence/receipts",
        title: "Read a sample receipt",
        description: "Understand what a receipt contains, what is signed, what is chained, and what can be verified.",
      },
      {
        href: "/docs/how-it-works/verification",
        title: "Verify a receipt offline",
        description: "Follow the verification path for signatures, execution binding, and portable proof artifacts.",
      },
      {
        href: getSurfaceUrl("witnessops", "/verify"),
        title: "Try the public verifier",
        description: "Paste or upload receipt JSON and inspect deterministic receipt-first verification checks.",
      },
    ],
  },
  {
    title: "Operate",
    description: "Run governed work with clear controls, authoring, and authorization records.",
    items: [
      {
        href: "/docs/security-systems/policy-gates",
        title: "Define scope and policy gates",
        description: "Set the rules for what can run, who can approve it, and where execution is allowed to go.",
      },
      {
        href: "/docs/operations/runbooks",
        title: "Author a runbook",
        description: "Build a governed workflow with clear steps, approvals, evidence output, and execution boundaries.",
      },
      {
        href: "/docs/governance/authorization-model",
        title: "Handle approvals and exceptions",
        description: "See how WitnessOps records authorization decisions and break-glass actions as governed events.",
      },
    ],
  },
  {
    title: "Understand",
    description: "Read the model behind governed execution, receipts, verification, and trust boundaries.",
    items: [
      {
        href: "/docs/security-systems/governed-execution",
        title: "How governed execution works",
        description: "How WitnessOps wraps tooling in policy-gated, scope-enforced execution.",
      },
      {
        href: "/docs/evidence/receipt-spec",
        title: "What a receipt contains",
        description: "The canonical fields, execution hash, chain links, and signed record structure.",
      },
      {
        href: "/docs/how-it-works/verification",
        title: "How verification works",
        description: "How to verify signatures, execution integrity, and proof artifacts independently.",
      },
      {
        href: "/docs/security-systems/threat-model",
        title: "Trust boundaries and failure modes",
        description: "What WitnessOps controls, what it delegates, and what remains a trust assumption.",
      },
    ],
  },
];

const useCases = [
  {
    title: "Reconnaissance",
    description:
      "Run a governed external assessment and receive a report plus signed receipt.",
  },
  {
    title: "Assessment",
    description:
      "Execute deeper testing with stronger evidence continuity and proof artifacts.",
  },
  {
    title: "Continuous operations",
    description:
      "Maintain recurring governed execution and evidence across ongoing security work.",
  },
];

const differentiators = [
  {
    left: "Most assessments produce reports.",
    right: "WitnessOps also produces signed evidence of what actually ran.",
  },
  {
    left: "Most platforms log events.",
    right: "WitnessOps produces receipts designed for verification.",
  },
  {
    left: "Most verification depends on the vendor.",
    right: "WitnessOps is built so evidence can be checked independently.",
  },
];

export default async function DocsIndexPage() {
  const [sidebar, docs] = await Promise.all([
    getDocsSidebar("witnessops"),
    listDocPages("witnessops"),
  ]);
  const totalDocs = docs.filter((doc) => doc.slug.length > 0).length;

  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter">
      {/* ── HERO ── */}
      <header className="border-b border-surface-border pb-10 mb-10">
        <div className="kb-section-tag">Docs</div>

        <h1
          className="mt-2 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          WITNESSOPS Documentation
        </h1>

        <p className="mt-4 max-w-[600px] text-sm leading-relaxed text-text-muted tracking-wide">
          Governed security operations. Signed evidence. Independent verification.
        </p>

        <p className="mt-4 max-w-[720px] text-sm leading-relaxed text-text-muted tracking-wide">
          Learn how WitnessOps runs scoped security work under policy, produces
          signed receipts, and makes the resulting evidence verifiable without
          depending on WitnessOps itself.
        </p>

        {/* Stats strip */}
        <div className="mt-6 flex gap-0 border border-surface-border w-fit">
          <div className="px-4 py-2 border-r border-surface-border">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}>
              Pages
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-brand-accent)", fontVariantNumeric: "tabular-nums" }}>
              {totalDocs}
            </div>
          </div>
          <div className="px-4 py-2 border-r border-surface-border">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}>
              Layers
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-brand-accent)", fontVariantNumeric: "tabular-nums" }}>
              {sidebar.length}
            </div>
          </div>
          <div className="px-4 py-2">
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}>
              Status
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-signal-green)" }}>
              LIVE
            </div>
          </div>
        </div>

        {/* Penguin lockup */}
        <div className="mt-8 flex items-center gap-4">
          <span style={{ fontSize: 18 }}>🐧</span>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--color-brand-muted)", lineHeight: 1.7 }}>
            <span>Respect the penguin. </span>
            <span>Bring receipts.</span>
          </div>
        </div>
      </header>

      {/* ── ENTRY PATHS ── */}
      <section className="mb-12">
        <h2
          className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start Here
          <span className="flex-1 h-px bg-surface-border" />
        </h2>

        <div className="grid gap-6 lg:grid-cols-3">
          {entryPaths.map((path) => (
            <div key={path.title} className="border border-surface-border bg-surface-bg p-5">
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

      {/* ── USE CASES ── */}
      <section className="mb-12">
        <h2
          className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Use Cases
          <span className="flex-1 h-px bg-surface-border" />
        </h2>

        <div className="grid gap-6 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="border border-surface-border bg-surface-bg p-5">
              <h3
                className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {useCase.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-muted">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DIFFERENTIATORS ── */}
      <section className="mb-12">
        <h2
          className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What Makes This Different
          <span className="flex-1 h-px bg-surface-border" />
        </h2>

        <div className="border border-surface-border">
          {differentiators.map((item, index) => (
            <div
              key={item.left}
              className={`grid gap-3 bg-surface-bg p-5 md:grid-cols-[1fr,1fr] ${index < differentiators.length - 1 ? "border-b border-surface-border" : ""}`}
            >
              <p className="text-sm leading-relaxed text-text-secondary">{item.left}</p>
              <p className="text-sm leading-relaxed text-brand-accent">{item.right}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DOC LAYERS ── */}
      <section className="mb-12">
        <h2
          className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Documentation Layers
          <span className="flex-1 h-px bg-surface-border" />
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
                style={{ fontSize: 11, lineHeight: 1.6, color: "var(--color-text-muted)" }}
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
                    <span style={{ fontSize: 9, color: "var(--color-brand-muted)", fontVariantNumeric: "tabular-nums", minWidth: 16 }}>
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

      {/* ── CORE CONCEPTS ── */}
      <section className="mt-12">
        <h2
          className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Core Concepts
          <span className="flex-1 h-px bg-surface-border" />
        </h2>

        <div className="grid gap-0 md:grid-cols-2 border border-surface-border">
          {trustCards.map((card, i) => (
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
                className="text-sm font-semibold text-text-primary mb-2"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                {card.title}
              </h3>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.7, color: "var(--color-text-muted)" }}>
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="mt-12 border border-surface-border bg-surface-bg p-6">
        <div
          className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start with proof
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          Your next security operation should produce more than notes and screenshots.
        </h2>
        <p className="mt-3 max-w-[720px] text-sm leading-relaxed text-text-muted">
          Start with a governed recon, inspect the receipt, and verify the evidence path.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center border border-brand-accent bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink transition-colors hover:opacity-90"
          >
            Start Governed Recon
          </Link>
          <Link
            href="/verify"
            className="inline-flex items-center border border-surface-border px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-brand-accent hover:text-brand-accent"
          >
            Try /verify
          </Link>
        </div>
      </section>
    </main>
  );
}
