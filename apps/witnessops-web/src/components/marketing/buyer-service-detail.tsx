import type { ReactNode } from "react";
import Link from "next/link";

import { CtaButton } from "@/components/shared/cta-button";
import {
  buyerCatalogHref,
  buyerServiceRequestHref,
  type BuyerLocale,
  type BuyerService,
} from "@/lib/buyer-services";
import { PUBLIC_NO_SECRETS_NOTE } from "@/lib/public-contact";
import { POLISH_NO_SECRETS_NOTE } from "@/lib/public-i18n";
import { getServiceLanding } from "@/lib/service-landings";
import { servicePreparation } from "@/lib/service-preparation";
import { AUTOMATION_REPAIR_OFFER } from "@/lib/commercial-truth";
import { AgentReviewSample } from "./agent-review-sample";
import { ReviewerProfile } from "./reviewer-profile";

const ui = {
  en: {
    back: "All services", price: "Price", timing: "Delivery", whoFor: "Who it is for",
    receive: "What you get", fixedScope: "Scope and limits", how: "How the engagement works",
    claim: "What the result supports", boundaries: "Full scope and exclusions",
    notIncluded: "Not included", verification: "How to inspect the result",
    start: "Scope this review", reference: "Service reference", sampleFallback: "See an example",
    firstStep: "Start with a short description. We confirm fit and scope before work begins.",
    example: "Example and technical details",
  },
  pl: {
    back: "Wszystkie usługi", price: "Cena", timing: "Termin", whoFor: "Dla kogo",
    receive: "Co otrzymasz", fixedScope: "Zakres i ograniczenia", how: "Jak przebiega współpraca",
    claim: "Co potwierdza wynik", boundaries: "Pełny zakres i wyłączenia",
    notIncluded: "Czego oferta nie obejmuje", verification: "Jak sprawdzić wynik",
    start: "Omów zakres przeglądu", reference: "Identyfikator usługi", sampleFallback: "Zobacz przykład",
    firstStep: "Zacznij od krótkiego opisu. Dopasowanie i zakres potwierdzimy przed pracą.",
    example: "Przykład i szczegóły techniczne",
  },
} as const;

const summaryClass = "cursor-pointer py-4 text-base font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";

