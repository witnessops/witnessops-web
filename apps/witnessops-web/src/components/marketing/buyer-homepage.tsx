import Link from "next/link";

import { CtaButton } from "@/components/shared/cta-button";
import {
  BUYER_SERVICES,
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
    noSecrets:
      "Start with a general, non-secret description. Do not send files, credentials, logs, screenshots, private keys, MFA codes or customer evidence during the fit check.",
    offersEyebrow: "Start with the situation",
    offersTitle: "Six reviews for work that needs a clear next step",
    offersBody:
      "The same active services, prices and timing contracts are available in English and Polish.",
    viewAll: "View all services",
    howTitle: "How it works",
    howSteps: [
      ["Describe the situation", "Send a short, non-secret fit request in your own words."],
      ["Agree the boundary", "We confirm the review, scope, authority, price, timing and evidence handling."],
      ["Receive the result", "We deliver the agreed report or package with evidence references, named limits and unresolved items."],
    ],
    whyTitle: "Why WitnessOps",
    whyItems: [
      ["Clear scope", "The engagement states what is included, what is excluded and where authority stops."],
      ["Evidence status stays visible", "Observed material, unsupported claims, unknowns and unresolved items are kept distinct."],
      ["A practical handover", "The result is organized so another responsible person can inspect it and decide what happens next."],
    ],
  },
  pl: {
    hero: {
      eyebrow: "Jasno określony zakres. Sprawdzalny wynik.",
      title: "Opowiedz nam, co wymaga sprawdzenia.",
      body: "Przed rozpoczęciem prac uzgadniamy sytuację, zakres, rezultat, cenę, termin oraz sposób postępowania z materiałem dowodowym. Następnie WitnessOps realizuje uzgodniony przegląd i przekazuje wynik z odniesieniami do dowodów, nazwanymi ograniczeniami i sprawami nierozstrzygniętymi.",
    },
    primaryCta: "Zobacz usługi",
    secondaryCta: "Rozpocznij zgłoszenie",
    noSecrets:
      "Zacznij od ogólnego, niepoufnego opisu. Podczas oceny dopasowania nie wysyłaj plików, danych dostępowych, logów, zrzutów ekranu, kluczy prywatnych, kodów MFA ani materiałów klienta.",
    offersEyebrow: "Zacznij od sytuacji",
    offersTitle: "Sześć przeglądów dla pracy, która wymaga jasnego następnego kroku",
    offersBody:
      "Te same aktywne usługi, ceny i zasady dotyczące terminów są dostępne po angielsku i po polsku.",
    viewAll: "Zobacz wszystkie usługi",
    howTitle: "Jak działa WitnessOps",
    howSteps: [
      ["Opisz sytuację", "Wyślij krótkie, niepoufne zgłoszenie własnymi słowami."],
      ["Uzgodnij granice", "Potwierdzamy usługę, zakres, upoważnienie, cenę, termin i sposób postępowania z materiałem."],
      ["Odbierz wynik", "Przekazujemy uzgodniony raport lub pakiet z odniesieniami do dowodów, nazwanymi ograniczeniami i sprawami nierozstrzygniętymi."],
    ],
    whyTitle: "Dlaczego WitnessOps",
    whyItems: [
      ["Jasny zakres", "Ustalenia wskazują, co obejmuje praca, co pozostaje poza zakresem i gdzie kończy się upoważnienie."],
      ["Widoczny status materiału", "Obserwacje, twierdzenia bez wsparcia, niewiadome i sprawy nierozstrzygnięte pozostają rozdzielone."],
      ["Praktyczne przekazanie", "Wynik jest uporządkowany tak, aby kolejna osoba odpowiedzialna mogła go sprawdzić i podjąć decyzję."],
    ],
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
          <h2 id="home-services-heading" className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            {text.offersTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-text-muted">
            {text.offersBody}
          </p>
          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {BUYER_SERVICES.map((service) => (
              <article
                key={service.id}
                data-home-service={service.id}
                className="flex h-full flex-col border border-surface-border bg-surface-card/40 p-5"
              >
                <p className="text-sm leading-6 text-text-muted">
                  {service.situation[locale]}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-text-primary">
                  {service.name[locale]}
                </h3>
                <p className="mt-auto pt-5 text-sm font-semibold text-brand-accent">
                  {service.price[locale]}
                </p>
              </article>
            ))}
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
          <h2 id="home-why-heading" className="text-2xl font-semibold text-text-primary">
            {text.whyTitle}
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {text.whyItems.map(([title, body]) => (
              <article key={title}>
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
