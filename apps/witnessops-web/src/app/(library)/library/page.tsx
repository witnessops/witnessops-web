import type { Metadata } from "next";
import Link from "next/link";
import { CtaButton } from "@/components/shared/cta-button";
import { languageAlternates } from "@/lib/public-seo";

const primaryPaths = [
  {
    href: "/catalog",
    title: "Services",
    description:
      "Compare bounded reviews by situation, result, price and timing.",
    cta: "Browse services",
  },
  {
    href: "/review/sample-cases",
    title: "Examples",
    description:
      "Inspect labelled sample cases and report shapes before you request work.",
    cta: "View examples",
  },
  {
    href: "/verify",
    title: "Verify a receipt",
    description:
      "Upload or paste receipt JSON and read a clear, receipt-scoped result.",
    cta: "Open verifier",
  },
] as const;

const secondaryGroups = [
  {
    title: "Buyer guides",
    description: "Scope, handover, and how to request a review.",
    links: [
      {
        label: "Why WitnessOps",
        href: "/why-witnessops",
        note: "How bounded work becomes explainable and reviewable.",
      },
      {
        label: "Buyer path",
        href: "/docs/getting-started/proof-run-buyer-path",
        note: "Catalogue, sample, fit check, and what the request form starts.",
      },
      {
        label: "Customer Security Review Sprint",
        href: "/customer-security-review",
        note: "One supported questionnaire response with clear limits.",
      },
      {
        label: "Start a review",
        href: "/review/request",
        note: "Non-secret fit check — no files or secrets in the first step.",
      },
    ],
  },
  {
    title: "Examples",
    description: "Samples and illustrations — not live customer artifacts.",
    links: [
      {
        label: "Example reviews",
        href: "/review/sample-cases",
        note: "Situation-led samples with inspectable limits.",
      },
      {
        label: "AI-agent action sample",
        href: "/review/sample-cases/ai-agent-action-proof-run",
        note: "Public sample: scope, evidence references, and limits.",
      },
      {
        label: "SBOM minimum-elements sample",
        href: "/review/sample-cases/sbom-cisa-2026-minimum-elements",
        note: "CISA 2026 baseline checklist on a synthetic SBOM — not a compliance claim.",
      },
      {
        label: "Illustrative sample report",
        href: "/review/sample-report",
        note: "Generic report shape for orientation only.",
      },
    ],
  },
  {
    title: "Services detail",
    description: "Families inside the catalogue.",
    links: [
      {
        label: "All services",
        href: "/catalog",
        note: "Full public catalogue and boundaries.",
      },
      {
        label: "Workflow reviews",
        href: "/catalog/workflows",
        note: "Bounded action and handover packages.",
      },
    ],
  },
  {
    title: "Docs & verification detail",
    description: "Technical depth one click past the public tool.",
    links: [
      {
        label: "Documentation",
        href: "/docs",
        note: "Model, hubs, and trust limits — sidebar stays small.",
      },
      {
        label: "Verify a receipt",
        href: "/verify",
        note: "Public tool: upload or paste receipt JSON.",
      },
      {
        label: "How verification works",
        href: "/docs/how-it-works/verification",
        note: "What a result does and does not establish.",
      },
    ],
  },
] as const;

const exampleBoundary =
  "Examples are labelled samples or illustrations. Each example is not a live customer artifact. The public receipt-only result names the checks that ran and stays indeterminate whenever required evidence or trust inputs were not independently checked.";

export const metadata: Metadata = {
  title: "WitnessOps Library",
  description:
    "Public entry points for services, examples, receipt verification, and documentation.",
  alternates: languageAlternates("/library", {
    en: "/library",
    pl: "/pl/library",
  }),
};

export default function LibraryPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <header className="max-w-3xl border-b border-surface-border pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Library
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-5xl">
            Public entry points
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary">
            Start with services, an example, or a receipt check. Open docs only
            when you need more detail.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <CtaButton href="/catalog" variant="primary" label="Browse services" />
            <CtaButton
              href="/verify"
              variant="secondary"
              label="Verify a receipt"
            />
            <CtaButton
              href="/review/request"
              variant="secondary"
              label="Start a review"
            />
          </div>
        </header>

        <section className="mt-10" aria-labelledby="library-start-heading">
          <h2
            id="library-start-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Start here
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {primaryPaths.map((path, index) => (
              <Link
                key={path.href}
                href={path.href}
                className={`block border p-5 transition-colors hover:border-brand-accent ${
                  index === 0
                    ? "border-brand-accent/50 bg-brand-accent/5"
                    : "border-surface-border bg-surface-bg"
                }`}
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                  {path.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {path.description}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-brand-accent">
                  {path.cta} →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="library-more-heading">
          <h2
            id="library-more-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            More routes
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {secondaryGroups.map((group) => (
              <section
                key={group.title}
                className="border border-surface-border bg-surface-bg p-5"
              >
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary">
                  {group.title}
                </h3>
                <p className="mt-2 text-sm text-text-muted">{group.description}</p>
                <ul className="mt-5 space-y-4">
                  {group.links.map((item) => (
                    <li
                      key={item.href + item.label}
                      className="border-t border-surface-border pt-4"
                    >
                      <Link
                        href={item.href}
                        className="inline-flex min-h-11 items-center font-semibold text-text-primary underline decoration-1 underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                      >
                        {item.label}
                      </Link>
                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {item.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <p className="mt-10 max-w-3xl text-sm leading-7 text-text-muted">
          {exampleBoundary}
        </p>
      </div>
    </main>
  );
}
