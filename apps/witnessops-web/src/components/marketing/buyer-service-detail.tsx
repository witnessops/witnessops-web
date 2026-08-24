import type { ReactNode } from "react";
import Link from "next/link";

import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
import {
  ONE_PAGER_LINK_PROPS,
  buyerCatalogHref,
  buyerOfferRequestHref,
  buyerRequestHref,
  type BuyerLocale,
  type BuyerService,
} from "@/lib/buyer-services";
import { PUBLIC_NO_SECRETS_NOTE } from "@/lib/public-contact";
import { POLISH_NO_SECRETS_NOTE } from "@/lib/public-i18n";
import { getServiceLanding } from "@/lib/service-landings";

const ui = {
  en: {
    back: "Back to services",
    commercial: "Commercial line",
    whoFor: "Who it is for",
    receive: "What you receive",
    fixedScope: "Fixed scope",
    how: "How it works",
    claim: "What is claimed",
    boundaries: "Boundaries",
    notIncluded: "Not included",
    verification: "How to inspect the result",
    start: "Start a non-secret fit check",
    viewServices: "View services",
    onePager: "One-pager (PDF)",
    reference: "Service reference",
    sampleFallback: "View example",
  },
  pl: {
    back: "Wróć do usług",
    commercial: "Warunki handlowe",
    whoFor: "Dla kogo",
    receive: "Co otrzymasz",
    fixedScope: "Stały zakres",
    how: "Jak to działa",
    claim: "Co obejmuje twierdzenie",
    boundaries: "Granice",
    notIncluded: "Czego oferta nie obejmuje",
    verification: "Jak sprawdzić wynik",
    start: "Rozpocznij wstępną ocenę bez informacji poufnych",
    viewServices: "Zobacz usługi",
    onePager: "One-pager (PDF)",
    reference: "Identyfikator usługi",
    sampleFallback: "Zobacz przykład",
  },
} as const;

/** Short commercial figure for the accent panel (CSR-style). */
function commercialPriceLabel(price: string): string {
  // Drop parenthetical FX notes: "… (ok. €950)"
  const withoutParen = price.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const cut = withoutParen.split(/\s+(?:after|po|—)\s+/i)[0]?.trim();
  // Prefer leading "From/Od … zł/€…" or "Standardowo … zł"
  return cut || withoutParen || price;
}

