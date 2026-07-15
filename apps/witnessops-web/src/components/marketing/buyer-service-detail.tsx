import type { ReactNode } from "react";
import Link from "next/link";

import { CtaButton } from "@/components/shared/cta-button";
import {
  buyerCatalogHref,
  buyerRequestHref,
  type BuyerLocale,
  type BuyerService,
} from "@/lib/buyer-services";
import { PUBLIC_NO_SECRETS_NOTE } from "@/lib/public-contact";
import { POLISH_NO_SECRETS_NOTE } from "@/lib/public-i18n";

const copy = {
  en: {
    eyebrow: "Services",
    back: "Back to services",
    result: "What you receive",
    price: "Price",
    timing: "Timing",
    start: "Start a review",
    reference: "Service reference",
  },
  pl: {
    eyebrow: "Usługi",
    back: "Wróć do usług",
    result: "Co otrzymasz",
    price: "Cena",
    timing: "Termin",
    start: "Rozpocznij zgłoszenie",
    reference: "Identyfikator usługi",
  },
} as const;

export function BuyerServiceDetail({
  locale,
  service,
  technicalId,
  requestHref: requestHrefOverride,
  children,
}: {
  locale: BuyerLocale;
  service: BuyerService;
  technicalId?: string;
  requestHref?: string;
  children?: ReactNode;
}) {
  const text = copy[locale];
  const requestHref = requestHrefOverride ?? buyerRequestHref(locale);
  const catalogueHref = buyerCatalogHref(locale);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="buyer-page bg-surface-bg"
      data-page="buyer-service-detail"
      data-buyer-service-detail={service.id}
      data-price-contract={service.commercialContract.price}
      data-timing-contract={service.commercialContract.timing}
    >
      <div className="mx-auto max-w-[1180px] px-6 py-10 md:py-14">
        <Link
          href={catalogueHref}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
        >
          ← {text.back}
        </Link>

        <header className="mt-7 grid gap-8 border-b border-surface-border pb-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:gap-12 lg:pb-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              {text.eyebrow}
            </p>
            <h1 className="mt-3 max-w-[18ch] text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] text-text-primary text-balance sm:text-[44px] md:text-[52px]">
              {service.name[locale]}
            </h1>
            <p className="mt-5 max-w-[60ch] text-base leading-7 text-text-secondary md:text-lg md:leading-8">
              {service.situation[locale]}
            </p>
            <div className="mt-7">
              <CtaButton
                href={requestHref}
                variant="primary"
                label={text.start}
                className="min-h-11 rounded-sm px-5 shadow-none hover:shadow-none"
              />
            </div>
            <p className="mt-4 max-w-[62ch] text-xs leading-5 text-text-muted">
              {locale === "pl" ? POLISH_NO_SECRETS_NOTE : PUBLIC_NO_SECRETS_NOTE}
            </p>
          </div>

          <aside className="self-start border border-surface-border bg-surface-card/50 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {text.result}
            </p>
            <p className="mt-3 text-sm leading-7 text-text-secondary">
              {service.result[locale]}
            </p>
            <dl className="mt-6 border-t border-surface-border pt-5">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {text.price}
                </dt>
                <dd className="mt-2 text-lg font-semibold text-text-primary">
                  {service.price[locale]}
                </dd>
              </div>
              <div className="mt-5">
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                  {text.timing}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-text-secondary">
                  {service.timing[locale]}
                </dd>
              </div>
              {technicalId ? (
                <div className="mt-5 border-t border-surface-border pt-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {text.reference}
                  </dt>
                  <dd className="mt-2 font-mono text-xs text-text-muted">{technicalId}</dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </header>

        {children ? <div className="py-10 md:py-14">{children}</div> : null}

        <section className="border-t border-surface-border pt-8">
          <CtaButton
            href={requestHref}
            variant="primary"
            label={text.start}
            className="min-h-11 rounded-sm px-5 shadow-none hover:shadow-none"
          />
        </section>
      </div>
    </main>
  );
}
