import Link from "next/link";

import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import {
  ONE_PAGER_LINK_PROPS,
  buyerRequestHref,
  buyerServiceRequestHref,
  buyerServicesByCommercialPriority,
  type BuyerLocale,
} from "@/lib/buyer-services";

const copy = {
  en: {
    eyebrow: "WitnessOps reviews",
    title: "Start with the situation you need to resolve.",
    intro:
      "Choose one bounded problem. We agree the authority, inputs, scope, result, price, timing and evidence handling before review work begins. Start with a non-secret fit check. These reviews do not grant compliance certification.",
    price: "Price",
    timing: "Timing",
    boundary: "Boundary",
    primaryCta: "Start a review",
    secondaryCta: "Learn more",
    onePagerCta: "One-pager (PDF)",
    commercialRole: {
      primary: "Primary paid entry point",
      secondary: "Secondary catalogue offer",
    },
    principlesTitle: "Shared service principles",
    principles: [
      [
        "One bounded scope",
        "The engagement names what is included, what is excluded and where authority stops.",
      ],
      [
        "No secrets first",
        "The fit check uses plain-language, sanitised information only.",
      ],
      [
        "A checkable result",
        "The delivery names the evidence references, receipt or verifier where one exists, and the limitations that still apply.",
      ],
    ],
    methodsTitle: "Methods under the package — not infinite product cards",
    methodsIntro:
      "WitnessOps maintains a large operator toolkit: collectors, validators, feed cross-checks, dependency lookups, receipt packaging and more. Those scripts are methods. The catalog only lists buyer situations with a handover package — not one card per capability.",
    methods: [
      [
        "Choose by situation",
        "Pick the bounded problem you need to resolve. Scope, authority, price and exclusions are agreed before substantive work.",
      ],
      [
        "Tools stay inside the package",
        "Whatever checks run for the engagement stay named in the deliverable with limits. A script is never sold as “you are safe.”",
      ],
      [
        "Inspect labelled examples",
        "Samples show how methods land in a package. They are not live customer evidence or a product catalogue of every tool.",
      ],
    ],
    methodsCta: "Inspect example reviews",
    methodsHref: "/review/sample-cases",
    unsureTitle: "Not sure which review fits?",
    unsureBody:
      "Describe the situation without files, secrets, credentials, logs, screenshots or customer evidence. The first step only checks fit.",
  },
  pl: {
    eyebrow: "Przeglądy WitnessOps",
    title: "Zacznij od sytuacji, którą trzeba rozwiązać.",
    intro:
      "Wybierz jeden ograniczony problem. Przed rozpoczęciem pracy uzgadniamy upoważnienie, materiały wejściowe, zakres, wynik, cenę, termin i sposób postępowania z materiałami. Te przeglądy nie przyznają certyfikacji zgodności.",
    price: "Cena",
    timing: "Termin",
    boundary: "Ograniczenie",
    primaryCta: "Rozpocznij przegląd",
    secondaryCta: "Więcej informacji",
    onePagerCta: "One-pager (PDF)",
    commercialRole: {
      primary: "Główny płatny punkt wejścia",
      secondary: "Dodatkowa oferta katalogowa",
    },
    principlesTitle: "Wspólne zasady usług",
    principles: [
      [
        "Jeden ograniczony zakres",
        "Ustalenia wskazują, co jest objęte pracą, czego nie obejmują i gdzie kończy się upoważnienie.",
      ],
      [
        "Najpierw bez informacji poufnych",
        "Wstępna ocena korzysta wyłącznie z zanonimizowanych informacji w zwykłym języku.",
      ],
      [
        "Wynik, który można sprawdzić",
        "Dostawa nazywa odwołania do materiałów, receipt lub weryfikator, jeśli istnieją, oraz ograniczenia, które nadal obowiązują.",
      ],
    ],
    methodsTitle: "Metody w pakiecie — nie nieskończone karty produktu",
    methodsIntro:
      "WitnessOps utrzymuje duży zestaw narzędzi operatorskich: kolektory, walidatory, cross-checki, zależności, pakowanie receipt i inne. Skrypty to metody. Katalog wymienia tylko sytuacje kupującego z pakietem do przekazania — nie jedną kartę na każdą zdolność.",
    methods: [
      [
        "Wybór według sytuacji",
        "Wybierz ograniczony problem do rozwiązania. Zakres, upoważnienie, cenę i wyłączenia uzgadniamy przed właściwą pracą.",
      ],
      [
        "Narzędzia zostają w pakiecie",
        "Kontrole wykonane w zakresie są nazwane w dostawie z limitami. Skrypt nigdy nie jest sprzedawany jako „jesteście bezpieczni”.",
      ],
      [
        "Oznaczone przykłady",
        "Przykłady pokazują, jak metody lądują w pakiecie. Nie są żywymi materiałami klienta ani katalogiem każdego narzędzia.",
      ],
    ],
    methodsCta: "Zobacz przykładowe przeglądy",
    methodsHref: "/review/sample-cases",
    unsureTitle: "Nie wiesz, który przegląd wybrać?",
    unsureBody:
      "Opisz sytuację bez plików, sekretów, danych logowania, logów, zrzutów ekranu ani materiałów klienta. Pierwszy krok służy wyłącznie ocenie dopasowania.",
  },
} as const;

