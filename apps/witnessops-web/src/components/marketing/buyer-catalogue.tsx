import Link from "next/link";
import { PriceText } from "@/lib/price-unit";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { getServiceLanding } from "@/lib/service-landings";
import { agentActionServiceJsonLd } from "@/lib/public-seo";

import {
  BUYER_SERVICES,
  buyerRequestHref,
  buyerServiceRequestHref,
  type BuyerLocale,
} from "@/lib/buyer-services";
import {
  PUBLIC_AGENT_ACTION_REVIEW_ID,
  publicPaidReviews,
} from "@/lib/public-paid-reviews";

const copy = {
  en: {
    eyebrow: "WitnessOps review",
    title: "Agent Action Security Review",
    intro: `One consequential agent or automation action for engineering teams and AI implementation partners preparing to launch or hand over an agent. ${PUBLIC_AGENT_ACTION_OFFER.price.en}. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}.`,
    pricingTitle: "Review pricing and scope",
    pricingEyebrow: "Pricing",
    price: "Price",
    timing: "Timing",
    boundary: "Scope and exclusions",
    aiCta: "Request an agent review",
    receive: "What you receive",
    how: "How the review works",
    detailCta: "See scope and deliverables",
    sampleCta: "Synthetic sample",
    aiGroup: "Review one agent action",
    aiSummary: "One consequential agent or automation action. Permissions, approvals and execution evidence.",
    principlesTitle: "Scope before work. Evidence beside findings.",
    principles: [
      ["Agree the boundary", "Scope, exclusions, price, authority and evidence handling are agreed before work starts."],
      ["Start without secrets", "The initial enquiry uses a short, non-secret description. Do not send credentials or production evidence."],
      ["Understand the limits", "The report distinguishes supported findings, unavailable evidence and questions the review could not answer."],
    ],
    enquiryBoundary: "An enquiry does not authorise collection or start a review. Payment and mailbox verification are not permission to inspect a system.",
    assuranceBoundary: "This review does not grant compliance certification. A report, receipt or verifier does not prove that a system is secure, complete or free of vulnerabilities.",
    unsureTitle: "Ready to request the review?",
    unsureBody: "Name the consequential action, the systems involved and the decision deadline. A non-secret fit check comes first. No work starts from the enquiry.",
    enquiryCta: "Request an agent review",
    catalogueCta: "See scope and deliverables",
  },
  pl: {
    eyebrow: "Przegląd WitnessOps",
    title: "Agent Action Security Review",
    intro: `Jedno istotne działanie agenta lub automatyzacji dla zespołów inżynierskich i partnerów wdrażających AI. ${PUBLIC_AGENT_ACTION_OFFER.price.pl}. ${PUBLIC_AGENT_ACTION_OFFER.timing.pl}.`,
    pricingTitle: "Cena i zakres przeglądu",
    pricingEyebrow: "Cena",
    price: "Cena",
    timing: "Termin",
    boundary: "Zakres i wyłączenia",
    aiCta: "Zgłoś przegląd agenta",
    receive: "Co otrzymasz",
    how: "Jak przebiega przegląd",
    detailCta: "Zobacz zakres i wyniki",
    sampleCta: "Syntetyczny przykład",
    aiGroup: "Sprawdź jedno działanie agenta",
    aiSummary: "Jedno istotne działanie agenta lub automatyzacji. Uprawnienia, zatwierdzanie i dowody wykonania.",
    principlesTitle: "Najpierw zakres. Ustalenia ze źródłami.",
    principles: [
      ["Uzgodniona granica", "Zakres, wyłączenia, cenę, upoważnienie i zasady obsługi materiałów uzgadniamy przed pracą."],
      ["Najpierw bez sekretów", "Pierwsze zgłoszenie to krótki, niepoufny opis. Nie przesyłaj danych dostępowych ani materiałów produkcyjnych."],
      ["Jawne ograniczenia", "Raport odróżnia ustalenia poparte źródłami, niedostępne materiały i pytania pozostające bez odpowiedzi."],
    ],
    enquiryBoundary: "Zgłoszenie nie upoważnia do zbierania danych ani nie rozpoczyna przeglądu. Płatność i weryfikacja skrzynki nie stanowią zgody na inspekcję systemu.",
    assuranceBoundary: "Ten przegląd nie przyznaje certyfikacji zgodności. Raport, zapis ani weryfikator nie dowodzą, że system jest bezpieczny, kompletny lub wolny od podatności.",
    unsureTitle: "Gotowy, aby zgłosić przegląd?",
    unsureBody: "Wskaż istotne działanie, zaangażowane systemy i termin decyzji. Najpierw niepoufna ocena dopasowania. Zgłoszenie nie rozpoczyna pracy.",
    enquiryCta: "Zgłoś przegląd agenta",
    catalogueCta: "Zobacz zakres i wyniki",
  },
} as const;

