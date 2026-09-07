import Link from "next/link";

import {
  buyerRequestHref,
  buyerServiceRequestHref,
  buyerServiceById,
  buyerServiceCta,
  type BuyerService,
  type BuyerLocale,
} from "@/lib/buyer-services";

const copy = {
  en: {
    eyebrow: "WitnessOps services",
    title: "What do you need to check?",
    intro:
      "Review an AI action, examine a system or restore a workflow. See what each engagement includes and costs.",
    price: "Price",
    timing: "Timing",
    boundary: "Scope and exclusions",
    primaryCta: "Scope a review",
    secondaryCta: "See scope and deliverables",
    principlesTitle: "Shared service principles",
    principles: [
      [
        "Know what is included",
        "Agree the scope, exclusions, price and access before work starts.",
      ],
      [
        "No secrets first",
        "The fit check uses plain-language, sanitised information only.",
      ],
      [
        "Findings you can inspect",
        "See the finding, its supporting evidence and what remains uncertain.",
      ],
    ],
    methodsCta: "See example reviews",
    methodsHref: "/review/sample-cases",
    unsureTitle: "Not sure which service fits?",
    unsureBody:
      "Start with a short description. We’ll confirm fit, scope and price before work begins. No credentials or customer records needed.",
  },
  pl: {
    eyebrow: "Usługi WitnessOps",
    title: "Co chcesz sprawdzić?",
    intro:
      "Sprawdź działanie AI, przyjrzyj się systemowi lub przywróć proces. Poznaj zakres i cenę każdej usługi.",
    price: "Cena",
    timing: "Termin",
    boundary: "Zakres i wyłączenia",
    primaryCta: "Omów zakres przeglądu",
    secondaryCta: "Zobacz zakres i wyniki",
    principlesTitle: "Wspólne zasady usług",
    principles: [
      [
        "Wiesz, co obejmuje usługa",
        "Zakres, wyłączenia, cenę i dostęp uzgadniamy przed rozpoczęciem pracy.",
      ],
      [
        "Najpierw bez informacji poufnych",
        "Wstępna ocena korzysta wyłącznie z zanonimizowanych informacji w zwykłym języku.",
      ],
      [
        "Wynik, który można sprawdzić",
        "Poznaj ustalenia, materiały, które je wspierają, i kwestie pozostające niepewne.",
      ],
    ],
    methodsCta: "Zobacz przykładowe przeglądy",
    methodsHref: "/review/sample-cases",
    unsureTitle: "Nie wiesz, którą usługę wybrać?",
    unsureBody:
      "Zacznij od krótkiego opisu. Zakres i cenę uzgodnimy przed pracą. Bez danych logowania i danych klientów.",
  },
} as const;

const serviceGroups: { id: string; title: [string, string]; description: [string, string]; services: BuyerService["id"][] }[] = [
  { id: "ai-reviews", title: ["Review an AI action", "Sprawdź działanie AI"], description: ["Permissions, approvals and evidence behind one important action.", "Uprawnienia, zatwierdzanie i dowody jednego ważnego działania."], services: ["bounded-workflow-review"] },
  { id: "system-reviews", title: ["Review a system", "Sprawdź system"], description: ["A focused review of one Linux host or one public-facing system.", "Przegląd jednego serwera Linux lub systemu dostępnego z internetu."], services: ["one-server-security-check", "external-exposure-assessment"] },
  { id: "workflow-recovery", title: ["Restore a workflow", "Przywróć działanie procesu"], description: ["Start with diagnosis. Agree the repair once the failing path is understood.", "Zacznij od diagnozy. Uzgodnij naprawę po poznaniu zawodnej ścieżki."], services: ["automation-repair-handover"] },
  { id: "specialist-reviews", title: ["Specialist reviews", "Przeglądy specjalistyczne"], description: ["A customer questionnaire, launch decision, custody controls, incident plan or professional record.", "Kwestionariusz klienta, decyzja o wdrożeniu, kontrola nad aktywami, plan na incydent lub profil zawodowy."], services: ["customer-security-review-sprint", "launch-readiness-check", "key-access-custody-review", "incident-readiness-review", "professional-public-footprint-audit"] },
];

