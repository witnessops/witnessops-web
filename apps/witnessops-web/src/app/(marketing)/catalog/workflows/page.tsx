import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSkuCard } from "@/components/catalog/catalog-sku-card";
import { CtaButton } from "@/components/shared/cta-button";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { getWorkflowSkus, loadCatalog } from "@witnessops/catalog";

export const metadata: Metadata = {
  title: "Proof Packages",
  description: "WitnessOps proof packages: fit check, scoped S/M/L proof runs, and same-scope re-runs.",
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
          Proof packages
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">
          Convert one operational doubt into a scoped proof run: a named claim,
          evidence references, receipt artifacts where produced, a verifier or
          inspection path, and clear limits. Fee and timing are confirmed after
          scope; list prices are anchors, not self-serve checkout.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
          First request only: name the action and boundary. Do not send secrets,
          logs, screenshots, credentials, raw exports, private keys, MFA codes,
          or customer evidence until evidence handling is agreed.
        </p>
        <div className="mt-6">
          <CtaButton href="/review/request" variant="primary" label="Request one proof run" />
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
      <div className="mt-10">
        <PublicContactRoute />
      </div>
    </main>
  );
}