export function BuyerCatalogue({
  locale,
  surface = "catalogue",
}: {
  locale: BuyerLocale;
  surface?: "catalogue" | "pricing";
}) {
  const text = copy[locale];
  // This projection must not replace BUYER_SERVICES in historical or sitemap consumers.
  const services = publicPaidReviews(BUYER_SERVICES);
  const pricing = surface === "pricing";

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(agentActionServiceJsonLd(locale)) }} />
      <div className="mx-auto max-w-6xl px-6 py-8 lg:py-12">
        <header className="max-w-4xl pb-7 md:pb-10">
          <p className="wo-eyebrow text-brand-accent">{pricing ? text.pricingEyebrow : text.eyebrow}</p>
          <h1 className="wo-h1 mt-3 text-text-primary">{pricing ? text.pricingTitle : text.title}</h1>
          <p className="wo-lead mt-4 text-text-secondary">{text.intro}</p>
        </header>

        {services.map((service) => {
          const ai = service.id === PUBLIC_AGENT_ACTION_REVIEW_ID;
          const landing = getServiceLanding(service.id, locale);
          const groupId = ai ? "ai-reviews" : "system-reviews";
          // /catalog/workflows remains the historical inventory review record.
          // Current detail and request links retain the one-action identity.
          const detailHref = service.detailHref[locale];
          const serviceRequestHref = buyerServiceRequestHref(locale, service);
          return (
            <section key={service.id} id={groupId} aria-labelledby={`${groupId}-heading`} className="scroll-mt-28 mb-10">
              <h2 id={`${groupId}-heading`} className="wo-h2 text-text-primary">{text.aiGroup}</h2>
              <p className="wo-body mt-2 mb-5 text-text-secondary">{text.aiSummary}</p>
              <div className="grid max-w-3xl gap-px overflow-hidden rounded-md border border-surface-border bg-surface-border">
                <article
                  id={service.id}
                  data-buyer-service={service.id}
                  data-pricing-review={pricing ? "agent-action" : undefined}
                  data-pricing-service={pricing ? service.id : undefined}
                  data-price-contract={service.commercialContract.price}
                  data-timing-contract={service.commercialContract.timing}
                  className="scroll-mt-28 flex h-full min-w-0 flex-col bg-surface-card p-5 md:p-7"
                >
                  <h3 className="wo-h3 text-text-primary">{service.name[locale]}</h3>
                  <p className="wo-price mt-3 text-text-primary"><span className="sr-only">{text.price}: </span><PriceText text={service.price[locale]} /></p>
                  <p className="wo-body mt-4 text-text-primary">{service.cardSituation[locale]}</p>
                  <p className="wo-small mt-3 text-text-secondary">{landing.whoFor}</p>
                  {pricing ? <p className="wo-small mt-3 text-text-secondary">{service.result[locale]}</p> : <div className="mt-5">
                    <h4 className="wo-h4 text-text-primary">{text.receive}</h4>
                    <ul className="wo-body-long mt-3 list-disc space-y-2 pl-5 text-text-secondary">
                      {landing.deliverables.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>}
                  <p className="wo-small mt-2 text-text-secondary"><span className="sr-only">{text.timing}: </span>{service.timing[locale]}</p>
                  <details className="mt-3 border-t border-surface-border">
                    <summary className="wo-ui cursor-pointer py-3 text-text-secondary">{text.boundary}</summary>
                    <p className="wo-small pb-3 text-text-muted">{service.boundary[locale]}</p>
                    <ul className="wo-body-long list-disc space-y-2 pb-4 pl-5 text-text-secondary">
                      {landing.scopeLimits?.map((item) => <li key={item}>{item}</li>)}
                      {landing.boundaries.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </details>
                  {!pricing ? <details className="border-t border-surface-border">
                    <summary className="wo-ui cursor-pointer py-3 text-text-secondary">{text.how}</summary>
                    <ol className="wo-body-long list-decimal space-y-3 pb-4 pl-5 text-text-secondary">
                      {landing.steps.map(([title, body]) => <li key={title}><strong className="font-medium text-text-primary">{title}.</strong> {body}</li>)}
                    </ol>
                  </details> : null}
                  <div className="mt-auto flex flex-wrap gap-3 pt-3">
                    <Link href={serviceRequestHref} className="wo-ui inline-flex min-h-11 items-center border border-brand-accent bg-brand-accent px-5 text-text-inverse transition-colors hover:brightness-110">{text.aiCta}</Link>
                    {detailHref ? <Link href={detailHref} className="wo-ui inline-flex min-h-11 items-center border border-surface-border px-5 text-text-primary hover:bg-surface-inset">{text.detailCta}</Link> : null}
                  </div>
                </article>
              </div>
            </section>
          );
        })}

        <p className="wo-small mt-5 text-text-muted">{text.enquiryBoundary}</p>
        <p className="wo-small mt-3 text-text-muted">{text.assuranceBoundary}</p>
        <section className="mt-6 border-b border-surface-border py-7 md:py-10" aria-labelledby="shared-principles">
          <h2 id="shared-principles" className="wo-h2 text-text-primary">{text.principlesTitle}</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {text.principles.map(([title, body]) => <article key={title} className="border-t border-surface-border pt-4"><h3 className="wo-h4 text-text-primary">{title}</h3><p className="wo-small mt-2 text-text-secondary">{body}</p></article>)}
          </div>
        </section>
        <section className="mt-12 flex flex-col gap-5 border border-surface-border bg-surface-inset p-7 text-text-primary md:flex-row md:items-center md:justify-between md:p-10">
          <div><h2 className="wo-h2 text-text-primary">{text.unsureTitle}</h2><p className="wo-small mt-2 text-text-secondary">{text.unsureBody}</p></div>
          <Link href={buyerRequestHref(locale)} className="wo-ui inline-flex min-h-11 shrink-0 items-center justify-center border border-brand-accent bg-brand-accent px-5 text-text-inverse transition-colors hover:brightness-110">{text.enquiryCta}</Link>
        </section>
      </div>
    </main>
  );
}