export function BuyerServiceDetail({
  locale, service, technicalId, requestHref: requestHrefOverride, claim, notIncluded,
  verificationPath, promoteCommercialContract = false, children,
}: {
  locale: BuyerLocale;
  service: BuyerService;
  technicalId?: string;
  requestHref?: string;
  claim?: string;
  notIncluded?: string[];
  verificationPath?: string;
  promoteCommercialContract?: boolean;
  children?: ReactNode;
}) {
  const text = ui[locale];
  const landing = getServiceLanding(service.id, locale);
  const requestHref = requestHrefOverride ?? buyerServiceRequestHref(locale, service);
  const primaryCta = landing.primaryCta ?? text.start;
  const firstStep = service.id === "external-exposure-assessment"
    ? locale === "pl"
      ? "Rozmowa sprzedażowa nie jest wymagana. Zakres i upoważnienie potwierdzamy przed pracą."
      : "No sales call required. We confirm scope and authority before work begins."
    : text.firstStep;
  const secretsNote = locale === "pl" ? POLISH_NO_SECRETS_NOTE : PUBLIC_NO_SECRETS_NOTE;

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page"
      data-page="buyer-service-detail" data-buyer-service-detail={service.id}
      data-price-contract={service.commercialContract.price}
      data-timing-contract={service.commercialContract.timing}>
      <div className="mx-auto max-w-6xl px-6 py-6 md:py-10 lg:py-12">
        <Link href={buyerCatalogHref(locale)} className="inline-flex min-h-11 items-center text-sm text-text-secondary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
          ← {text.back}
        </Link>

        <header className="mt-4 grid gap-6 border-b border-surface-border pb-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start lg:gap-12 lg:pb-12">
          <div className="min-w-0">
            {service.availability ? (
              <p data-service-availability={service.availability.status} className="mb-3 inline-flex border border-surface-border px-2.5 py-1 text-xs font-semibold text-text-muted">
                {service.availability.label[locale]}
              </p>
            ) : null}
            <p className="text-xs font-semibold uppercase leading-5 tracking-[0.14em] text-brand-accent">{service.name[locale]}</p>
            <h1 className="mt-3 max-w-3xl text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.035em] text-text-primary md:text-5xl lg:text-[3.5rem] [text-wrap:balance]">
              {landing.headline}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary md:text-lg md:leading-8">{service.situation[locale]}</p>
            <p className="mt-4 hidden max-w-xl text-sm leading-6 text-text-muted lg:block">{landing.whoFor}</p>
          </div>

          <section data-promoted-commercial-contract={promoteCommercialContract ? service.id : undefined}
            className="border border-brand-accent/40 bg-brand-accent/5 p-5 md:p-6" aria-label={text.price}>
            <dl>
              <dt className="text-xs font-semibold uppercase tracking-wider text-text-muted">{text.price}</dt>
              <dd className="mt-1 text-xl font-semibold leading-7 text-text-primary md:text-2xl">{service.price[locale]}</dd>
              <dt className="mt-3 text-xs font-semibold uppercase tracking-wider text-text-muted">{text.timing}</dt>
              <dd className="mt-1 text-sm leading-6 text-text-secondary">{service.timing[locale]}</dd>
            </dl>
            {service.id === AUTOMATION_REPAIR_OFFER.id ? <p className="mt-4 text-sm leading-6 text-text-secondary">{AUTOMATION_REPAIR_OFFER.repairPrice[locale]}. {locale === "pl" ? "Diagnoza nie zobowiązuje do naprawy." : "Diagnosis does not commit you to a repair."}</p> : null}
            <CtaButton href={requestHref} variant="primary" label={primaryCta} className="mt-5 w-full !min-h-11 !px-3 !text-sm !tracking-normal" />
            <p className="mt-3 text-xs leading-5 text-text-muted">{firstStep}</p>
          </section>
          {landing.sampleHref ? (
            <Link href={landing.sampleHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline underline-offset-4 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent lg:-mt-4">
              {landing.sampleLabel ?? text.sampleFallback} →
            </Link>
          ) : null}
        </header>

        {service.id === "bounded-workflow-review" ? <AgentReviewSample /> : null}

        <section className="grid gap-7 py-8 md:grid-cols-[1.15fr_0.85fr] md:gap-12 md:py-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">{text.receive}</h2>
            <ul className="mt-4 space-y-3 text-base leading-6 text-text-secondary">
              {landing.deliverables.map((item) => (
                <li key={item} className="border-t border-surface-border pt-3">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">{text.fixedScope}</h2>
            <p className="mt-4 text-sm leading-6 text-text-secondary">{landing.scopeNote}</p>
            <p className="mt-3 text-xs leading-5 text-text-muted">{secretsNote}</p>
            <div className="mt-5 lg:hidden">
              <h3 className="text-sm font-semibold text-text-primary">{text.whoFor}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{landing.whoFor}</p>
            </div>
          </div>
        </section>

        {service.id === AUTOMATION_REPAIR_OFFER.id ? children : null}
        <ReviewerProfile locale={locale} />

        <section aria-labelledby="buyer-preparation-heading" className="border-t border-surface-border py-7 md:py-8">
          <h2 id="buyer-preparation-heading" className="mb-3 text-2xl font-semibold tracking-tight text-text-primary">{locale === "pl" ? "Twój udział" : "Your part in the engagement"}</h2>
          {servicePreparation(service.id, locale).map(([question, answer]) => (
            <details key={question} className="border-t border-surface-border">
              <summary className={summaryClass}>{question}</summary>
              <p className="max-w-3xl pb-5 text-sm leading-6 text-text-secondary">{answer}</p>
            </details>
          ))}
        </section>

        <div className="border-y border-surface-border">
          <details className="border-b border-surface-border">
            <summary className={summaryClass}>{text.how}</summary>
            <ol className="grid list-none gap-5 pb-6 text-sm md:grid-cols-2">
              {landing.steps.map(([title, body], index) => (
                <li key={title}>
                  <h3 className="font-semibold text-text-primary">{index + 1}. {title}</h3>
                  <p className="mt-1 leading-6 text-text-secondary">{body}</p>
                </li>
              ))}
            </ol>
          </details>
          <details>
            <summary className={summaryClass}>{text.boundaries}</summary>
            <div className="space-y-5 pb-6 text-sm leading-6 text-text-secondary">
              {landing.commercialNote ? <p>{landing.commercialNote}</p> : null}
              {landing.scopeLimits ? (
                <ul className="list-disc space-y-2 pl-5">{landing.scopeLimits.map((item) => <li key={item}>{item}</li>)}</ul>
              ) : null}
              <ul className="list-disc space-y-2 pl-5">{landing.boundaries.map((item) => <li key={item}>{item}</li>)}</ul>
              {notIncluded?.length ? (
                <div><h3 className="font-semibold text-text-primary">{text.notIncluded}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5">{notIncluded.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
              {technicalId ? <p className="font-mono text-xs">{text.reference}: {technicalId}</p> : null}
            </div>
          </details>
          {claim || verificationPath || (children && service.id !== AUTOMATION_REPAIR_OFFER.id) ? (
            <details className="border-t border-surface-border">
              <summary className={summaryClass}>{text.example}</summary>
              <div className="space-y-5 pb-6 text-sm leading-6 text-text-secondary">
                {claim ? <div><h3 className="font-semibold text-text-primary">{text.claim}</h3><p className="mt-2">{claim}</p></div> : null}
                {verificationPath ? <div><h3 className="font-semibold text-text-primary">{text.verification}</h3><p className="mt-2">{verificationPath}</p></div> : null}
                {service.id !== AUTOMATION_REPAIR_OFFER.id ? children : null}
              </div>
            </details>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-3 pt-7 sm:flex-row sm:items-center sm:gap-6">
          <CtaButton href={requestHref} variant="primary" label={primaryCta} />
          <p className="max-w-md text-sm leading-6 text-text-muted">{firstStep}</p>
        </div>
      </div>
    </main>
  );
}
