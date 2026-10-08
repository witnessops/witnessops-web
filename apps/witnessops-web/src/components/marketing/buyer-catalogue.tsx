import Link from "next/link";

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
    eyebrow: "WitnessOps reviews",
    title: "Two focused security reviews.",
    intro: "Understand what one agent action can do and what your internet-facing system exposes. Compare the scope, evidence and price before requesting a review.",
    pricingTitle: "Review pricing and scope",
    pricingEyebrow: "Pricing",
    price: "Price",
    timing: "Timing",
    boundary: "Scope and exclusions",
    aiCta: "Scope an AI review",
    externalCta: "Scope an external review",
    detailCta: "See scope and deliverables",
    sampleCta: "Synthetic sample",
    aiGroup: "Review one agent action",
    externalGroup: "Review external exposure",
    aiSummary: "One consequential agent or automation action. Permissions, approvals and execution evidence.",
    externalSummary: "One authorised internet-facing system. Not a penetration test.",
    principlesTitle: "Scope before work. Evidence beside findings.",
    principles: [
      ["Agree the boundary", "Scope, exclusions, price, authority and evidence handling are agreed before work starts."],
      ["Start without secrets", "The initial enquiry uses a short, non-secret description. Do not send credentials or production evidence."],
      ["Understand the limits", "The report distinguishes supported findings, unavailable evidence and questions the review could not answer."],
    ],
    enquiryBoundary: "An enquiry does not authorise collection or start a review. Payment and mailbox verification are not permission to inspect a system.",
    assuranceBoundary: "These reviews do not grant compliance certification. A report, receipt or verifier does not prove that a system is secure, complete or free of vulnerabilities.",
    unsureTitle: "Which of these two reviews fits?",
    unsureBody: "Describe the decision you need to make. We will confirm whether the Agent Action review, the external review, or neither is the right fit. No work starts from the enquiry.",
    enquiryCta: "Ask about fit",
    catalogueCta: "Compare scopes and prices",
  },
  pl: {
    eyebrow: "Przeglądy WitnessOps",
    title: "Dwa konkretne przeglądy bezpieczeństwa.",
    intro: "Poznaj jedno działanie agenta i ekspozycję systemu dostępnego z internetu. Porównaj zakres, materiały i cenę przed wysłaniem zgłoszenia.",
    pricingTitle: "Ceny i zakres przeglądów",
    pricingEyebrow: "Ceny",
    price: "Cena",
    timing: "Termin",
    boundary: "Zakres i wyłączenia",
    aiCta: "Omów przegląd agenta AI",
    externalCta: "Omów przegląd ekspozycji",
    detailCta: "Zobacz zakres i wyniki",
    sampleCta: "Syntetyczny przykład",
    aiGroup: "Sprawdź jedno działanie agenta",
    externalGroup: "Sprawdź ekspozycję zewnętrzną",
    aiSummary: "Jedno istotne działanie agenta lub automatyzacji. Uprawnienia, zatwierdzanie i dowody wykonania.",
    externalSummary: "Jeden autoryzowany system dostępny z internetu. To nie jest test penetracyjny.",
    principlesTitle: "Najpierw zakres. Ustalenia ze źródłami.",
    principles: [
      ["Uzgodniona granica", "Zakres, wyłączenia, cenę, upoważnienie i zasady obsługi materiałów uzgadniamy przed pracą."],
      ["Najpierw bez sekretów", "Pierwsze zgłoszenie to krótki, niepoufny opis. Nie przesyłaj danych dostępowych ani materiałów produkcyjnych."],
      ["Jawne ograniczenia", "Raport odróżnia ustalenia poparte źródłami, niedostępne materiały i pytania pozostające bez odpowiedzi."],
    ],
    enquiryBoundary: "Zgłoszenie nie upoważnia do zbierania danych ani nie rozpoczyna przeglądu. Płatność i weryfikacja skrzynki nie stanowią zgody na inspekcję systemu.",
    assuranceBoundary: "Przeglądy nie przyznają certyfikacji zgodności. Raport, zapis ani weryfikator nie dowodzą, że system jest bezpieczny, kompletny lub wolny od podatności.",
    unsureTitle: "Który z tych dwóch przeglądów pasuje?",
    unsureBody: "Opisz decyzję, którą musisz podjąć. Potwierdzimy, czy pasuje Agent Action Security Review, przegląd ekspozycji zewnętrznej, czy żaden z nich. Zgłoszenie nie rozpoczyna pracy.",
    enquiryCta: "Zapytaj o dopasowanie",
    catalogueCta: "Porównaj zakres i cenę",
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
      <div className="mx-auto max-w-6xl px-6 py-8 lg:py-12">
        <header className="max-w-4xl pb-7 md:pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">{pricing ? text.pricingEyebrow : text.eyebrow}</p>
          <h1 className="mt-3 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">{pricing ? text.pricingTitle : text.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">{text.intro}</p>
        </header>

        {services.map((service) => {
          const ai = service.id === PUBLIC_AGENT_ACTION_REVIEW_ID;
          const groupId = ai ? "ai-reviews" : "system-reviews";
          // Agent Action has no detail route. /catalog/workflows remains the
          // historical agent-tools-access-review record, so this card does not
          // link there. The request CTA carries offerId=agent-action-security-review.
          const detailHref = service.detailHref[locale];
          const serviceRequestHref = buyerServiceRequestHref(locale, service);
          return (
            <section key={service.id} id={groupId} aria-labelledby={`${groupId}-heading`} className="scroll-mt-28 mb-10">
              <h2 id={`${groupId}-heading`} className="text-2xl font-semibold tracking-tight text-text-primary">{ai ? text.aiGroup : text.externalGroup}</h2>
              <p className="mt-2 mb-5 max-w-2xl text-sm leading-6 text-text-secondary">{ai ? text.aiSummary : text.externalSummary}</p>
              <div className="grid max-w-3xl gap-px border border-surface-border bg-surface-border">
                <article
                  id={service.id}
                  data-buyer-service={service.id}
                  data-pricing-review={pricing ? (ai ? "agent-action" : "external-exposure") : undefined}
                  data-pricing-service={pricing ? service.id : undefined}
                  data-price-contract={service.commercialContract.price}
                  data-timing-contract={service.commercialContract.timing}
                  className="scroll-mt-28 flex h-full min-w-0 flex-col bg-surface-card p-5 md:p-7"
                >
                  <h3 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">{service.name[locale]}</h3>
                  <p className="mt-3 text-lg font-semibold leading-6 text-text-primary"><span className="sr-only">{text.price}: </span>{service.price[locale]}</p>
                  <p className="mt-4 text-sm leading-6 text-text-muted">{service.cardSituation[locale]}</p>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{service.result[locale]}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary"><span className="sr-only">{text.timing}: </span>{service.timing[locale]}</p>
                  <details className="mt-3 border-t border-surface-border">
                    <summary className="cursor-pointer py-3 text-sm text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{text.boundary}</summary>
                    <p className="pb-3 text-sm leading-6 text-text-muted">{service.boundary[locale]}</p>
                  </details>
                  <div className="mt-auto flex flex-wrap gap-3 pt-3">
                    <Link href={serviceRequestHref} className="inline-flex min-h-11 items-center border border-brand-accent bg-brand-accent px-5 text-sm font-semibold text-text-inverse transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg">{ai ? text.aiCta : text.externalCta}</Link>
                    {detailHref ? <Link href={detailHref} className="inline-flex min-h-11 items-center border border-surface-border px-5 text-sm font-semibold text-text-primary hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg">{text.detailCta}</Link> : null}
                    {!ai ? <Link href="/review/sample-cases/external-exposure-assessment" className="inline-flex min-h-11 items-center border border-surface-border px-5 text-sm font-semibold text-text-primary hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg">{text.sampleCta}</Link> : null}
                  </div>
                </article>
              </div>
            </section>
          );
        })}

        <p className="mt-5 max-w-3xl text-sm leading-6 text-text-muted">{text.enquiryBoundary}</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-text-muted">{text.assuranceBoundary}</p>
        <section className="mt-6 border-b border-surface-border py-7 md:py-10" aria-labelledby="shared-principles">
          <h2 id="shared-principles" className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">{text.principlesTitle}</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {text.principles.map(([title, body]) => <article key={title} className="border-t border-surface-border pt-4"><h3 className="font-semibold text-text-primary">{title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></article>)}
          </div>
        </section>
        <section className="mt-12 flex flex-col gap-5 border border-surface-border bg-surface-inset p-7 text-text-primary md:flex-row md:items-center md:justify-between md:p-10">
          <div><h2 className="text-2xl font-semibold">{text.unsureTitle}</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">{text.unsureBody}</p></div>
          <Link href={buyerRequestHref(locale)} className="inline-flex min-h-11 shrink-0 items-center justify-center border border-brand-accent bg-brand-accent px-5 text-sm font-semibold text-text-inverse transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg">{text.enquiryCta}</Link>
        </section>
        {pricing ? <Link href={locale === "pl" ? "/pl/catalog" : "/catalog"} className="mt-6 inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{text.catalogueCta}</Link> : null}
      </div>
    </main>
  );
}
