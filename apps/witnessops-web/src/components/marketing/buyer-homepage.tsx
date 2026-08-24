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
      title: "See what the internet sees.",
      body: "A fixed-scope external security review of one authorised public-facing system, for SaaS teams facing an enterprise request, launch, infrastructure change, or upcoming pentest.",
    },
    commercialLine: "€1,900 ex VAT · 3 working days after all start conditions are complete · 1 authorised public-facing system",
    primaryCta: "Start a review",
    secondaryCta: "View sample",
    verifyCta: "Verify a receipt",
    libraryCta: "Library",
    noSecrets: "No exploitation · Fixed scope · No credentials",
    deliverablesLabel: "What you receive",
    exampleEyebrow: "See an example",
    doTitle: "What we do",
    doItems: [
      "Outside-in review of the public exposure of one authorised public-facing system",
      "Human-led work with manual review of findings",
      "Evidence-linked observations, named unknowns, and a handover package",
    ],
    dontTitle: "What we don't do",
    dontItems: [
      "No exploitation",
      "No credentials and no internal access",
      "No destructive testing and no continuous monitoring",
      "No claim that this is a pentest, certification, or proof the system is secure",
    ],
    checkTitle: "Check it yourself",
    checkLead: "Don't take the record on trust. Check it yourself.",
    checkBody:
      "Open Verify a receipt and choose Try an example. The current example is indeterminate: receipt-scoped checks ran, but required evidence and trust inputs were not independently checked. It does not prove that a finding is true, that the reviewed system is secure, or that every underlying action was correct.",
    whoTitle: "Who is behind it",
    whoKarol: "Karol Stefanski, founder",
    whoKarolHref: "https://www.linkedin.com/in/karol-s",
    whoKarolLabel: "Karol on LinkedIn",
    whoCompany: "WitnessOps is the company that delivers the review.",
    whoCompanyHref: "/why-witnessops",
    whoCompanyLabel: "Why WitnessOps",
    whoGithubHref: "https://github.com/witnessops",
    whoGithubLabel: "GitHub",
    offersEyebrow: "Other bounded proof work",
    offersTitle: "Need a different review?",
    offersBody:
      "The broader WitnessOps catalogue remains available for launches, workflows, access, custody, incidents, servers, and customer security reviews.",
    viewAll: "View all services",
    openService: "View service",
    onePager: "One-pager (PDF)",
    closeTitle: "See what the internet sees.",
    closeBody:
      "Request the review without a sales call. WitnessOps accepts or rejects the scope before the delivery clock starts.",
    verifyHref: "/verify",
    libraryHref: "/library",
  },
  pl: {
    hero: {
      eyebrow: "Public Exposure Review",
      title: "Zobacz, co widzi internet.",
      body: "Ręczny, ograniczony zakresem przegląd bezpieczeństwa jednego autoryzowanego systemu publicznie dostępnego — przed wymaganiem enterprise, wdrożeniem, zmianą infrastruktury lub pentestem.",
    },
    commercialLine: "€1 900 netto · 3 dni robocze po spełnieniu wszystkich warunków startu · 1 autoryzowany system publicznie dostępny",
    primaryCta: "Rozpocznij przegląd",
    secondaryCta: "Zobacz przykład",
    verifyCta: "Zweryfikuj zapis",
    libraryCta: "Biblioteka",
    noSecrets: "Bez eksploatacji · Stały zakres · Bez poświadczeń",
    deliverablesLabel: "Co otrzymasz",
    exampleEyebrow: "Zobacz przykład",
    doTitle: "Co robimy",
    doItems: [
      "Przegląd ekspozycji publicznej jednego autoryzowanego systemu publicznie dostępnego — tylko z zewnątrz",
      "Praca prowadzona przez człowieka, z ręczną oceną ustaleń",
      "Obserwacje powiązane z materiałami, nazwane niewiadome i pakiet przekazania",
    ],
    dontTitle: "Czego nie robimy",
    dontItems: [
      "Bez eksploatacji",
      "Bez poświadczeń i bez dostępu wewnętrznego",
      "Bez testów destrukcyjnych i bez ciągłego monitoringu",
      "Bez twierdzenia, że to pentest, certyfikacja albo dowód, że system jest bezpieczny",
    ],
    checkTitle: "Sprawdź sam",
    checkLead: "Nie wierz zapisowi na słowo. Sprawdź sam.",
    checkBody:
      "Otwórz stronę weryfikacji i wybierz Try an example. Obecny przykład daje wynik nieokreślony: wykonano kontrole zapisu, ale wymaganych dowodów i danych zaufania nie sprawdzono niezależnie. Nie dowodzi to, że ustalenie jest prawdziwe, system jest bezpieczny ani każde działanie było poprawne.",
    whoTitle: "Kto za tym stoi",
    whoKarol: "Karol Stefanski, założyciel",
    whoKarolHref: "https://www.linkedin.com/in/karol-s",
    whoKarolLabel: "Karol na LinkedIn",
    whoCompany: "WitnessOps to firma, która dostarcza przegląd.",
    whoCompanyHref: "/pl/why-witnessops",
    whoCompanyLabel: "Dlaczego WitnessOps",
    whoGithubHref: "https://github.com/witnessops",
    whoGithubLabel: "GitHub",
    offersEyebrow: "Inne ograniczone prace dowodowe",
    offersTitle: "Potrzebujesz innego przeglądu?",
    offersBody:
      "Szerszy katalog WitnessOps obejmuje uruchomienia, przepływy pracy, dostęp, custody, incydenty, serwery i przeglądy bezpieczeństwa klientów.",
    viewAll: "Zobacz wszystkie usługi",
    openService: "Zobacz usługę",
    onePager: "One-pager (PDF)",
    closeTitle: "Zobacz, co widzi internet.",
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
        <header className={`${styles.frame} ${styles.heroFrame}`}>
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
            <p className={styles.assuranceLine}>{text.noSecrets}</p>
          </div>

          <aside
            aria-labelledby="home-deliverables-heading"
            className={styles.deliverablesPanel}
          >
            <h2 id="home-deliverables-heading">{text.deliverablesLabel}</h2>
            <ol>
              {HOMEPAGE_SYNTHETIC_PREVIEW.packageArtifacts.map((artifact, index) => (
                <li key={artifact.path}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{artifact.label[locale]}</strong>
                </li>
              ))}
            </ol>
          </aside>
        </header>
      </section>

      <div className={styles.frame}>
        <section className={styles.trustPair} aria-labelledby="home-do-heading">
          <article>
            <h2 id="home-do-heading" className={styles.sectionTitle}>
              {text.doTitle}
            </h2>
            <ul className={styles.trustList}>
              {text.doItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article>
            <h2 id="home-dont-heading" className={styles.sectionTitle}>
              {text.dontTitle}
            </h2>
            <ul className={styles.trustList}>
              {text.dontItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>
      </div>

      <section className={styles.evidenceSection} aria-labelledby="home-example-heading">
        <div className={styles.frame}>
          <h2 id="home-example-heading" className={styles.exampleEyebrow}>
            {text.exampleEyebrow}
          </h2>
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
              <h3 className={styles.findingTitle}>{preview.title}</h3>
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
                    <span aria-hidden="true">·</span>
                    <span>{HOMEPAGE_SYNTHETIC_PREVIEW.evidenceArtifact}</span>
                  </p>
                </div>
                <div className={`${styles.findingField} ${styles.findingAction}`}>
                  <p className={styles.findingLabel}>{preview.nextActionLabel}</p>
                  <p className={styles.findingValue}>{preview.remediation}</p>
                </div>
              </div>
            </div>
            <div className={styles.findingFooter}>
              <Link
                href={sampleHref}
                className={styles.sampleAction}
                data-home-sample-action="finding-preview"
              >
                {preview.sampleAction}
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <div className={styles.frame}>
        <section className={styles.editorialSection} aria-labelledby="home-check-heading">
          <h2 id="home-check-heading" className={styles.sectionTitle}>
            {text.checkTitle}
          </h2>
          <p className={styles.checkLead}>{text.checkLead}</p>
          <p className={styles.sectionBody}>{text.checkBody}</p>
          <div className={styles.heroActions}>
            <CtaButton
              href={text.verifyHref}
              variant="primary"
              label={text.verifyCta}
              className={styles.primaryCta}
            />
          </div>
        </section>

        <section className={styles.editorialSection} aria-labelledby="home-who-heading">
          <h2 id="home-who-heading" className={styles.sectionTitle}>
            {text.whoTitle}
          </h2>
          <div className={styles.whoGrid}>
            <article>
              <h3>{text.whoKarol}</h3>
              <p>
                <a
                  href={text.whoKarolHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text.whoKarolLabel}
                </a>
              </p>
            </article>
            <article>
              <h3>WitnessOps</h3>
              <p>{text.whoCompany}</p>
              <p>
                <Link href={text.whoCompanyHref}>{text.whoCompanyLabel}</Link>
                <span aria-hidden="true"> · </span>
                <a
                  href={text.whoGithubHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {text.whoGithubLabel}
                </a>
              </p>
            </article>
          </div>
        </section>

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
