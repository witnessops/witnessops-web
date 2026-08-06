import Link from "next/link";

import { CtaButton } from "@/components/shared/cta-button";
import {
  BUYER_SERVICES,
  ONE_PAGER_LINK_PROPS,
  buyerCatalogHref,
  buyerRequestHref,
  type BuyerLocale,
} from "@/lib/buyer-services";

type HeroCopy = {
  eyebrow: string;
  title: string;
  body: string;
};

const localizedCopy = {
  en: {
    hero: {
      eyebrow: "Security and operational reviews",
      title: "Tell us what needs to move forward.",
      body: "We agree the situation, scope, result, price, timing and evidence handling before work starts. Then WitnessOps delivers the agreed review with evidence references, named limits and unresolved items.",
    },
    primaryCta: "View services",
    secondaryCta: "Start a review",
    verifyCta: "Verify a receipt",
    libraryCta: "Library",
    noSecrets:
      "Start with a general, non-secret description. Do not send files, credentials, logs, screenshots, private keys, API keys, MFA codes, recovery codes, session tokens or customer evidence during the fit check.",
    offersEyebrow: "Start with the situation",
    offersTitle: "Reviews for work that needs a clear next step",
    offersBody:
      "The same active services, prices and timing terms are available in English and Polish.",
    viewAll: "View all services",
    openService: "View service",
    onePager: "One-pager (PDF)",
    howTitle: "How it works",
    howSteps: [
      ["Describe the situation", "Send a short, non-secret fit request in your own words."],
      [
        "Agree the boundary",
        "We confirm the review, scope, authority, price, timing and evidence handling.",
      ],
      [
        "Receive the result",
        "We deliver the agreed report or package with evidence references, named limits and unresolved items.",
      ],
    ],
    whyTitle: "Why WitnessOps",
    whyHref: "/why-witnessops",
    whyItems: [
      [
        "One consequential activity",
        "We bound one agent run, decision or security situation—authorized, executed, observed and left unresolved.",
      ],
      [
        "Evidence status stays visible",
        "Observed material, management assertions, unsupported claims, unknowns and unresolved items are kept distinct.",
      ],
      [
        "A practical handover",
        "The result is organised so another responsible person can inspect it and decide what happens next.",
      ],
    ],
    closeTitle: "Ready for a bounded review?",
    closeBody:
      "Describe one situation without secrets. We confirm fit, scope, price and evidence handling before work starts.",
    verifyHref: "/verify",
    libraryHref: "/library",
  },
  pl: {
    hero: {
      eyebrow: "Przeglądy bezpieczeństwa i operacji",
      title: "Powiedz nam, co trzeba odblokować.",
      body: "Przed rozpoczęciem pracy uzgadniamy sytuację, zakres, wynik, cenę, termin i sposób postępowania z materiałami. Następnie WitnessOps realizuje uzgodniony przegląd i przekazuje wynik z odwołaniami do materiałów, jasno nazwanymi ograniczeniami i nierozwiązanymi kwestiami.",
    },
    primaryCta: "Zobacz usługi",
    secondaryCta: "Rozpocznij przegląd",
    verifyCta: "Zweryfikuj zapis",
    libraryCta: "Biblioteka",
    noSecrets:
      "Zacznij od ogólnego opisu bez informacji poufnych. Podczas wstępnej oceny nie wysyłaj plików, danych logowania, logów, zrzutów ekranu, kluczy prywatnych, kluczy API, kodów MFA, kodów odzyskiwania, tokenów sesyjnych ani materiałów klienta.",
    offersEyebrow: "Zacznij od sytuacji",
    offersTitle: "Przeglądy dla pracy, która potrzebuje jasnego następnego kroku",
    offersBody:
      "Te same aktywne usługi, ceny i zasady terminów są dostępne po angielsku i po polsku.",
    viewAll: "Zobacz wszystkie usługi",
    openService: "Zobacz usługę",
    onePager: "One-pager (PDF)",
    howTitle: "Jak to działa",
    howSteps: [
      ["Opisz sytuację", "Wyślij krótki opis własnymi słowami, bez informacji poufnych."],
      [
        "Uzgodnij zakres",
        "Potwierdzamy usługę, zakres, upoważnienie, cenę, termin i sposób postępowania z materiałami.",
      ],
      [
        "Odbierz wynik",
        "Przekazujemy uzgodniony raport lub pakiet z odwołaniami do materiałów, ograniczeniami i nierozwiązanymi kwestiami.",
      ],
    ],
    whyTitle: "Dlaczego WitnessOps",
    whyHref: "/pl/why-witnessops",
    whyItems: [
      [
        "Jedna istotna aktywność",
        "Ograniczamy jeden przebieg agenta, decyzję lub sytuację bezpieczeństwa: upoważnienie, wykonanie, obserwacje i nierozwiązane kwestie.",
      ],
      [
        "Widoczny status materiałów",
        "Obserwacje, oświadczenia kierownictwa, niepoparte twierdzenia, niewiadome i nierozwiązane kwestie pozostają rozdzielone.",
      ],
      [
        "Praktyczne przekazanie",
        "Wynik jest uporządkowany tak, aby kolejna odpowiedzialna osoba mogła go sprawdzić i zdecydować o następnym kroku.",
      ],
    ],
    closeTitle: "Gotowy na przegląd o ustalonym zakresie?",
    closeBody:
      "Opisz jedną sytuację bez informacji poufnych. Potwierdzamy dopasowanie, zakres, cenę i sposób postępowania z materiałami przed rozpoczęciem pracy.",
    verifyHref: "/pl/verify",
    libraryHref: "/pl/library",
  },
} as const;

