import Link from "next/link";

import {
  sampleCommitShort,
  sampleManifestSha256,
  sampleSourceRepository,
} from "@/app/review/sample-cases/ai-agent-action-proof-run/sample-artifact-contract";
import { CtaButton } from "@/components/shared/cta-button";
import {
  buyerPublicOfferRequestHref,
  type BuyerLocale,
} from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import styles from "./buyer-homepage.module.css";

type HeroCopy = {
  eyebrow: string;
  title: string;
  body: string;
};

const localizedCopy = {
  en: {
    hero: {
      eyebrow: "Proof infrastructure for agentic operations",
      title: "Agents act. WitnessOps proves.",
      body:
        "Reconstruct one consequential agent workflow: what was authorized, what ran, what was observed, and what remains unresolved.",
    },
    heroIntro:
      "Produce a bounded record another responsible party can inspect or challenge.",
    primaryCta: "Start a non-secret fit check",
    sampleLink: "Run and verify the compromised API key rotation demo",
    offerCta: "See scope and pricing",
    handlingBoundary:
      "Do not send passwords, private keys, API keys, tokens or recovery codes · One workflow · Evidence handling agreed before intake",
    flowLabel: "The WitnessOps method",
    flowItems: [
      {
        step: "Before execution",
        title: "Check the agent before it acts",
        body: "Open a public SKILL.md and check its exact bytes locally in your browser.",
        href: "/verify/skill",
      },
      {
        step: "Recorded action",
        title: "See one bounded action",
        body: "Approve a recorded synthetic replay and watch only the catalogued sequence.",
        href: "/review/sample-cases/witnessed-crm-status-change",
      },
      {
        step: "Evidence",
        title: "Inspect what happened",
        body: "Inspect the pinned repository, commit, published manifest, and reported verifier result.",
        href: "#agent-action-receipt",
      },
      {
        step: "Paid review",
        title: "Bring the real workflow",
        body: `Move from a public specimen to one scoped ${PRIMARY_OFFER.name.en}.`,
        href: `${PRIMARY_OFFER.requestRoute}?offerId=${PRIMARY_OFFER.id}`,
      },
    ],
    reviewEyebrow: "The evidence questions",
    reviewTitle: "Five questions. One bounded workflow.",
    reviewBody:
      "The paid engagement organizes the workflow around the evidence another responsible person would need to inspect or challenge it.",
    reviewItems: [
      { title: "What was authorized?", body: "Owner, scope, policy and approval." },
      { title: "What was executed?", body: "Action, tool path and touched system." },
      { title: "What was observed?", body: "Evidence, records and reported result." },
      {
        title: "What remains unresolved?",
        body: "Gaps, exceptions and unsupported conclusions.",
      },
      {
        title: "How can it be challenged?",
        body: "Named artifacts, verifier output and replay path.",
      },
    ],
    receiptEyebrow: "After execution · Public specimen",
    receiptTitle: "Produce something another party can check.",
    receiptBody:
      "The published demo binds declared authority, every rotation event, seven exact evidence files, the reported result, and a purpose-limited Ed25519 demo signer to one immutable receipt.",
    receiptStatus: "Verified synthetic specimen — not live customer evidence",
    receiptSpecimenTitle: "Compromised API key rotation specimen",
    receiptRepositoryLabel: "Repository",
    receiptCommitLabel: "Pinned commit",
    receiptManifestLabel: "Published MANIFEST.sha256 file",
    receiptResultLabel: "Reported verifier result",
    receiptResult: "VALID_SYNTHETIC_SPECIMEN",
    receiptLink: "Replay and verify the signed rotation",
    offerEyebrow: "Paid engagement",
    offerTitle: PRIMARY_OFFER.name.en,
    offerLead: "Reconstruct the workflow, not only the file.",
    offerBody:
      "WitnessOps reconstructs one consequential agent or automation workflow and separates what was authorised, executed, observed, and still unresolved.",
    bestForTitle: "Best for",
    bestForBody:
      "Security, platform, compliance, MSSP, and AI automation teams letting agents or automations touch sensitive systems.",
    deliverablesTitle: "Deliverables",
    deliverables: PRIMARY_OFFER.included.en,
    commercialLine: `${PRIMARY_OFFER.price.en} · ${PRIMARY_OFFER.fitCheck.en} · ${PRIMARY_OFFER.unit.en} · ${PRIMARY_OFFER.timing.en}`,
    outcomeTitle: "Outcome",
    outcomeBody:
      "A practical handover that separates supported observations, unresolved gaps, and the evidence or controls needed to strengthen the workflow.",
    boundaryEyebrow: "Proof boundary",
    boundaryTitle: "A receipt is only as strong as its named evidence and verifier.",
    boundaryBody:
      "WitnessOps distinguishes a signed record from a supported claim. A receipt proves only what its named verifier and referenced evidence support. It does not certify that an agent was correct, safe, compliant, or complete. The public receipt specimen is an inspection aid, not customer evidence, and does not establish production deployment, compliance, correctness, safety, or completeness.",
    closeTitle: "Bring one consequential workflow. Make its authority and evidence reviewable.",
    closeBody:
      "Start with the workflow name, its owner, and the consequential action. Customer evidence is accepted only after scope and handling are agreed.",
  },
  pl: {
    hero: {
      eyebrow: "Infrastruktura dowodowa dla operacji agentowych",
      title: "Agenci działają. WitnessOps dostarcza dowody.",
      body:
        "Odtwórz jeden istotny workflow agenta: co zatwierdzono, co uruchomiono, co zaobserwowano i co pozostaje nierozstrzygnięte.",
    },
    heroIntro:
      "Przygotuj ograniczony zapis, który inna odpowiedzialna osoba może sprawdzić lub zakwestionować.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
    sampleLink: "Uruchom i zweryfikuj demo rotacji skompromitowanego klucza API",
    offerCta: "Zobacz zakres i cenę",
    handlingBoundary:
      "Nie wysyłaj haseł, kluczy prywatnych, kluczy API, tokenów ani kodów odzyskiwania · Jeden workflow · Zasady obsługi materiałów uzgadniane przed przyjęciem",
    flowLabel: "Metoda WitnessOps",
    flowItems: [
      {
        step: "Przed wykonaniem",
        title: "Sprawdź agenta przed działaniem",
        body: "Otwórz publiczny SKILL.md i sprawdź lokalnie jego dokładne bajty.",
        href: "/verify/skill",
      },
      {
        step: "Zapisane działanie",
        title: "Zobacz jedno ograniczone działanie",
        body: "Zatwierdź odtworzenie syntetycznego przykładu i obejrzyj stałą sekwencję.",
        href: "/review/sample-cases/witnessed-crm-status-change",
      },
      {
        step: "Materiały",
        title: "Sprawdź, co się wydarzyło",
        body: "Sprawdź przypięte repozytorium, commit, opublikowany manifest i zapisany wynik weryfikatora.",
        href: "#agent-action-receipt",
      },
      {
        step: "Płatny przegląd",
        title: "Przynieś prawdziwy workflow",
        body: `Przejdź od publicznego przykładu do jednego ${PRIMARY_OFFER.name.pl}.`,
        href: `/pl${PRIMARY_OFFER.requestRoute}?offerId=${PRIMARY_OFFER.id}`,
      },
    ],
    reviewEyebrow: "Pytania dowodowe",
    reviewTitle: "Pięć pytań. Jeden ograniczony workflow.",
    reviewBody:
      "Płatny przegląd porządkuje workflow wokół materiałów, których inna odpowiedzialna osoba potrzebuje, aby go sprawdzić lub zakwestionować.",
    reviewItems: [
      { title: "Co zatwierdzono?", body: "Właściciel, zakres, polityka i zgoda." },
      { title: "Co wykonano?", body: "Działanie, ścieżka narzędzi i dotknięty system." },
      { title: "Co zaobserwowano?", body: "Materiały, zapisy i odnotowany wynik." },
      {
        title: "Co pozostaje nierozstrzygnięte?",
        body: "Luki, wyjątki i niepoparte wnioski.",
      },
      {
        title: "Jak można to zakwestionować?",
        body: "Nazwane artefakty, wynik weryfikatora i ścieżka odtworzenia.",
      },
    ],
    receiptEyebrow: "Po wykonaniu · Publiczny wzór",
    receiptTitle: "Przygotuj zapis, który inna osoba może sprawdzić.",
    receiptBody:
      "Opublikowane demo wiąże zadeklarowane upoważnienie, każde zdarzenie rotacji, siedem dokładnych plików dowodowych, wynik oraz ograniczony do demo klucz podpisujący Ed25519 w jednym niezmiennym zapisie.",
    receiptStatus: "Zweryfikowany syntetyczny przykład — nie są to materiały klienta",
    receiptSpecimenTitle: "Przykład rotacji skompromitowanego klucza API",
    receiptRepositoryLabel: "Repozytorium",
    receiptCommitLabel: "Przypięty commit",
    receiptManifestLabel: "Opublikowany plik MANIFEST.sha256",
    receiptResultLabel: "Zapisany wynik weryfikatora",
    receiptResult: "VALID_SYNTHETIC_SPECIMEN",
    receiptLink: "Odtwórz i zweryfikuj podpisaną rotację",
    offerEyebrow: "Płatny przegląd",
    offerTitle: PRIMARY_OFFER.name.pl,
    offerLead: "Odtwórz workflow, nie tylko plik.",
    offerBody:
      "WitnessOps rekonstruuje jeden istotny workflow agenta lub automatyzacji i oddziela to, co zatwierdzono, wykonano, zaobserwowano i co nadal pozostaje nierozstrzygnięte.",
    bestForTitle: "Dla kogo",
    bestForBody:
      "Zespoły bezpieczeństwa, platform, compliance, MSSP i automatyzacji AI, które pozwalają agentom lub automatyzacjom działać w systemach wrażliwych.",
    deliverablesTitle: "Zakres dostawy",
    deliverables: PRIMARY_OFFER.included.pl,
    commercialLine: `${PRIMARY_OFFER.price.pl} · ${PRIMARY_OFFER.fitCheck.pl} · ${PRIMARY_OFFER.unit.pl} · ${PRIMARY_OFFER.timing.pl}`,
    outcomeTitle: "Wynik",
    outcomeBody:
      "Praktyczne przekazanie, które oddziela poparte obserwacje, nierozstrzygnięte luki oraz materiały lub kontrole potrzebne do wzmocnienia workflow.",
    boundaryEyebrow: "Granica dowodu",
    boundaryTitle: "Zapis jest tak mocny, jak wskazane materiały i weryfikator.",
    boundaryBody:
      "WitnessOps odróżnia podpisany zapis od twierdzenia popartego materiałami. Zapis dowodzi wyłącznie tego, co wspierają wskazany weryfikator i przywołane materiały. Nie certyfikuje, że agent działał poprawnie, bezpiecznie, zgodnie z wymaganiami lub kompletnie. Publiczny przykład zapisu pomaga w inspekcji, ale nie jest materiałem klienta i nie potwierdza wdrożenia produkcyjnego, zgodności, poprawności, bezpieczeństwa ani kompletności.",
    closeTitle: "Zgłoś jeden istotny workflow. Uczyń jego upoważnienie i materiały możliwymi do przeglądu.",
    closeBody:
      "Zacznij od nazwy workflow, jego właściciela i istotnego działania. Materiały klienta są przyjmowane dopiero po uzgodnieniu zakresu i zasad postępowania.",
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
  const sampleHref = "/review/sample-cases/ai-agent-action-proof-run";
  const requestHref = buyerPublicOfferRequestHref(
    locale,
    PRIMARY_OFFER.id,
  );
  const offerHref = PRIMARY_OFFER.route;

  return (
    <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="agent-proof-offer">
      <section data-ui-proof-id="homepage-hero" className={styles.heroSection}>
        <header className={`${styles.frame} ${styles.heroFrame}`}>
          <div data-ask-trigger-guard className={styles.heroCopy}>
            <p className={styles.eyebrow}>{heroCopy.eyebrow}</p>
            <h1
              data-ui-proof-id="homepage-hero-headline"
              data-copy-length={heroCopy.title.length > 36 ? "long" : "standard"}
              className={styles.heroTitle}
            >
              {heroCopy.title}
            </h1>
            <p data-ui-proof-id="homepage-hero-body" className={styles.heroBody}>{heroCopy.body}</p>
            <p className={styles.heroIntro}>{text.heroIntro}</p>
            <div className={styles.heroActions}>
              <CtaButton uiProofId="homepage-hero-primary-cta" href={requestHref} variant="primary" label={text.primaryCta} className={styles.primaryCta} />
              <CtaButton href={offerHref} variant="secondary" label={text.offerCta} className={styles.secondaryCta} />
            </div>
            <Link data-ui-proof-id="homepage-demo-cta" className={styles.heroSampleLink} href={sampleHref}>{text.sampleLink} <span aria-hidden="true">↗</span></Link>
            <p className={styles.assuranceLine}>{text.handlingBoundary}</p>
          </div>

          <aside className={styles.flowPanel} aria-label={text.flowLabel}>
            <div className={styles.flowHeader}><span>{text.flowLabel}</span><span aria-hidden="true">φ</span></div>
            <ol className={styles.flowList}>
              {text.flowItems.map((item, index) => (
                <li key={item.step}>
                  <span className={styles.flowNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <Link href={item.href} className={styles.flowLink}>
                    <p>{item.step}</p><h2>{item.title}</h2><span>{item.body}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        </header>
      </section>

      <section id="evidence-questions" className={styles.reviewSection} aria-labelledby="home-review-heading">
        <div className={styles.frame}>
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>{text.reviewEyebrow}</p>
            <h2 id="home-review-heading" className={styles.sectionTitle}>{text.reviewTitle}</h2>
            <p className={styles.sectionBody}>{text.reviewBody}</p>
          </div>
          <ol className={styles.reviewGrid}>
            {text.reviewItems.map((item, index) => <li key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.body}</p></li>)}
          </ol>
        </div>
      </section>

      <section id="agent-action-receipt" className={styles.receiptSection} aria-labelledby="home-receipt-heading">
        <div className={`${styles.frame} ${styles.receiptFrame}`}>
          <div className={styles.receiptCopy}>
            <p className={styles.eyebrow}>{text.receiptEyebrow}</p>
            <h2 id="home-receipt-heading" className={styles.sectionTitle}>{text.receiptTitle}</h2>
            <p className={styles.sectionBody}>{text.receiptBody}</p>
            <Link className={styles.textLink} href={sampleHref}>{text.receiptLink} →</Link>
          </div>

          <article className={styles.receiptCard}>
            <div className={styles.receiptHeader}><span>{text.receiptSpecimenTitle}</span><span>{text.receiptStatus}</span></div>
            <dl className={styles.receiptFacts}>
              <div><dt>{text.receiptRepositoryLabel}</dt><dd>{sampleSourceRepository}</dd></div>
              <div><dt>{text.receiptCommitLabel}</dt><dd><code>{sampleCommitShort}</code></dd></div>
              <div><dt>{text.receiptManifestLabel}</dt><dd><code>{sampleManifestSha256}</code></dd></div>
              <div><dt>{text.receiptResultLabel}</dt><dd><code>{text.receiptResult}</code></dd></div>
            </dl>
            <div className={styles.receiptFooter}><span>Authority</span><span>Execution</span><span>Evidence</span><span>Limits</span><span>Challenge</span></div>
          </article>
        </div>
      </section>

      <section id="agent-workflow-reconstruction" className={styles.offerSection} aria-labelledby="home-offer-heading">
        <div className={`${styles.frame} ${styles.offerFrame}`}>
          <div className={styles.offerIntro}>
            <p className={styles.eyebrow}>{text.offerEyebrow}</p>
            <h2 id="home-offer-heading" className={styles.offerTitle}>{text.offerTitle}</h2>
            <p className={styles.offerLead}>{text.offerLead}</p>
            <p className={styles.offerBody}>{text.offerBody}</p>
            <p className={styles.offerCommercial}>{text.commercialLine}</p>
            <CtaButton href={offerHref} variant="primary" label={text.offerCta} className={styles.primaryCta} />
          </div>

          <div className={styles.offerDetails}>
            <article><h3>{text.bestForTitle}</h3><p>{text.bestForBody}</p></article>
            <article><h3>{text.deliverablesTitle}</h3><ul>{text.deliverables.map((item) => <li key={item}>{item}</li>)}</ul></article>
            <article className={styles.offerOutcome}><h3>{text.outcomeTitle}</h3><p>{text.outcomeBody}</p></article>
          </div>
        </div>
      </section>

      <div className={styles.frame}>
        <section className={styles.boundarySection} aria-labelledby="home-boundary-heading">
          <p className={styles.eyebrow}>{text.boundaryEyebrow}</p>
          <h2 id="home-boundary-heading" className={styles.sectionTitle}>{text.boundaryTitle}</h2>
          <p className={styles.sectionBody}>{text.boundaryBody}</p>
        </section>

        <section className={styles.closingSection} aria-labelledby="home-close-heading">
          <div><h2 id="home-close-heading">{text.closeTitle}</h2><p>{text.closeBody}</p></div>
          <CtaButton href={requestHref} variant="primary" label={text.primaryCta} className={styles.closingPrimary} />
        </section>
      </div>
    </main>
  );
}
