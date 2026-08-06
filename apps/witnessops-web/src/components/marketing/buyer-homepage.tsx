import Link from "next/link";

import { CtaButton } from "@/components/shared/cta-button";
import {
  BUYER_SERVICES,
  ONE_PAGER_LINK_PROPS,
  buyerCatalogHref,
  buyerOfferRequestHref,
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
      eyebrow: "Public Exposure Review",
      title: "See what your public system exposes.",
      body: "Before a customer, auditor, or attacker finds it first. One authorised public-facing domain. Three working days. €1,900 ex VAT.",
    },
    primaryCta: "Order a Public Exposure Review",
    secondaryCta: "View a synthetic sample",
    verifyCta: "Verify a receipt",
    libraryCta: "Library",
    noSecrets: "Manually reviewed. No exploitation. Evidence-linked findings. Explicit limits. No sales call required.",
    visual: {
      label: "Illustrative delivery flow",
      boundary: "Public boundary",
      target: "example.com",
      checks: "Bounded checks",
      checkItems: ["DNS", "TLS", "HTTP", "Services"],
      result: "Decision package",
      resultItems: ["Fix now", "Fix next", "Unknowns"],
      footer: "Evidence linked · Limits stated · One focused retest",
    },
    offersEyebrow: "Other bounded proof work",
    offersTitle: "Need a different review?",
    offersBody:
      "The broader WitnessOps catalogue remains available for launches, workflows, access, custody, incidents, servers, and customer security reviews.",
    viewAll: "View all services",
    openService: "View service",
    onePager: "One-pager (PDF)",
    howTitle: "How it works",
    howSteps: [
      ["Submit one domain", "Provide a work email, one public domain, and your authority to request the review."],
      [
        "Scope is accepted",
        "WitnessOps confirms the boundary, capacity, and payment asynchronously. No sales call is required.",
      ],
      [
        "Receive the review",
        "The evidence-linked report is delivered within three working days after every start condition is complete.",
      ],
    ],
    whyTitle: "Why WitnessOps",
    whyHref: "/why-witnessops",
    whyItems: [
      [
        "One explicit public boundary",
        "One authorised domain, agreed checks, named exclusions, and stop conditions before target-facing work begins.",
      ],
      [
        "Evidence behind each result",
        "Findings link to inspectable observations while unknowns, unsupported claims, and work not performed stay visible.",
      ],
      [
        "A practical handover",
        "The result is organised so another responsible person can inspect it and decide what happens next.",
      ],
    ],
    closeTitle: "Check one domain. See the evidence.",
    closeBody:
      "Order without a sales call. WitnessOps accepts or rejects the scope before the delivery clock starts.",
    verifyHref: "/verify",
    libraryHref: "/library",
  },
  pl: {
    hero: {
      eyebrow: "Przegląd publicznej ekspozycji",
      title: "Sprawdź, co ujawnia Twój system publiczny.",
      body: "Zanim wskaże to klient, audytor lub atakujący. Jedna autoryzowana domena publiczna. Trzy dni robocze. €1 900 bez VAT.",
    },
    primaryCta: "Zamów przegląd publicznej ekspozycji",
    secondaryCta: "Zobacz syntetyczny przykład",
    verifyCta: "Zweryfikuj zapis",
    libraryCta: "Biblioteka",
    noSecrets: "Ręcznie zweryfikowane. Bez eksploatacji. Ustalenia powiązane z materiałami. Jawne ograniczenia. Bez rozmowy sprzedażowej.",
    visual: {
      label: "Ilustracyjny przebieg dostawy",
      boundary: "Granica publiczna",
      target: "example.com",
      checks: "Ograniczone kontrole",
      checkItems: ["DNS", "TLS", "HTTP", "Usługi"],
      result: "Pakiet decyzyjny",
      resultItems: ["Napraw teraz", "Napraw później", "Niewiadome"],
      footer: "Materiały powiązane · Jawne granice · Jeden retest",
    },
    offersEyebrow: "Inne ograniczone prace dowodowe",
    offersTitle: "Potrzebujesz innego przeglądu?",
    offersBody:
      "Szerszy katalog WitnessOps obejmuje uruchomienia, przepływy pracy, dostęp, custody, incydenty, serwery i przeglądy bezpieczeństwa klientów.",
    viewAll: "Zobacz wszystkie usługi",
    openService: "Zobacz usługę",
    onePager: "One-pager (PDF)",
    howTitle: "Jak to działa",
    howSteps: [
      ["Podaj jedną domenę", "Podaj służbowy e-mail, jedną domenę publiczną i podstawę upoważnienia."],
      [
        "Akceptacja zakresu",
        "WitnessOps asynchronicznie potwierdza granicę, dostępność i płatność. Rozmowa sprzedażowa nie jest wymagana.",
      ],
      [
        "Odbierz przegląd",
        "Raport z ustaleniami powiązanymi z materiałami otrzymasz w ciągu trzech dni roboczych od spełnienia wszystkich warunków startu.",
      ],
    ],
    whyTitle: "Dlaczego WitnessOps",
    whyHref: "/pl/why-witnessops",
    whyItems: [
      [
        "Jedna jawna granica publiczna",
        "Jedna autoryzowana domena, uzgodnione kontrole, nazwane wyłączenia i warunki zatrzymania przed rozpoczęciem pracy wobec celu.",
      ],
      [
        "Materiały za każdym wynikiem",
        "Ustalenia prowadzą do sprawdzalnych obserwacji, a niewiadome, niepoparte twierdzenia i niewykonana praca pozostają widoczne.",
      ],
      [
        "Praktyczne przekazanie",
        "Wynik jest uporządkowany tak, aby kolejna odpowiedzialna osoba mogła go sprawdzić i zdecydować o następnym kroku.",
      ],
    ],
    closeTitle: "Sprawdź jedną domenę. Zobacz materiały.",
    closeBody:
      "Zamów bez rozmowy sprzedażowej. WitnessOps akceptuje albo odrzuca zakres przed uruchomieniem terminu dostawy.",
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
  const orderHref = buyerOfferRequestHref(locale, "OFFSEC-EXTERNAL-EXPOSURE");
  const sampleHref = "/review/sample-cases/external-exposure-assessment";

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page bg-surface-bg" data-page="home">
      <section
        data-ui-proof-id="homepage-hero"
        className="border-b border-surface-border bg-surface-bg"
      >
        <header className="mx-auto grid max-w-[1180px] gap-10 px-6 py-14 sm:py-16 md:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-16">
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
                href={orderHref}
                variant="primary"
                label={text.primaryCta}
                className="min-h-[44px] px-4 text-[13px] font-semibold sm:px-6 sm:text-sm"
              />
              <CtaButton
                href={sampleHref}
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
          <aside
            aria-label={text.visual.label}
            className="relative overflow-hidden border border-surface-border bg-surface-card/50 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.06)] sm:p-6"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-brand-accent/10 blur-3xl"
            />
            <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-accent">
              {text.visual.label}
            </p>
            <div className="relative mt-5 space-y-3">
              <div className="border border-surface-border bg-surface-bg p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  01 · {text.visual.boundary}
                </p>
                <p className="mt-2 font-mono text-sm font-semibold text-text-primary">
                  {text.visual.target}
                </p>
              </div>
              <div className="ml-5 border border-brand-accent/40 bg-brand-accent/5 p-4 sm:ml-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
                  02 · {text.visual.checks}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {text.visual.checkItems.map((item) => (
                    <span
                      key={item}
                      className="border border-surface-border bg-surface-bg px-2.5 py-1 font-mono text-[11px] text-text-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ml-10 border border-surface-border bg-surface-bg p-4 sm:ml-16">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  03 · {text.visual.result}
                </p>
                <ul className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
                  {text.visual.resultItems.map((item, index) => (
                    <li key={item} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-signal-red" : index === 1 ? "bg-signal-amber" : "bg-brand-accent"}`}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="relative mt-5 border-t border-surface-border pt-4 font-mono text-[10px] leading-5 text-text-muted">
              {text.visual.footer}
            </p>
          </aside>
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
            {BUYER_SERVICES.filter(
              (service) =>
                service.id !== "external-exposure-assessment" &&
                service.homepageFeatured !== false,
            ).map((service) => {
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
            <CtaButton href={orderHref} variant="primary" label={text.primaryCta} />
            <CtaButton href={catalogHref} variant="secondary" label={text.viewAll} />
          </div>
        </section>
      </div>
    </main>
  );
}
