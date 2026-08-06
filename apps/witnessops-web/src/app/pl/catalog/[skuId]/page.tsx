import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
import { buyerServiceByProductId } from "@/lib/buyer-services";
import {
  POLISH_NO_SECRETS_NOTE,
  POLISH_OFFERS,
  polishOfferRequestHref,
  type CanonicalOffsecProductId,
} from "@/lib/public-i18n";
import { getSku, resolveSkuId } from "@witnessops/catalog";

type PageProps = { params: Promise<{ skuId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = resolveSkuId((await params).skuId);
  if (!resolved || !(resolved in POLISH_OFFERS)) return { title: "Nie znaleziono oferty" };
  const id = resolved as CanonicalOffsecProductId;
  const copy = POLISH_OFFERS[id];
  const buyerService = buyerServiceByProductId(id);
  const title = buyerService?.name.pl ?? copy.name;
  const description = buyerService?.situation.pl ?? copy.situation;
  return {
    title,
    description,
    alternates: {
      canonical: `/pl/catalog/${id.toLowerCase()}`,
      languages: {
        en: `/catalog/${id.toLowerCase()}`,
        pl: `/pl/catalog/${id.toLowerCase()}`,
        "x-default": `/catalog/${id.toLowerCase()}`,
      },
    },
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

export default async function PolishOfferPage({ params }: PageProps) {
  const id = resolveSkuId((await params).skuId) as CanonicalOffsecProductId | null;
  if (!id || !(id in POLISH_OFFERS)) notFound();
  const sku = getSku(id);
  if (!sku) notFound();
  const copy = POLISH_OFFERS[id];
  const buyerService = buyerServiceByProductId(id);

  if (buyerService) {
    return (
      <BuyerServiceDetail
        locale="pl"
        service={buyerService}
        technicalId={id}
        requestHref={polishOfferRequestHref(id)}
        verificationPath={copy.verification}
        notIncluded={copy.exclusions}
      />
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page" data-page="catalog-sku-detail-pl">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <Link
          href="/pl/catalog"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          ← Wróć do ofert
        </Link>

        <header className="mt-8 grid gap-8 border-b border-surface-border pb-12 md:gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              {id}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
              {copy.name}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">{copy.situation}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton
                href={polishOfferRequestHref(id)}
                variant="primary"
                label="Rozpocznij przegląd"
              />
              <CtaButton href="/pl/catalog" variant="secondary" label="Zobacz usługi" />
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-text-muted">{POLISH_NO_SECRETS_NOTE}</p>
          </div>
          <aside className="border border-brand-accent/40 bg-brand-accent/5 p-6 sm:p-7">
            <p className="text-sm font-semibold text-text-muted">Warunki handlowe</p>
            <p className="mt-3 text-3xl font-semibold text-text-primary">{copy.price}</p>
            {copy.priceDetail ? (
              <p className="mt-2 text-sm leading-6 text-text-secondary">{copy.priceDetail}</p>
            ) : null}
            <p className="mt-5 border-t border-surface-border pt-5 text-sm leading-6 text-text-secondary">
              {copy.timing}
            </p>
          </aside>
        </header>

        <section className="grid gap-10 border-b border-surface-border py-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              Co otrzymasz
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
              {copy.deliverables.map((item) => (
                <li key={item} className="border-t border-surface-border pt-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              Jak to działa
            </h2>
            <ol className="mt-6 space-y-4">
              {copy.process.map((item, index) => (
                <li key={item} className="border-t border-surface-border pt-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {index + 1}. {item}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Jak sprawdzić wynik
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">{copy.verification}</p>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Czego oferta nie obejmuje
          </h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            {copy.exclusions.map((item) => (
              <li key={item} className="border-t border-surface-border pt-4">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="border-t border-surface-border pt-10">
          <div className="mb-8 flex flex-wrap gap-3">
            <CtaButton
              href={polishOfferRequestHref(id)}
              variant="primary"
              label="Rozpocznij przegląd"
            />
            <CtaButton href="/pl/catalog" variant="secondary" label="Zobacz usługi" />
          </div>
          <PublicContactRoute locale="pl" productName={copy.name} subject="fit-check" />
        </div>
      </div>
    </main>
  );
}
