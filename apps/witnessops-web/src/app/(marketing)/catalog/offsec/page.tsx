import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSkuCard } from "@/components/catalog/catalog-sku-card";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
import { getSkusByTrack } from "@witnessops/catalog";

export const metadata: Metadata = {
  title: "Security review packages",
  description:
    "Bounded security reviews on authorised hosts: local server check, launch readiness, custody review, and incident readiness. Non-secret fit check first; not compliance certification.",
  alternates: { canonical: "/catalog/offsec" },
};

export default function CatalogOffsecPage() {
  const offsec = getSkusByTrack("offsec_proof");

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page" data-page="catalog-offsec">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <Link
          href="/catalog"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          ← Back to services
        </Link>

        <header className="mt-8 max-w-4xl border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Security review packages
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            Bounded checks on authorised hosts.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
            Reports, receipts and packages you inspect offline. Requested through a non-secret fit
            check — there is no external portal or self-serve checkout on the buyer path.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
            Packages name what was checked, which evidence supports it, which hosts or systems were
            authorised, and what remains outside scope. They do not launch an OffSec portal, move
            funds, collect secrets, or certify compliance.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton
              href="/review/request"
              variant="primary"
              label="Start a non-secret fit check"
            />
            <CtaButton href="/catalog" variant="secondary" label="View all services" />
          </div>
        </header>

        <section className="grid gap-px border border-surface-border bg-surface-border py-0 md:grid-cols-2">
          {offsec.map((sku) => (
            <CatalogSkuCard key={sku.id} sku={sku} />
          ))}
        </section>

        <div className="mt-12 border-t border-surface-border pt-10">
          <PublicContactRoute subject="fit-check" />
        </div>
      </div>
    </main>
  );
}
