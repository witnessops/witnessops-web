import Link from "next/link";

import { CtaButton } from "@/components/shared/cta-button";
import {
  BUYER_SERVICES,
  ONE_PAGER_LINK_PROPS,
  buyerCatalogHref,
  buyerOfferRequestHref,
  type BuyerLocale,
} from "@/lib/buyer-services";
import styles from "./buyer-homepage.module.css";
import { HOMEPAGE_SYNTHETIC_PREVIEW } from "./homepage-synthetic-preview";

type HeroCopy = {
  eyebrow: string;
  title: string;
  body: string;
};

const localizedCopy = {
  en: {
    hero: {
      eyebrow: "Public Exposure Review",
      title: "See what your public-facing system exposes from the internet.",
      body: "Manually reviewed findings, evidence attached, and a practical fix list.",
    },
    commercialLine: "€1,900 ex VAT · 3 working days · fixed scope",
    primaryCta: "Request your review",
    secondaryCta: "View a synthetic sample",
    verifyCta: "Verify a receipt",
    libraryCta: "Library",
    noSecrets: "Manually reviewed. No exploitation. Evidence-linked findings. Explicit limits. No sales call required.",
    offersEyebrow: "Other bounded proof work",
    offersTitle: "Need a different review?",
    offersBody:
      "The broader WitnessOps catalogue remains available for launches, workflows, access, custody, incidents, servers, and customer security reviews.",
    viewAll: "View all services",
    openService: "View service",
    onePager: "One-pager (PDF)",
    howTitle: "How it works",
    howSteps: [
      ["Name one public target", "Provide a work email, one public-facing system, and your authority to request the review."],
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
        "One authorised public-facing system, agreed checks, named exclusions, and stop conditions before target-facing work begins.",
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
    closeTitle: "See what your public-facing system exposes.",
    closeBody:
      "Request the review without a sales call. WitnessOps accepts or rejects the scope before the delivery clock starts.",
    verifyHref: "/verify",
    libraryHref: "/library",
  },
  pl: {
    hero: {
      eyebrow: "Przegląd publicznej ekspozycji",
      title: "Sprawdź, co ujawnia Twój system publiczny.",
      body: "Zanim wskaże to klient, audytor lub atakujący. Jedna autoryzowana domena publiczna. Trzy dni robocze. €1 900 bez VAT.",
    },
    commercialLine: "€1 900 bez VAT · 3 dni robocze · stały zakres",
    primaryCta: "Zamów przegląd publicznej ekspozycji",
    secondaryCta: "Zobacz syntetyczny przykład",
    verifyCta: "Zweryfikuj zapis",
    libraryCta: "Biblioteka",
    noSecrets: "Ręcznie zweryfikowane. Bez eksploatacji. Ustalenia powiązane z materiałami. Jawne ograniczenia. Bez rozmowy sprzedażowej.",
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
  const preview = HOMEPAGE_SYNTHETIC_PREVIEW.localized[locale];
  const heroCopy = hero ?? text.hero;
  const catalogHref = buyerCatalogHref(locale);
  const orderHref = buyerOfferRequestHref(locale, "OFFSEC-EXTERNAL-EXPOSURE");
  const sampleHref = HOMEPAGE_SYNTHETIC_PREVIEW.sampleHref;
  const evidenceHash = HOMEPAGE_SYNTHETIC_PREVIEW.evidenceSha256;
  const abbreviatedEvidenceHash = `${evidenceHash.slice(0, 12)}…${evidenceHash.slice(-8)}`;
  const secondaryServices = BUYER_SERVICES.filter(
    (service) =>
      service.id !== "external-exposure-assessment" &&
      service.homepageFeatured !== false,
  );

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`buyer-page ${styles.page}`}
      data-page="home"
      data-home-direction="operator-brief-evidence-flow"
    >
      <section data-ui-proof-id="homepage-hero" className={styles.heroSection}>
        <header className={styles.frame}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{heroCopy.eyebrow}</p>
            <h1 data-ui-proof-id="homepage-hero-headline" className={styles.heroTitle}>
              {heroCopy.title}
            </h1>
            <p data-ui-proof-id="homepage-hero-body" className={styles.heroBody}>
              {heroCopy.body}
            </p>
            <p className={styles.commercialLine}>{text.commercialLine}</p>
            <div className={styles.heroActions}>
              <CtaButton
                uiProofId="homepage-hero-primary-cta"
                href={orderHref}
                variant="primary"
                label={text.primaryCta}
                className={styles.primaryCta}
              />
              <CtaButton
                href={sampleHref}
                variant="secondary"
                label={text.secondaryCta}
                className={styles.secondaryCta}
              />
            </div>
            <div className={styles.utilityLinks}>
              <Link href={text.verifyHref}>{text.verifyCta}</Link>
              <Link href={text.libraryHref}>{text.libraryCta}</Link>
            </div>
            <p className={styles.assuranceLine}>{text.noSecrets}</p>
          </div>

          <aside
            aria-label={preview.panelLabel}
            className={styles.evidencePanel}
            data-home-synthetic-preview={HOMEPAGE_SYNTHETIC_PREVIEW.findingId}
          >
            <div className={styles.evidenceHeader}>
              <p>{preview.panelLabel}</p>
              <p className={styles.findingMeta}>
                <span>{HOMEPAGE_SYNTHETIC_PREVIEW.findingId}</span>
                <span>{preview.priority}</span>
              </p>
            </div>
            <div className={styles.findingBody}>
              <h2 className={styles.findingTitle}>{preview.title}</h2>
              <div className={styles.findingGrid}>
                <div className={`${styles.findingField} ${styles.findingObserved}`}>
                  <p className={styles.findingLabel}>{preview.observedLabel}</p>
                  <p className={styles.findingValue}>{preview.observed}</p>
                </div>
                <div
                  className={`${styles.findingField} ${styles.findingEvidence}`}
                  data-home-evidence={HOMEPAGE_SYNTHETIC_PREVIEW.evidenceId}
                >
                  <p className={styles.findingLabel}>{preview.evidenceLabel}</p>
                  <p className={styles.evidenceReference}>
                    <span>{HOMEPAGE_SYNTHETIC_PREVIEW.evidenceId}</span>
                    <span aria-hidden="true">→</span>
                    <span>{HOMEPAGE_SYNTHETIC_PREVIEW.evidenceArtifact}</span>
                  </p>
                  <p className={styles.evidenceHash}>
                    {preview.evidenceRecorded}{" "}
                    <code aria-label={`SHA-256 ${evidenceHash}`} title={evidenceHash}>
                      {abbreviatedEvidenceHash}
                    </code>
                  </p>
                </div>
                <div className={`${styles.findingField} ${styles.findingWhy}`}>
                  <p className={styles.findingLabel}>{preview.whyLabel}</p>
                  <p className={styles.findingValue}>{preview.impact}</p>
                </div>
                <div className={`${styles.findingField} ${styles.findingAction}`}>
                  <p className={styles.findingLabel}>{preview.nextActionLabel}</p>
                  <p className={styles.findingValue}>{preview.remediation}</p>
                </div>
                <div className={`${styles.findingField} ${styles.findingRetest}`}>
                  <p className={styles.findingLabel}>{preview.retestLabel}</p>
                  <p className={styles.findingValue}>{preview.retest}</p>
                </div>
              </div>
            </div>
            <div className={styles.findingFooter}>
              <div>
                <p className={styles.packageLabel}>{preview.packageLabel}</p>
                <p className={styles.packageItems}>
                  {HOMEPAGE_SYNTHETIC_PREVIEW.packageArtifacts
                    .map((artifact) => artifact.label[locale])
                    .join(" · ")}
                </p>
              </div>
              <Link
                href={sampleHref}
                className={styles.sampleAction}
                data-home-sample-action="finding-preview"
              >
                {preview.sampleAction}
              </Link>
            </div>
          </aside>
        </header>
      </section>

      <div className={styles.frame}>
        <section className={styles.servicesSection} aria-labelledby="home-services-heading">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{text.offersEyebrow}</p>
            <h2 id="home-services-heading" className={styles.sectionTitle}>
              {text.offersTitle}
            </h2>
            <p className={styles.sectionBody}>{text.offersBody}</p>
          </div>
          <div className={styles.serviceList}>
            {secondaryServices.map((service) => {
              const onePager = service.onePagerHref?.[locale];
              const detailHref =
                service.detailHref[locale] ??
                service.detailHref.en ??
                catalogHref;
              return (
                <article
                  key={service.id}
                  data-home-service={service.id}
                  className={styles.serviceRow}
                >
                  <div>
                    <h3>
                      <Link href={detailHref}>{service.name[locale]}</Link>
                    </h3>
                    <p className={styles.serviceSituation}>{service.cardSituation[locale]}</p>
                  </div>
                  <div className={styles.serviceMeta}>
                    <p className={styles.servicePrice}>{service.price[locale]}</p>
                    <Link href={detailHref}>{text.openService}</Link>
                    {onePager ? (
                      <a
                        href={onePager}
                        {...ONE_PAGER_LINK_PROPS}
                        data-one-pager={service.id}
                      >
                        {text.onePager}
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          <Link href={catalogHref} className={styles.textLink}>
            {text.viewAll} →
          </Link>
        </section>

        <section className={styles.editorialSection} aria-labelledby="home-how-heading">
          <h2 id="home-how-heading" className={styles.sectionTitle}>{text.howTitle}</h2>
          <ol className={styles.editorialGrid}>
            {text.howSteps.map(([title, body], index) => (
              <li key={title}>
                <span className={styles.editorialNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.editorialSection} aria-labelledby="home-why-heading">
          <div className={styles.sectionHeadingRow}>
            <h2 id="home-why-heading" className={styles.sectionTitle}>{text.whyTitle}</h2>
            <Link href={text.whyHref} className={styles.textLink}>
              {text.whyTitle} →
            </Link>
          </div>
          <div className={styles.editorialGrid}>
            {text.whyItems.map(([title, body]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className={styles.closingSection}
          aria-labelledby="home-close-heading"
        >
          <div>
            <h2 id="home-close-heading">{text.closeTitle}</h2>
            <p>{text.closeBody}</p>
          </div>
          <div className={styles.closingActions}>
            <CtaButton
              href={orderHref}
              variant="primary"
              label={text.primaryCta}
              className={styles.closingPrimary}
            />
            <CtaButton
              href={catalogHref}
              variant="secondary"
              label={text.viewAll}
              className={styles.closingSecondary}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