export function BuyerServiceDetail({
  locale,
  service,
  technicalId,
  requestHref: requestHrefOverride,
  claim,
  notIncluded,
  verificationPath,
  children,
}: {
  locale: BuyerLocale;
  service: BuyerService;
  technicalId?: string;
  requestHref?: string;
  /** Optional catalog claim sentence (shown once, CSR-clean). */
  claim?: string;
  /** Extra not-included lines from catalog frames. */
  notIncluded?: string[];
  verificationPath?: string;
  children?: ReactNode;
}) {
  const text = ui[locale];
  const landing = getServiceLanding(service.id, locale);
  const requestHref =
    requestHrefOverride ??
    (service.productId
      ? buyerOfferRequestHref(locale, service.productId)
      : buyerRequestHref(locale));
  const catalogueHref = buyerCatalogHref(locale);
  const onePager = service.onePagerHref?.[locale] ?? service.onePagerHref?.en;
  const primaryCta = landing.primaryCta ?? text.start;
  const secretsNote = locale === "pl" ? POLISH_NO_SECRETS_NOTE : PUBLIC_NO_SECRETS_NOTE;
  const priceDisplay = commercialPriceLabel(service.price[locale]);
  const scopeHeading =
    locale === "en" && service.id === "external-exposure-assessment"
      ? "What we review"
      : text.fixedScope;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="buyer-page"
      data-page="buyer-service-detail"
      data-buyer-service-detail={service.id}
      data-price-contract={service.commercialContract.price}
      data-timing-contract={service.commercialContract.timing}
    >
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <Link
          href={catalogueHref}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        >
          ← {text.back}
        </Link>

        <header className="mt-8 grid gap-8 border-b border-surface-border pb-12 md:gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            {service.availability ? (
              <p
                data-service-availability={service.availability.status}
                className="inline-flex border border-surface-border bg-neutral-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
              >
                {service.availability.label[locale]}
              </p>
            ) : null}
            <p
              className={`${service.availability ? "mt-4 " : ""}text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent`}
            >
              {service.name[locale]}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
              {landing.headline}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
              {service.situation[locale]}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton href={requestHref} variant="primary" label={primaryCta} />
              {onePager ? (
                <a
                  href={onePager}
                  {...ONE_PAGER_LINK_PROPS}
                  data-one-pager={service.id}
                  className="inline-flex min-h-12 items-center justify-center border border-surface-border px-6 text-center text-sm font-semibold leading-5 text-text-primary transition-colors hover:border-brand-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                >
                  {text.onePager}
                </a>
              ) : null}
              {landing.sampleHref ? (
                <CtaButton
                  href={landing.sampleHref}
                  variant="secondary"
                  label={landing.sampleLabel ?? text.sampleFallback}
                />
              ) : null}
              <CtaButton href={catalogueHref} variant="secondary" label={text.viewServices} />
            </div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-text-muted">{secretsNote}</p>
          </div>

          <aside className="border border-brand-accent/40 bg-brand-accent/5 p-6 sm:p-7">
            <div className="sm:grid sm:grid-cols-2 sm:gap-8 lg:block">
              <div>
                <p className="text-sm font-semibold text-text-muted">{text.commercial}</p>
                <p className="mt-3 text-3xl font-semibold text-text-primary">{priceDisplay}</p>
                {landing.commercialNote ? (
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {landing.commercialNote}
                  </p>
                ) : null}
              </div>
              <div className="mt-6 border-t border-surface-border pt-5 sm:mt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8 lg:mt-6 lg:border-t lg:border-l-0 lg:pt-5 lg:pl-0">
                <p className="text-sm leading-6 text-text-secondary">{service.timing[locale]}</p>
                {technicalId ? (
                  <p className="mt-4 font-mono text-[11px] text-text-muted">
                    {text.reference}: {technicalId}
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </header>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            {text.whoFor}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            {landing.whoFor}
          </p>
        </section>

        {landing.scopeLimits ? (
          <section className="border-b border-surface-border py-12">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              {scopeHeading}
            </h2>
            <ul className="mt-6 grid gap-4 text-base leading-7 text-text-secondary md:grid-cols-2">
              {landing.scopeLimits.map((item) => (
                <li key={item} className="border border-surface-border bg-surface-card/40 p-4">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="grid gap-10 border-b border-surface-border py-12 md:grid-cols-2 md:gap-8 lg:gap-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              {text.receive}
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
              {landing.deliverables.map((item) => (
                <li key={item} className="border-t border-surface-border pt-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              {text.how}
            </h2>
            <ol className="mt-6 space-y-4">
              {landing.steps.map(([title, body], index) => (
                <li key={title} className="border-t border-surface-border pt-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {index + 1}. {title}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-text-secondary">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {claim ? (
          <section className="border-b border-surface-border py-12">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              {text.claim}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">{claim}</p>
          </section>
        ) : null}

        {verificationPath ? (
          <section className="border-b border-surface-border py-12">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              {text.verification}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
              {verificationPath}
            </p>
          </section>
        ) : null}

        {children ? (
          <section className="border-b border-surface-border py-12">{children}</section>
        ) : null}

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            {text.boundaries}
          </h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            {landing.boundaries.map((item) => (
              <li key={item} className="border-t border-surface-border pt-4">
                {item}
              </li>
            ))}
          </ul>
          {notIncluded && notIncluded.length > 0 ? (
            <div className="mt-10">
              <h3 className="text-xl font-semibold text-text-primary">{text.notIncluded}</h3>
              <ul className="mt-4 space-y-3 text-base leading-7 text-text-secondary">
                {notIncluded.map((item) => (
                  <li key={item} className="border-t border-surface-border pt-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="border-t border-surface-border pt-10">
          <div className="mb-8 flex flex-wrap gap-3">
            <CtaButton href={requestHref} variant="primary" label={primaryCta} />
            <CtaButton href={catalogueHref} variant="secondary" label={text.viewServices} />
          </div>
          <PublicContactRoute
            subject="fit-check"
            productName={service.name[locale]}
            locale={locale}
          />
        </div>
      </div>
    </main>
  );
}
