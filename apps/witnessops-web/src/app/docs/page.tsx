import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getDocsSidebar } from "@witnessops/content/sidebar";
import { getDocCanonicalUrl } from "@witnessops/content/docs";
import { CtaButton } from "@/components/shared/cta-button";
import {
  normalizeHost,
  toPublicDocsHref,
} from "@/lib/docs-host-routing";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";
import { languageAlternates } from "@/lib/public-seo";

const docsDescription =
  "Start here for WitnessOps: buyer path, how the model works, and how to verify a receipt.";

export const metadata: Metadata = {
  title: "Docs — WitnessOps",
  description: docsDescription,
  alternates: {
    canonical: getDocCanonicalUrl("witnessops", []),
    languages: languageAlternates("/docs", {
      en: "/docs",
      pl: "/pl/docs",
    }).languages,
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

const primaryPaths = [
  {
    href: "/docs/getting-started/proof-run-buyer-path",
    title: "Buyer path",
    description:
      "Catalogue, sample, non-secret fit check, and what a review request starts.",
    cta: "Open buyer path",
  },
  {
    href: "/docs/getting-started",
    title: "How the model works",
    description:
      "Governed execution, receipts, and what proof can and cannot show.",
    cta: "Learn the model",
  },
  {
    href: "/verify",
    title: "Verify a receipt",
    description:
      "Upload or paste receipt JSON and read a clear, receipt-scoped result.",
    cta: "Open verifier",
    externalToDocs: true,
  },
] as const;

const quickLinks = [
  {
    href: "/docs/how-it-works/verification",
    title: "Verification docs",
    description: "Public tool vs offline package checks.",
  },
  {
    href: "/docs/evidence/receipts",
    title: "Receipts",
    description: "What a receipt demonstrates on its own.",
  },
  {
    href: "/docs/faq",
    title: "FAQ",
    description: "Short answers and common boundaries.",
  },
  {
    href: "/docs/security-systems/threat-model",
    title: "Threat model",
    description: "Trust limits and dispute boundaries.",
  },
] as const;

export default async function DocsIndexPage() {
  const sidebar = await getDocsSidebar("witnessops");
  const headerStore = await headers();
  const host = normalizeHost(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
  );
  const pub = (href: string) => toPublicDocsHref(href, host);

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
          className="mt-2 max-w-[18ch] text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Documentation
        </h1>

        <p className="mt-5 max-w-[36rem] text-base leading-7 text-text-secondary">
          How WitnessOps works, how to evaluate a review, and how to check a
          receipt you were given.
        </p>

        <p className="mt-3 max-w-[36rem] text-sm leading-7 text-text-muted">
          These docs explain the model and its limits. They do not claim complete
          runtime truth by default.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <CtaButton
            href={pub("/docs/getting-started/proof-run-buyer-path")}
            variant="primary"
            label="Buyer path"
          />
          <CtaButton href="/verify" variant="secondary" label="Verify a receipt" />
          <CtaButton
            href="/review/request"
            variant="secondary"
            label="Start a review"
          />
        </div>
      </header>

      <section className="mb-12" aria-labelledby="docs-start-heading">
        <h2
          id="docs-start-heading"
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
              href={
                "externalToDocs" in path && path.externalToDocs
                  ? path.href
                  : pub(path.href)
              }
              className={`block border p-5 transition-colors hover:border-brand-accent ${
                index === 0
                  ? "border-brand-accent/50 bg-brand-accent/5"
                  : "border-surface-border bg-surface-bg"
              }`}
            >
              <h3
                className="text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
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

      <section className="mb-12" aria-labelledby="docs-quick-heading">
        <h2
          id="docs-quick-heading"
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Often needed
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={pub(link.href)}
              className="block border border-surface-border bg-surface-bg px-4 py-4 transition-colors hover:border-brand-accent"
            >
              <div className="text-sm font-semibold text-text-primary">
                {link.title}
              </div>
              <p className="mt-1 text-sm text-text-muted">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12" aria-labelledby="docs-browse-heading">
        <h2
          id="docs-browse-heading"
          className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Browse by area
          <span className="h-px flex-1 bg-surface-border" />
        </h2>
        <p className="mb-5 max-w-[36rem] text-sm leading-relaxed text-text-muted">
          The sidebar stays small on purpose. Open a hub for deeper pages, or use
          search (⌘K) for education leaves and other pages not listed in primary
          nav.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sidebar.map((section) => {
            const hubHref = pub(section.items[0]?.href ?? "/docs");
            return (
              <Link
                key={section.id}
                href={hubHref}
                className="block border border-surface-border bg-surface-bg p-5 transition-colors hover:border-brand-accent"
              >
                <h3
                  className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {section.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  {section.description}
                </p>
                <p
                  className="mt-3 text-text-muted"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {section.items.length} hub
                  {section.items.length === 1 ? "" : "s"} in nav
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        className="mb-4 border border-surface-border bg-surface-bg p-5"
        aria-labelledby="docs-limits-heading"
      >
        <h2
          id="docs-limits-heading"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent"
        >
          Limits
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-muted">
          <li>
            A valid public receipt result confirms the checks named in that
            receipt. It does not prove every underlying action was correct.
          </li>
          <li>
            Independent verification still depends on trusted keys and the
            materials you actually have.
          </li>
          <li>
            These docs do not claim complete runtime truth or production
            deployment by themselves.
          </li>
        </ul>
      </section>
    </main>
  );
}
