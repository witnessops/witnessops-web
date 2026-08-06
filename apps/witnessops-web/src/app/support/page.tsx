import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCanonicalAlternates } from "@witnessops/config";
import { MarkdownContent } from "@witnessops/ui/mdx";
import { loadSupportIndex, loadSupportPage } from "@/lib/content";
import { SupportIntake } from "@/components/support/support-intake";
import { CtaButton } from "@/components/shared/cta-button";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_NO_SECRETS_NOTE,
  publicContactMailto,
} from "@/lib/public-contact";

const SECURITY_CONTACT_EMAIL = "security@witnessops.com";

const supportDescription =
  "Product help, access issues, and verifier questions — or start a bounded review. Security vulnerabilities use a separate disclosure path.";

export function generateMetadata(): Metadata {
  const doc = loadSupportPage("support-policy");
  const title = doc?.title ?? "Support";
  const description = doc?.description ?? supportDescription;

  return {
    title,
    description,
    alternates: getCanonicalAlternates("witnessops", "/support"),
    openGraph: {
      title: `${title} | WitnessOps`,
      description,
      siteName: "WitnessOps",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | WitnessOps`,
      description,
    },
  };
}

const situationLanes = [
  {
    href: "/review/request",
    title: "Start a review",
    body: "Describe one situation without secrets. We confirm fit, scope, price and evidence handling before work starts.",
    emphasize: true,
  },
  {
    href: "#contact",
    title: "Product help or access",
    body: "Questions about the product, access, mailbox verification, or how to use a public surface. Verified requests enter the operator action queue.",
    emphasize: false,
  },
  {
    href: "/verify",
    title: "Verify a receipt",
    body: "Upload or paste receipt JSON and read a clear, receipt-scoped result. Use the form below if the verifier result needs a human follow-up.",
    emphasize: false,
  },
  {
    href: `mailto:${SECURITY_CONTACT_EMAIL}?subject=${encodeURIComponent("Private vulnerability report")}`,
    title: "Security vulnerability",
    body: "Private reports only to the security mailbox. Do not use the support form for vulnerabilities.",
    emphasize: false,
    external: true,
  },
] as const;

export default function SupportPage() {
  const supportDocs = loadSupportIndex();
  const primaryDoc = loadSupportPage("support-policy") ?? supportDocs[0];

  if (!primaryDoc) {
    notFound();
  }

  const relatedDocs = supportDocs.filter((doc) => doc.slug !== primaryDoc.slug);

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        <header className="max-w-3xl border-b border-surface-border pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Support
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-5xl">
            Get help or start a review
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary">
            Support is for product help, access issues, and verifier questions.
            If you want WitnessOps to run a bounded security or operational
            review, use Start a review.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <CtaButton
              href="/review/request"
              variant="primary"
              label="Start a review"
            />
            <CtaButton href="/verify" variant="secondary" label="Verify a receipt" />
            <CtaButton href="#contact" variant="secondary" label="Email support" />
          </div>
        </header>

        <section className="mt-10" aria-labelledby="support-lanes-heading">
          <h2
            id="support-lanes-heading"
            className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Choose the right path
            <span className="h-px flex-1 bg-surface-border" />
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {situationLanes.map((lane) => {
              const className = `block border p-5 transition-colors hover:border-brand-accent ${
                lane.emphasize
                  ? "border-brand-accent/50 bg-brand-accent/5"
                  : "border-surface-border bg-surface-bg"
              }`;
              const inner = (
                <>
                  <h3 className="font-semibold text-text-primary">{lane.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {lane.body}
                  </p>
                </>
              );
              if ("external" in lane && lane.external) {
                return (
                  <a key={lane.title} href={lane.href} className={className}>
                    {inner}
                  </a>
                );
              }
              return (
                <Link key={lane.title} href={lane.href} className={className}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <div className="mb-8 border border-surface-border bg-surface-bg p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                Ready for a bounded review?
              </p>
              <p className="mt-3 text-sm leading-7 text-text-secondary">
                Support is for product help, access issues, and verifier
                questions. Need a review instead of product help? Use{" "}
                <Link
                  href="/review/request"
                  className="font-semibold text-brand-accent underline-offset-4 hover:underline"
                >
                  Start a review
                </Link>
                .
              </p>
            </div>

            <article className="prose-support">
              <MarkdownContent source={primaryDoc.body} />
            </article>

            {relatedDocs.length > 0 && (
              <section className="mt-12" aria-labelledby="support-related-heading">
                <h2
                  id="support-related-heading"
                  className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Related
                  <span className="h-px flex-1 bg-surface-border" />
                </h2>
                <div className="space-y-0">
                  {relatedDocs.map((doc) => (
                    <Link
                      key={doc.slug}
                      href={`/support/${doc.slug}`}
                      className="group flex items-center justify-between border-b border-surface-border py-3 transition-colors hover:text-brand-accent"
                    >
                      <span className="text-sm text-text-secondary transition-colors group-hover:text-brand-accent">
                        {doc.navLabel}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-brand-muted">
                        {doc.section}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div
              id="contact"
              className="mt-10 scroll-mt-28 border border-surface-border bg-surface-bg p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                Prefer direct email?
              </p>
              <p className="mt-3 text-sm leading-7 text-text-secondary">
                The form durably records your request and enters it into the
                operator queue after mailbox verification. You can also email the
                support mailbox directly as a fallback.
              </p>
              <a
                href={publicContactMailto(PUBLIC_CONTACT_SUBJECTS.general)}
                className="mt-4 inline-flex items-center border border-surface-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-brand-accent/40 hover:text-text-primary"
              >
                {PUBLIC_CONTACT_EMAIL}
              </a>
              <p className="mt-3 text-xs leading-6 text-text-muted">
                {PUBLIC_NO_SECRETS_NOTE}
              </p>
              <p className="mt-2 text-xs leading-6 text-text-muted">
                Vulnerabilities:{" "}
                <a
                  className="font-semibold text-brand-accent underline-offset-4 hover:underline"
                  href={`mailto:${SECURITY_CONTACT_EMAIL}?subject=${encodeURIComponent("Private vulnerability report")}`}
                >
                  {SECURITY_CONTACT_EMAIL}
                </a>
                . See also{" "}
                <Link
                  href="/support/responsible-disclosure"
                  className="underline-offset-4 hover:underline"
                >
                  responsible disclosure
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <SupportIntake supportEmail={PUBLIC_CONTACT_EMAIL} />
          </div>
        </div>
      </div>
    </main>
  );
}
