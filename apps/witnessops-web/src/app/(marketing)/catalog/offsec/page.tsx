import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSkuCard } from "@/components/catalog/catalog-sku-card";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
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
    <main id="main-content" tabIndex={-1} className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <header className="mb-10 border-b border-surface-border pb-8">
        <Link href="/catalog" className="text-xs uppercase tracking-[0.16em] text-brand-accent hover:underline">
          ← Catalog
        </Link>
        <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[0.04em] text-text-primary lg:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          Security review packages
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">
          Bounded checks on authorised hosts. Reports, receipts, and packages you
          inspect offline. Requested through a non-secret fit check — there is no
          external portal or self-serve checkout on the buyer path.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
          Packages name what was checked, which evidence supports it, which hosts
          or systems were authorised, and what remains outside scope. They do not
          launch an OffSec portal, move funds, collect secrets, or certify compliance.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {offsec.map((sku) => (
          <CatalogSkuCard key={sku.id} sku={sku} />
        ))}
      </div>
      <div className="mt-10">
        <PublicContactRoute />
      </div>
    </main>
  );
}