export function BuyerCatalogue({ locale }: { locale: BuyerLocale }) {
  const text = copy[locale];
  const requestHref = buyerRequestHref(locale);
  const languageIndex = locale === "pl" ? 1 : 0;

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-8 lg:py-12">
        <header className="max-w-4xl pb-7 md:pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            {text.eyebrow}
          </p>
          <h1 className="mt-3 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            {text.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">{text.intro}</p>
        </header>

        <nav aria-label={locale === "pl" ? "Znajdź przegląd" : "Find your review"} className="mb-8 flex flex-wrap gap-2">
          {serviceGroups.map(group => <a key={group.id} href={`#${group.id}`} className="inline-flex min-h-11 items-center rounded border border-surface-border px-3 py-2 text-sm text-text-secondary transition-colors hover:border-brand-accent hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">{group.title[languageIndex]}</a>)}
        </nav>

        {serviceGroups.map(group => <section key={group.id} id={group.id} aria-labelledby={`${group.id}-heading`} className="scroll-mt-28 mb-10">
          <h2 id={`${group.id}-heading`} className="text-2xl font-semibold tracking-tight text-text-primary">{group.title[languageIndex]}</h2>
          <p className="mt-2 mb-5 max-w-2xl text-sm leading-6 text-text-secondary">{group.description[languageIndex]}</p>
          <div className={`grid gap-px border border-surface-border bg-surface-border ${group.services.length > 1 ? "md:grid-cols-2" : "max-w-3xl"}`}>
          {group.services.map(id => buyerServiceById(id)).map((service) => {
            const detailHref = service.detailHref[locale];
            const serviceRequestHref = buyerServiceRequestHref(locale, service);
            const externalExposureSample =
              service.id === "external-exposure-assessment"
                ? "/review/sample-cases/external-exposure-assessment"
                : undefined;
            return (
              <article
                key={service.id}
                id={service.id}
                data-buyer-service={service.id}
                data-price-contract={service.commercialContract.price}
                data-timing-contract={service.commercialContract.timing}
                className="scroll-mt-28 flex h-full min-w-0 flex-col bg-surface-card p-5 md:p-7 md:last:odd:col-span-2"
              >
                {service.availability ? (
                  <p
                    data-service-availability={service.availability.status}
                    className="mb-3 inline-flex self-start border border-surface-border bg-surface-inset px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted"
                  >
                    {service.availability.label[locale]}
                  </p>
                ) : null}
                <h3 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary">
                  {service.name[locale]}
                </h3>
                <p className="mt-3 text-lg font-semibold leading-6 text-text-primary">
                  <span className="sr-only">{text.price}: </span>{service.price[locale]}
                </p>
                <p className="mt-4 text-sm leading-6 text-text-muted">
                  {service.cardSituation[locale]}
                </p>
                <p className="mt-3 text-sm leading-6 text-text-secondary">
                  {service.result[locale]}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary"><span className="sr-only">{text.timing}: </span>{service.timing[locale]}</p>
                <details className="mt-3 border-t border-surface-border">
                  <summary className="cursor-pointer py-3 text-sm text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
                    {text.boundary}
                  </summary>
                  <dl className="space-y-3 pb-3 text-sm leading-6 text-text-muted">
                    <div><dt className="font-semibold">{text.boundary}</dt><dd>{service.boundary[locale]}</dd></div>
                  </dl>
                </details>
                <div className="mt-auto flex flex-wrap gap-3 pt-3">
                  <Link
                    href={serviceRequestHref}
                    className="inline-flex min-h-11 items-center border border-brand-accent bg-brand-accent px-5 text-sm font-semibold text-text-inverse transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg"
                  >
                    {buyerServiceCta(locale, service)}
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
                </div>
              </article>
            );
          })}
          </div>
        </section>)}

        <p className="mt-5 text-sm leading-6 text-text-muted">{locale === "pl" ? "Przeglądy nie przyznają certyfikacji zgodności." : "These reviews do not grant compliance certification."}</p>
        <section className="mt-6 border-b border-surface-border py-7 md:py-10" aria-labelledby="shared-principles">
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

        <details className="border-b border-surface-border py-2">
          <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
            {locale === "pl" ? "Jak sprawdzić nasze przykłady" : "How to inspect our examples"}
          </summary>
          <p className="max-w-2xl pb-4 text-sm leading-6 text-text-secondary">
            {locale === "pl"
              ? "Przykłady pokazują format wyniku i jego ograniczenia. Są syntetyczne i nie stanowią materiałów klienta."
              : "Samples show the deliverable and its limits. They are synthetic demonstrations, not live customer evidence."}
          </p>
          <Link href={text.methodsHref} className="mb-4 inline-flex min-h-11 items-center text-sm text-brand-accent underline underline-offset-4">{text.methodsCta}</Link>
        </details>

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


      </div>
    </main>
  );
}
