import Link from "next/link";

import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import {
  BUYER_SERVICES,
  buyerRequestHref,
  type BuyerLocale,
} from "@/lib/buyer-services";

const copy = {
  en: {
    eyebrow: "Services",
    title: "Start with the situation you need to move forward.",
    intro:
      "Every WitnessOps engagement starts with a non-secret fit check. We confirm the boundary, result, price, timing and evidence handling before work starts.",
    price: "Price",
    timing: "Timing",
    primaryCta: "Start a review",
    secondaryCta: "Learn more",
    unsureTitle: "Not sure which review fits?",
    unsureBody:
      "Describe the situation without files, secrets, credentials, logs, screenshots or customer evidence. The first step only checks fit.",
  },
  pl: {
    eyebrow: "Usługi",
    title: "Zacznij od sytuacji, którą chcesz rozwiązać.",
    intro:
      "Każda współpraca z WitnessOps zaczyna się od niepoufnej oceny dopasowania. Przed rozpoczęciem prac potwierdzamy zakres, rezultat, cenę, termin oraz sposób postępowania z materiałem dowodowym.",
    price: "Cena",
    timing: "Termin",
    primaryCta: "Rozpocznij zgłoszenie",
    secondaryCta: "Poznaj ofertę",
    unsureTitle: "Nie wiesz, który przegląd wybrać?",
    unsureBody:
      "Opisz sytuację bez załączników, danych dostępowych, logów, zrzutów ekranu ani materiałów klienta. Pierwszy krok służy wyłącznie ocenie dopasowania.",
  },
} as const;

export function BuyerCatalogue({ locale }: { locale: BuyerLocale }) {
  const text = copy[locale];
  const requestHref = buyerRequestHref(locale);

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <header className="max-w-4xl border-b border-surface-border pb-10">
          <p className="text-sm font-semibold text-text-muted">{text.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-text-primary md:text-5xl lg:text-6xl">
            {text.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
            {text.intro}
          </p>
        </header>

        <section
          aria-label={text.eyebrow}
          className="grid gap-px border border-surface-border bg-surface-border md:grid-cols-2"
        >
          {BUYER_SERVICES.map((service) => {
            const detailHref = service.detailHref[locale];
            return (
              <article
                key={service.id}
                data-buyer-service={service.id}
                data-price-contract={service.commercialContract.price}
                data-timing-contract={service.commercialContract.timing}
                className="flex h-full flex-col bg-white p-7 md:p-9"
              >
                <p className="text-sm leading-6 text-text-muted">
                  {service.situation[locale]}
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
                    <dd className="mt-1 leading-6 text-text-muted">
                      {service.price[locale]}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-text-primary">{text.timing}</dt>
                    <dd className="mt-1 leading-6 text-text-muted">
                      {service.timing[locale]}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex flex-wrap gap-3 pt-7">
                  <Link
                    href={requestHref}
                    className="inline-flex min-h-11 items-center bg-black px-5 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                  >
                    {text.primaryCta}
                  </Link>
                  {detailHref ? (
                    <Link
                      href={detailHref}
                      className="inline-flex min-h-11 items-center border border-surface-border px-5 text-sm font-semibold text-text-primary hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                    >
                      {text.secondaryCta}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        <section className="mt-12 flex flex-col gap-5 bg-black p-7 text-white md:flex-row md:items-center md:justify-between md:p-10">
          <div>
            <h2 className="text-2xl font-semibold">{text.unsureTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
              {text.unsureBody}
            </p>
          </div>
          <Link
            href={requestHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center bg-white px-5 text-sm font-semibold text-black hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
