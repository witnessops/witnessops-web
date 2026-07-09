import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSkuCard } from "@/components/catalog/catalog-sku-card";
import { CtaButton } from "@/components/shared/cta-button";
import { getSkusByTrack, loadCatalog } from "@witnessops/catalog";

export const metadata: Metadata = {
  title: "Service Package Catalog",
  description:
    "WitnessOps service package catalog: proof packages, private-preview workspace access, and security proof packages requested through WitnessOps.",
  alternates: { canonical: "/catalog" },
};

export default function CatalogIndexPage() {
  const catalog = loadCatalog();
  const offsec = getSkusByTrack("offsec_proof");
  const workflows = getSkusByTrack("witnessops_workflow");
  const saas = getSkusByTrack("operator_saas");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14"
    >
      <header className="mb-12 border-b border-surface-border pb-8">
        <div className="kb-section-tag">Service package catalog</div>
        <h1
          className="mt-2 max-w-4xl text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Requestable proof packages and preview access
        </h1>
        <p className="mt-6 max-w-[760px] text-base leading-8 text-text-secondary">
          {catalog.safe_claim} This catalog is a menu of requestable service
          shapes and price anchors. It is not checkout, self-serve SaaS, or an
          external OffSec portal. Proof runs are sold as bounded service
          packages, and workspace access is private preview only.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaButton href="/catalog/workflows" variant="secondary" label="Proof packages" />
          <CtaButton href="/catalog/operator-platform" variant="secondary" label="Workspace access" />
          <CtaButton href="/catalog/offsec" variant="secondary" label="Security proof packages" />
        </div>
      </header>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Proof packages
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {workflows.map((sku) => (
            <CatalogSkuCard key={sku.id} sku={sku} />
          ))}
        </div>
        <p className="mt-4 text-sm text-text-muted">
          <Link href="/catalog/workflows" className="text-brand-accent hover:underline">
            View all workflow packages →
          </Link>
        </p>
      </section>

      <section className="mb-10 border-b border-surface-border pb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Operator workspace access
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          Private preview only. Request access through WitnessOps; there is no
          public app signup or self-serve checkout in the buyer path.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {saas.map((sku) => (
            <CatalogSkuCard key={sku.id} sku={sku} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Security proof packages
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-muted">
          Security proof packages are available through WitnessOps request while
          the public OffSec surface is being prepared. Buyers do not need an
          external portal or checkout.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {offsec.map((sku) => (
            <CatalogSkuCard key={sku.id} sku={sku} />
          ))}
        </div>
      </section>
    </main>
  );
}