export function BuyerHomepage({
  locale,
  hero,
}: {
  locale: BuyerLocale;
  hero?: HeroCopy;
}) {
  const text = localizedCopy[locale];
  const heroCopy = hero ?? text.hero;
  const catalogHref = buyerCatalogHref(locale);
  const requestHref = buyerRequestHref(locale);

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page bg-surface-bg" data-page="home">
      <section
        data-ui-proof-id="homepage-hero"
        className="border-b border-surface-border bg-surface-bg"
      >
        <header className="mx-auto max-w-[1180px] px-6 py-14 sm:py-16 md:py-16">
          <div className="min-w-0 max-w-[680px]">
            <p className="kb-section-tag mb-4 md:mb-5">{heroCopy.eyebrow}</p>
            <h1
              data-ui-proof-id="homepage-hero-headline"
              className="mb-5 max-w-[18ch] text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-balance text-text-primary sm:text-[38px] md:text-[46px] md:leading-[1] lg:text-[56px]"
            >
              {heroCopy.title}
            </h1>
            <p
              data-ui-proof-id="homepage-hero-body"
              className="max-w-[58ch] text-[17px] leading-8 text-text-secondary md:text-lg"
            >
              {heroCopy.body}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
              <CtaButton
                uiProofId="homepage-hero-primary-cta"
                href={catalogHref}
                variant="primary"
                label={text.primaryCta}
                className="min-h-[44px] px-4 text-[13px] font-semibold sm:px-6 sm:text-sm"
              />
              <CtaButton
                href={requestHref}
                variant="secondary"
                label={text.secondaryCta}
                className="min-h-[44px] px-4 text-[13px] shadow-none hover:shadow-none sm:px-6 sm:text-sm"
              />
            </div>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                href={text.verifyHref}
                className="font-semibold text-brand-accent underline-offset-4 hover:underline"
              >
                {text.verifyCta}
              </Link>
              <Link
                href={text.libraryHref}
                className="font-semibold text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
              >
                {text.libraryCta}
              </Link>
            </p>
            <p className="mt-5 max-w-[58ch] text-[13px] leading-6 text-text-muted">
              {text.noSecrets}
            </p>
          </div>
        </header>
      </section>

      <div className="mx-auto max-w-[1180px] px-6">
        <section className="py-12 md:py-16" aria-labelledby="home-services-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            {text.offersEyebrow}
          </p>
          <h2
            id="home-services-heading"
            className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.02em] text-text-primary"
          >
            {text.offersTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">{text.offersBody}</p>
          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {BUYER_SERVICES.filter((service) => service.homepageFeatured !== false).map((service) => {
              const onePager = service.onePagerHref?.[locale];
              const detailHref =
                service.detailHref[locale] ??
                service.detailHref.en ??
                catalogHref;
              return (
                <article
                  key={service.id}
                  data-home-service={service.id}
                  className="flex h-full flex-col border border-surface-border bg-surface-card/40 p-5 transition-colors hover:border-brand-accent/50"
                >
                  <p className="text-sm leading-6 text-text-muted">
                    {service.cardSituation[locale]}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-text-primary">
                    <Link
                      href={detailHref}
                      className="hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      {service.name[locale]}
                    </Link>
                  </h3>
                  <p className="mt-auto pt-5 text-sm font-semibold text-brand-accent">
                    {service.price[locale]}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link
                      href={detailHref}
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    >
                      {text.openService}
                    </Link>
                    {onePager ? (
                      <a
                        href={onePager}
                        {...ONE_PAGER_LINK_PROPS}
                        data-one-pager={service.id}
                        className="inline-flex min-h-11 items-center text-sm font-semibold text-text-muted underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                      >
                        {text.onePager}
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-7">
            <Link
              href={catalogHref}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              {text.viewAll} →
            </Link>
          </div>
        </section>

        <section className="border-y border-surface-border py-12" aria-labelledby="home-how-heading">
          <h2 id="home-how-heading" className="text-2xl font-semibold text-text-primary">
            {text.howTitle}
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {text.howSteps.map(([title, body], index) => (
              <li key={title} className="border border-surface-border p-5">
                <span className="text-xs font-semibold text-brand-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-12" aria-labelledby="home-why-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="home-why-heading" className="text-2xl font-semibold text-text-primary">
              {text.whyTitle}
            </h2>
            <Link
              href={text.whyHref}
              className="text-sm font-semibold text-brand-accent underline-offset-4 hover:underline"
            >
              {text.whyTitle} →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {text.whyItems.map(([title, body]) => (
              <article key={title}>
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="mb-12 border border-surface-border bg-surface-card/30 p-6 sm:p-8"
          aria-labelledby="home-close-heading"
        >
          <h2
            id="home-close-heading"
            className="text-xl font-semibold text-text-primary sm:text-2xl"
          >
            {text.closeTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
            {text.closeBody}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <CtaButton href={requestHref} variant="primary" label={text.secondaryCta} />
            <CtaButton href={catalogHref} variant="secondary" label={text.primaryCta} />
          </div>
        </section>
      </div>
    </main>
  );
}
