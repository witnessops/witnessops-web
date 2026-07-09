import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSkuCard } from "@/components/catalog/catalog-sku-card";
import { getSkusByTrack, loadCatalog } from "@witnessops/catalog";

export const metadata: Metadata = {
  title: "Operator Workspace Access",
  description:
    "WitnessOps private-preview operator workspace access and add-ons. Request access through WitnessOps; no public app signup or checkout.",
  alternates: { canonical: "/catalog/operator-platform" },
};

export default function CatalogOperatorPlatformPage() {
  const catalog = loadCatalog();
  const saas = getSkusByTrack("operator_saas");
  const tiers = saas.filter((s) => !s.price.addon);
  const addons = saas.filter((s) => s.price.addon);

  return (
    <main id="main-content" tabIndex={-1} className="docs-page-enter mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <header className="mb-10 border-b border-surface-border pb-8">
        <Link href="/catalog" className="text-xs uppercase tracking-[0.16em] text-brand-accent hover:underline">
          ← Catalog
        </Link>
        <h1 className="mt-4 text-3xl font-semibold uppercase tracking-[0.04em] text-text-primary lg:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          Operator workspace access
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-text-secondary">
          Private-preview workspace access for approved operators: seats,
          engagements, buyer share links, and evidence dashboards. Request
          access through WitnessOps; there is no public app signup, and proof
          runs stay bounded service packages.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted">
          Workspace access is not a verification claim. It does not include
          proof runs, does not open public app signup, and does not turn sample
          dashboards into live customer evidence.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {tiers.map((sku) => (
          <CatalogSkuCard key={sku.id} sku={sku} />
        ))}
      </div>
      {addons.length > 0 ? (
        <section className="mt-10 border-t border-surface-border pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">Add-ons</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {addons.map((sku) => (
              <CatalogSkuCard key={sku.id} sku={sku} />
            ))}
          </div>
        </section>
      ) : null}
      <footer className="mt-10 border-t border-surface-border pt-8">
        <p className="text-sm leading-7 text-text-secondary">
          Operator workspace access requires a confirmed preview request. Proof
          packages are quoted after scope; there is no self-serve proof checkout
          on this page.
        </p>
        <p className="mt-3 text-xs text-text-muted">
          Self-serve app signup: {catalog.not_enabled?.includes("public app traffic") ? "not live" : "request access"}
        </p>
      </footer>
    </main>
  );
}
