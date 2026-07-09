import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSkuCard } from "@/components/catalog/catalog-sku-card";
import { CtaButton } from "@/components/shared/cta-button";
import { getWorkflowSkus, loadCatalog } from "@witnessops/catalog";

export const metadata: Metadata = {
  title: "Workflow Packages",
  description: "WitnessOps workflow SKUs: fit check, S/M/L packages, and re-runs.",
  alternates: { canonical: "/catalog/workflows" },
};

export default function CatalogWorkflowsPage() {
  const catalog = loadCatalog();
  const workflows = getWorkflowSkus();

  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <header className="mb-10 border-b border-surface-border pb-8">
        <Link href="/catalog" className="text-xs uppercase tracking-[0.16em] text-brand-accent hover:underline">
          ← Catalog
        </Link>
        <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[0.04em] text-text-primary lg:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          WitnessOps workflow packages
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">
          Governed review of one bounded workflow. Fee and timing confirmed after scope —
          list prices are anchors, not self-serve checkout.
        </p>
        <div className="mt-6">
          <CtaButton href="/review/request" variant="primary" label="Package one workflow" />
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {workflows.map((sku) => (
          <CatalogSkuCard key={sku.id} sku={sku} />
        ))}
      </div>
      <p className="mt-8 text-xs text-text-muted">
        {catalog.not_enabled?.includes("live Stripe checkout") ? "Live checkout not enabled." : ""}
      </p>
    </main>
  );
}