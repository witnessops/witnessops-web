import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaButton } from "@/components/shared/cta-button";
import { getSku, resolveSkuId } from "@witnessops/catalog";

type PageProps = { params: Promise<{ skuId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { skuId } = await params;
  const id = resolveSkuId(skuId);
  const sku = id ? getSku(id) : undefined;
  if (!sku) return { title: "SKU not found" };
  return {
    title: sku.name,
    description: sku.summary,
    alternates: { canonical: `/catalog/${sku.id.toLowerCase()}` },
  };
}

export default async function CatalogSkuDetailPage({ params }: PageProps) {
  const { skuId } = await params;
  const id = resolveSkuId(skuId);
  if (!id) notFound();
  const sku = getSku(id);
  if (!sku) notFound();

  const primary = sku.cta.primary;
  const secondary = sku.cta.secondary;
  const isExternal = (href: string) =>
    href.startsWith("http://") || href.startsWith("https://");

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-3xl px-6 py-10 lg:py-14"
    >
      <Link
        href="/catalog"
        className="text-xs uppercase tracking-[0.16em] text-brand-accent hover:underline"
      >
        ← Catalog
      </Link>
      <header className="mt-4 border-b border-surface-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
          {sku.id}
        </p>
        <h1
          className="mt-2 text-3xl font-semibold text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {sku.name}
        </h1>
        <p className="mt-2 text-lg text-brand-accent">{sku.price.display}</p>
        <p className="mt-4 text-sm leading-7 text-text-secondary">{sku.summary}</p>
      </header>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Deliverables
        </h2>
        <ul className="mt-3 grid gap-2 text-sm text-text-secondary">
          {sku.deliverables.map((d) => (
            <li key={d} className="border border-surface-border bg-surface-card/40 px-4 py-3">
              {d}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          Boundaries
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-text-muted">
          {sku.boundaries.map((b) => (
            <li key={b}>— {b.replace(/_/g, " ")}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        {primary ? (
          isExternal(primary) ? (
            <a
              href={primary}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center border border-surface-border px-5 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              Primary CTA
            </a>
          ) : (
            <CtaButton href={primary} variant="primary" label="Get started" />
          )
        ) : null}
        {secondary && !isExternal(secondary) ? (
          <CtaButton href={secondary} variant="secondary" label="Inspect sample" />
        ) : null}
      </div>
    </main>
  );
}