export function BuyerCatalogue({ locale }: { locale: BuyerLocale }) {
  const text = copy[locale];
  const requestHref = buyerRequestHref(locale);
  const services = buyerServicesByCommercialPriority();

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <header className="max-w-4xl border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            {text.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            {text.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">{text.intro}</p>
        </header>

        <section
          aria-label={text.eyebrow}
          className="grid gap-px border border-surface-border bg-surface-border md:grid-cols-2"
        >
          {services.map((service) => {
            const detailHref = service.detailHref[locale];
            const onePager = service.onePagerHref?.[locale];
            const serviceRequestHref = buyerServiceRequestHref(locale, service);
            const externalExposureSample =
              service.id === "external-exposure-assessment"
                ? "/review/sample-cases/external-exposure-assessment"
                : undefined;
            return (
              <article
                key={service.id}
                data-buyer-service={service.id}
                data-price-contract={service.commercialContract.price}
                data-timing-contract={service.commercialContract.timing}
                className="flex h-full flex-col bg-surface-card p-7 md:p-9"
              >
                {service.commercialRole ? (
                  <p className="mb-3 inline-flex self-start text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                    {text.commercialRole[service.commercialRole]}
                  </p>
                ) : null}
                {service.availability ? (
                  <p
                    data-service-availability={service.availability.status}
                    className="mb-3 inline-flex self-start border border-surface-border bg-surface-inset px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
                  >
                    {service.availability.label[locale]}
                  </p>
                ) : null}
                <p className="text-sm leading-6 text-text-muted">
                  {service.cardSituation[locale]}
                </p>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-text-primary">
                  {service.name[locale]}
                </h2>
                <p className="mt-4 text-base leading-7 text-text-secondary">
                  {service.result[locale]}
                </p>
                <dl className="mt-7 grid gap-4 border-t border-surface-border pt-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-text-primary">{text.price}</dt>
                    <dd className="mt-1 leading-6 text-text-muted">{service.price[locale]}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-text-primary">{text.timing}</dt>
                    <dd className="mt-1 leading-6 text-text-muted">{service.timing[locale]}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-text-primary">{text.boundary}</dt>
                    <dd className="mt-1 leading-6 text-text-muted">
                      {service.boundary[locale]}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-3 pt-7">
                  <Link
                    href={serviceRequestHref}
                    className="inline-flex min-h-11 items-center border border-brand-accent bg-brand-accent px-5 text-sm font-semibold text-text-inverse transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                  >
                    {service.requestCta?.[locale] ?? text.primaryCta}
                  </Link>
                  {detailHref ? (
                    <Link
                      href={detailHref}
                      className="inline-flex min-h-11 items-center border border-surface-border px-5 text-sm font-semibold text-text-primary hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                    >
                      {text.secondaryCta}
                    </Link>
                  ) : null}
                  {externalExposureSample ? (
                    <Link
                      href={externalExposureSample}
                      className="inline-flex min-h-11 items-center border border-surface-border px-5 text-sm font-semibold text-text-primary hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                    >
                      {locale === "pl" ? "Syntetyczny przykład" : "Synthetic sample"}
                    </Link>
                  ) : null}
                  {onePager ? (
                    <a
                      href={onePager}
                      {...ONE_PAGER_LINK_PROPS}
                      data-one-pager={service.id}
                      className="inline-flex min-h-11 items-center border border-surface-border px-5 text-sm font-semibold text-text-primary hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                    >
                      {text.onePagerCta}
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-12 border-b border-surface-border py-12" aria-labelledby="shared-principles">
          <h2
            id="shared-principles"
            className="text-3xl font-semibold tracking-[-0.02em] text-text-primary"
          >
            {text.principlesTitle}
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {text.principles.map(([title, body]) => (
              <article key={title} className="border-t border-surface-border pt-4">
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-surface-border py-12" aria-labelledby="methods-not-cards">
          <h2
            id="methods-not-cards"
            className="text-3xl font-semibold tracking-[-0.02em] text-text-primary"
          >
            {text.methodsTitle}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            {text.methodsIntro}
          </p>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {text.methods.map(([title, body]) => (
              <article key={title} className="border-t border-surface-border pt-4">
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href={text.methodsHref}
              className="inline-flex min-h-11 items-center border border-surface-border px-5 text-sm font-semibold text-text-primary hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
            >
              {text.methodsCta}
            </Link>
          </div>
        </section>

        <section className="mt-12 flex flex-col gap-5 border border-surface-border bg-surface-inset p-7 text-text-primary md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="text-2xl font-semibold">{text.unsureTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">{text.unsureBody}</p>
          </div>
          <Link
            href={requestHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center border border-brand-accent bg-brand-accent px-5 text-sm font-semibold text-text-inverse transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
          >
            {text.primaryCta}
          </Link>
        </section>

        <div className="mt-10">
          <PublicContactRoute locale={locale} />
        </div>
      </div>
    </main>
  );
}
