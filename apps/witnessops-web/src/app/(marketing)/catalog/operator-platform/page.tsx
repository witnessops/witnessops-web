import type { Metadata } from "next";
import Link from "next/link";
import { CatalogSkuCard } from "@/components/catalog/catalog-sku-card";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
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
    <main
      id="main-content"
      tabIndex={-1}
      className="buyer-page"
      data-page="catalog-operator-platform"
    >
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <Link
          href="/catalog"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          ← Back to services
        </Link>

        <header className="mt-8 max-w-4xl border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Operator workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            Private-preview access for approved operators.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
            Seats, engagements, buyer share links and evidence dashboards. Request access through
            WitnessOps; there is no public app signup, and proof runs stay bounded service packages.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
            Workspace access is not a verification claim. It does not include proof runs, does not
            open public app signup, and does not turn sample dashboards into live customer evidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton href="/review/request" variant="primary" label="Request preview access" />
            <CtaButton href="/catalog" variant="secondary" label="View services" />
          </div>
        </header>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">Tiers</h2>
          <div className="mt-8 grid gap-px border border-surface-border bg-surface-border md:grid-cols-2">
            {tiers.map((sku) => (
              <CatalogSkuCard key={sku.id} sku={sku} />
            ))}
          </div>
        </section>

        {addons.length > 0 ? (
          <section className="border-b border-surface-border py-12">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">Add-ons</h2>
            <div className="mt-8 grid gap-px border border-surface-border bg-surface-border md:grid-cols-2">
              {addons.map((sku) => (
                <CatalogSkuCard key={sku.id} sku={sku} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">Boundaries</h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            <li className="border-t border-surface-border pt-4">
              Operator workspace access requires a confirmed preview request.
            </li>
            <li className="border-t border-surface-border pt-4">
              Proof packages are quoted after scope; there is no self-serve proof checkout on this
              page.
            </li>
            <li className="border-t border-surface-border pt-4">
              Self-serve app signup:{" "}
              {catalog.not_enabled?.includes("public app traffic") ? "not live" : "request access"}.
            </li>
          </ul>
        </section>

        <div className="border-t border-surface-border pt-10">
          <PublicContactRoute subject="fit-check" productName="Operator workspace access" />
        </div>
      </div>
    </main>
  );
}
