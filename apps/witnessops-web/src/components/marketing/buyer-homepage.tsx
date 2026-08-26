import { CtaButton } from "@/components/shared/cta-button";
import {
  buyerCatalogHref,
  buyerRequestHref,
  type BuyerLocale,
} from "@/lib/buyer-services";
import styles from "./buyer-homepage.module.css";

type HeroCopy = {
  eyebrow: string;
  title: string;
  body: string;
};

const localizedCopy = {
  en: {
    hero: {
      eyebrow: "WitnessOps",
      title: "Agents act. WitnessOps proves.",
      body: "Signed receipts and external verification for consequential AI-agent actions.",
    },
    heroIntro:
      "AI agents are starting to touch production systems, security tools, customer data, and operational workflows. When something important happens, logs are not enough. WitnessOps creates proof bundles that show what was approved, what ran, what changed, what evidence was captured, and how an external reviewer can verify it.",
    primaryCta: "Bring one workflow",
    offerCta: "See the first offer",
    sampleCta: "Inspect agent sample",
    verifyCta: "Verify a receipt",
    catalogCta: "View all services",
    noSecrets: "Non-secret fit check · One bounded workflow · Evidence handling agreed before intake",
    receiptLabel: "A verifiable receipt records",
    receiptItems: [
      "Who owned the agent",
      "What action was requested",
      "What policy or approval allowed it",
      "What tools and systems were touched",
      "What evidence was captured",
      "What changed",
      "What signer or key attested to it",
      "How the receipt can be verified later",
    ],
    problemEyebrow: "The problem",
    problemTitle: "AI agents are becoming invisible operators.",
    problemBody:
      "They can trigger workflows, call tools, change systems, update tickets, query data, and make decisions. But when a customer, auditor, incident responder, or executive asks what actually happened, most teams have only scattered logs, screenshots, Slack messages, and hope.",
    problemClose: "Hope is not an audit artifact.",
    answerEyebrow: "The WitnessOps answer",
    answerTitle: "Every consequential agent action gets a verifiable receipt.",
    answerBody:
      "The receipt binds the action to its authority, evidence, result, signer, and verifier path so another responsible person can inspect the record without trusting the agent or its operator on reputation alone.",
    offerEyebrow: "First offer",
    offerTitle: "Agent Risk & Control Review",
    offerLead: "A focused review of one agentic or automated workflow.",
    offerBody:
      "We map the workflow, identify authority and evidence gaps, define the receipt schema, and produce a sample proof bundle that shows how the action can be approved, executed, evidenced, and verified.",
    bestForTitle: "Best for",
    bestForBody:
      "Security teams, platform teams, compliance teams, MSSPs, and AI automation teams that are letting agents or automations touch sensitive systems.",
    deliverablesTitle: "Deliverables",
    deliverables: [
      "Workflow map",
      "Agent and tool permission model",
      "Approval and policy gap analysis",
      "Evidence requirements",
      "Receipt schema",
      "Sample proof bundle",
      "Verifier path",
      "Control recommendations",
    ],
    commercialLine:
      "From €1,500 · Timing confirmed during a non-secret fit check · One agentic or automated workflow",
    outcomeTitle: "Outcome",
    outcomeBody:
      "You know whether the workflow can be defended in an audit, customer review, or incident investigation.",
    boundaryEyebrow: "Proof boundary",
    boundaryTitle: "A receipt is only as strong as its named evidence and verifier.",
    boundaryBody:
      "WitnessOps distinguishes a signed record from a supported claim. A receipt proves only what its named verifier and referenced evidence support. It does not certify that an agent was correct, safe, compliant, or complete. The review’s sample proof bundle is clearly labelled as a sample, not customer evidence.",
    closeTitle: "Bring one agentic workflow. We’ll show you what proof is missing.",
    closeBody:
      "Start with a short, non-secret fit check. Name the workflow, its owner, and the consequential action. Evidence is handled only after scope and handling are agreed.",
  },
  pl: {
    hero: {
      eyebrow: "WitnessOps",
      title: "Agents act. WitnessOps proves.",
      body: "Podpisane potwierdzenia i zewnętrzna weryfikacja istotnych działań agentów AI.",
    },
    heroIntro:
      "Agenci AI zaczynają działać w systemach produkcyjnych, narzędziach bezpieczeństwa, danych klientów i przepływach operacyjnych. Gdy dzieje się coś istotnego, same logi nie wystarczą. WitnessOps tworzy pakiety dowodowe pokazujące, co zatwierdzono, co wykonano, co się zmieniło, jakie materiały zebrano i jak może je sprawdzić zewnętrzny recenzent.",
    primaryCta: "Przynieś jeden workflow",
    offerCta: "Zobacz pierwszą ofertę",
    sampleCta: "Zobacz przykład agenta",
    verifyCta: "Zweryfikuj zapis",
    catalogCta: "Zobacz wszystkie usługi",
    noSecrets: "Niepoufna ocena dopasowania · Jeden ograniczony workflow · Zasady obsługi materiałów uzgodnione przed ich przyjęciem",
    receiptLabel: "Weryfikowalny zapis obejmuje",
    receiptItems: [
      "Kto był właścicielem agenta",
      "Jakie działanie zlecono",
      "Jaka polityka lub zgoda je dopuściła",
      "Jakich narzędzi i systemów dotknięto",
      "Jakie materiały zebrano",
      "Co się zmieniło",
      "Jaki podpisujący lub klucz to poświadczył",
      "Jak później zweryfikować zapis",
    ],
    problemEyebrow: "Problem",
    problemTitle: "Agenci AI stają się niewidocznymi operatorami.",
    problemBody:
      "Mogą uruchamiać workflow, wywoływać narzędzia, zmieniać systemy, aktualizować zgłoszenia, odpytywać dane i podejmować decyzje. Gdy klient, audytor, zespół reagowania na incydenty albo zarząd pyta, co naprawdę się wydarzyło, większość zespołów ma tylko rozproszone logi, zrzuty ekranu, wiadomości na Slacku i nadzieję.",
    problemClose: "Nadzieja nie jest artefaktem audytowym.",
    answerEyebrow: "Odpowiedź WitnessOps",
    answerTitle: "Każde istotne działanie agenta otrzymuje weryfikowalny zapis.",
    answerBody:
      "Zapis łączy działanie z upoważnieniem, materiałami, wynikiem, podpisującym i ścieżką weryfikacji, aby inna odpowiedzialna osoba mogła go sprawdzić bez polegania wyłącznie na reputacji agenta lub operatora.",
    offerEyebrow: "Pierwsza oferta",
    offerTitle: "Agent Risk & Control Review",
    offerLead: "Skupiony przegląd jednego agentowego lub zautomatyzowanego workflow.",
    offerBody:
      "Mapujemy workflow, wskazujemy luki w upoważnieniach i materiałach, definiujemy schemat zapisu i przygotowujemy przykładowy pakiet dowodowy pokazujący, jak działanie może być zatwierdzone, wykonane, udokumentowane i zweryfikowane.",
    bestForTitle: "Dla kogo",
    bestForBody:
      "Zespoły bezpieczeństwa, platform, compliance, MSSP i automatyzacji AI, które pozwalają agentom lub automatyzacjom działać w systemach wrażliwych.",
    deliverablesTitle: "Zakres dostawy",
    deliverables: [
      "Mapa workflow",
      "Model uprawnień agenta i narzędzi",
      "Analiza luk w zatwierdzeniach i politykach",
      "Wymagania dowodowe",
      "Schemat zapisu",
      "Przykładowy pakiet dowodowy",
      "Ścieżka weryfikacji",
      "Zalecenia dotyczące kontroli",
    ],
    commercialLine:
      "Od 6 500 zł (ok. €1 500) · Termin potwierdzany podczas niepoufnej oceny dopasowania · Jeden agentowy lub zautomatyzowany workflow",
    outcomeTitle: "Wynik",
    outcomeBody:
      "Wiesz, czy workflow można obronić podczas audytu, przeglądu klienta lub dochodzenia po incydencie.",
    boundaryEyebrow: "Granica dowodu",
    boundaryTitle: "Zapis jest tak mocny, jak wskazane materiały i weryfikator.",
    boundaryBody:
      "WitnessOps odróżnia podpisany zapis od twierdzenia popartego dowodami. Zapis nie certyfikuje, że agent działał poprawnie, bezpiecznie, zgodnie z wymaganiami lub kompletnie; dowodzi tylko tego, co wspierają wskazany weryfikator i przywołane materiały. Przykładowy pakiet jest wyraźnie oznaczony jako przykład, a nie materiał klienta.",
    closeTitle: "Przynieś jeden agentowy workflow. Pokażemy, jakiego dowodu brakuje.",
    closeBody:
      "Zacznij od krótkiej, niepoufnej oceny dopasowania. Nazwij workflow, jego właściciela i istotne działanie. Materiały są przyjmowane dopiero po uzgodnieniu zakresu i zasad postępowania.",
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
  const requestHref = buyerRequestHref(locale);
  const catalogHref = buyerCatalogHref(locale);
  const offerHref = locale === "en" ? "/catalog/workflows" : catalogHref;
  const sampleHref = "/review/sample-cases/ai-agent-action-proof-run";
  const verifyHref = locale === "pl" ? "/pl/verify" : "/verify";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`buyer-page ${styles.page}`}
      data-page="home"
      data-home-direction="agent-proof-offer"
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
            <p className={styles.heroIntro}>{text.heroIntro}</p>
            <div className={styles.heroActions}>
              <CtaButton
                uiProofId="homepage-hero-primary-cta"
                href={requestHref}
                variant="primary"
                label={text.primaryCta}
                className={styles.primaryCta}
              />
              <CtaButton
                href={offerHref}
                variant="secondary"
                label={text.offerCta}
                className={styles.secondaryCta}
              />
            </div>
            <p className={styles.assuranceLine}>{text.noSecrets}</p>
          </div>

          <aside
            aria-labelledby="home-receipt-heading"
            className={styles.deliverablesPanel}
          >
            <h2 id="home-receipt-heading">{text.receiptLabel}</h2>
            <ol>
              {text.receiptItems.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item}</strong>
                </li>
              ))}
            </ol>
          </aside>
        </header>
      </section>

      <div className={styles.frame}>
        <section className={styles.trustPair} aria-labelledby="home-problem-heading">
          <article>
            <p className={styles.eyebrow}>{text.problemEyebrow}</p>
            <h2 id="home-problem-heading" className={styles.sectionTitle}>
              {text.problemTitle}
            </h2>
            <p className={styles.sectionBody}>{text.problemBody}</p>
            <p className={styles.checkLead}>{text.problemClose}</p>
          </article>
          <article>
            <p className={styles.eyebrow}>{text.answerEyebrow}</p>
            <h2 id="home-answer-heading" className={styles.sectionTitle}>
              {text.answerTitle}
            </h2>
            <p className={styles.sectionBody}>{text.answerBody}</p>
          </article>
        </section>
      </div>

      <section className={styles.evidenceSection} aria-labelledby="home-offer-heading">
        <div className={`${styles.frame} ${styles.offerFrame}`}>
          <div className={styles.offerIntro}>
            <p className={styles.exampleEyebrow}>{text.offerEyebrow}</p>
            <h2 id="home-offer-heading" className={styles.offerTitle}>
              {text.offerTitle}
            </h2>
            <p className={styles.offerLead}>{text.offerLead}</p>
            <p className={styles.offerBody}>{text.offerBody}</p>
            <p className={styles.offerCommercial}>{text.commercialLine}</p>
            <div className={styles.heroActions}>
              <CtaButton
                href={offerHref}
                variant="primary"
                label={text.offerCta}
                className={styles.closingPrimary}
              />
              <CtaButton
                href={sampleHref}
                variant="secondary"
                label={text.sampleCta}
                className={styles.closingSecondary}
              />
            </div>
          </div>

          <div className={styles.offerDetails}>
            <article>
              <h3>{text.bestForTitle}</h3>
              <p>{text.bestForBody}</p>
            </article>
            <article>
              <h3>{text.deliverablesTitle}</h3>
              <ul>
                {text.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.offerOutcome}>
              <h3>{text.outcomeTitle}</h3>
              <p>{text.outcomeBody}</p>
            </article>
          </div>
        </div>
      </section>

      <div className={styles.frame}>
        <section className={styles.editorialSection} aria-labelledby="home-boundary-heading">
          <p className={styles.eyebrow}>{text.boundaryEyebrow}</p>
          <h2 id="home-boundary-heading" className={styles.sectionTitle}>
            {text.boundaryTitle}
          </h2>
          <p className={styles.sectionBody}>{text.boundaryBody}</p>
          <div className={styles.heroActions}>
            <CtaButton
              href={verifyHref}
              variant="secondary"
              label={text.verifyCta}
              className={styles.secondaryCta}
            />
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
              href={requestHref}
              variant="primary"
              label={text.primaryCta}
              className={styles.closingPrimary}
            />
            <CtaButton
              href={catalogHref}
              variant="secondary"
              label={text.catalogCta}
              className={styles.closingSecondary}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
