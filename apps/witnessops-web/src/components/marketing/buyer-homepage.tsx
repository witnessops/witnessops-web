import Link from "next/link";

import {
  sampleCommitShort,
  sampleManifestSha256,
  sampleSourceRepository,
} from "@/app/review/sample-cases/ai-agent-action-proof-run/sample-artifact-contract";
import { CtaButton } from "@/components/shared/cta-button";
import { buyerRequestHref, type BuyerLocale } from "@/lib/buyer-services";
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
        "WitnessOps helps security, platform, and compliance teams reconstruct one consequential agent workflow: what was authorized, what ran, what was observed, what remains unresolved, and how the result can be challenged.",
    },
    heroIntro:
      "Define the workflow before execution, preserve authority and evidence while it runs, then produce a bounded record another responsible party can inspect.",
    primaryCta: "Bring one agentic workflow",
    sampleLink: "Inspect the public evidence sample",
    offerCta: "See scope and pricing",
    handlingBoundary:
      "Do not send passwords, private keys, API keys, tokens or recovery codes · One workflow · Evidence handling agreed before intake",
    flowLabel: "The WitnessOps method",
    flowItems: [
      {
        step: "Before execution",
        title: "Declare the workflow boundary",
        body: "Name the owner, permitted actions, policy, systems, and approval.",
      },
      {
        step: "During execution",
        title: "Preserve authority and evidence",
        body: "Name the approval, scope, tool path, observations, and unresolved gaps.",
      },
      {
        step: "After execution",
        title: "Make the action reviewable",
        body: "Bind the record to evidence references, limits, and a verifier path.",
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
      "An Agent Action Receipt can bind declared authority, execution records, evidence references, the reported result, signer or key references where implemented, verifier output, and unresolved gaps.",
    receiptStatus: "Published sample — not live customer evidence",
    receiptSpecimenTitle: "Agent Action Receipt specimen",
    receiptRepositoryLabel: "Repository",
    receiptCommitLabel: "Pinned commit",
    receiptManifestLabel: "Manifest SHA-256",
    receiptResultLabel: "Reported verifier result",
    receiptResult: "pass_with_sample_limitations",
    receiptLink: "Open the pinned evidence sample",
    offerEyebrow: "Paid engagement",
    offerTitle: "Agent Risk & Control Review",
    offerLead: "Review the workflow, not only the file.",
    offerBody:
      "The engagement maps one named workflow, identifies authority and evidence gaps, defines a proposed receipt shape, and produces a clearly labelled sample package with control recommendations.",
    bestForTitle: "Best for",
    bestForBody:
      "Security, platform, compliance, MSSP, and AI automation teams letting agents or automations touch sensitive systems.",
    deliverablesTitle: "Deliverables",
    deliverables: [
      "Workflow and permission map",
      "Approval and evidence-gap analysis",
      "Proposed receipt and verifier path",
      "Sample package and control recommendations",
    ],
    commercialLine:
      "From €1,500 · Timing confirmed during a fit check · One agentic or automated workflow",
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
        "WitnessOps pomaga zespołom bezpieczeństwa, platform i compliance odtworzyć jeden istotny workflow agenta: co zatwierdzono, co uruchomiono, co zaobserwowano, co pozostaje nierozstrzygnięte i jak można zakwestionować wynik.",
    },
    heroIntro:
      "Zdefiniuj workflow przed wykonaniem, zachowaj upoważnienie i materiały podczas działania, a potem przygotuj ograniczony zapis, który inna odpowiedzialna osoba może przejrzeć.",
    primaryCta: "Zgłoś jeden workflow agenta",
    sampleLink: "Zobacz publiczny przykład materiałów",
    offerCta: "Zobacz zakres i cenę",
    handlingBoundary:
      "Nie wysyłaj haseł, kluczy prywatnych, kluczy API, tokenów ani kodów odzyskiwania · Jeden workflow · Zasady obsługi materiałów uzgadniane przed przyjęciem",
    flowLabel: "Metoda WitnessOps",
    flowItems: [
      {
        step: "Przed wykonaniem",
        title: "Zdefiniuj granice workflow",
        body: "Nazwij właściciela, dozwolone działania, politykę, systemy i zgodę.",
      },
      {
        step: "Podczas wykonania",
        title: "Zachowaj upoważnienie i materiały",
        body: "Nazwij zgodę, zakres, ścieżkę narzędzi, obserwacje i nierozstrzygnięte luki.",
      },
      {
        step: "Po wykonaniu",
        title: "Uczyń działanie możliwym do przeglądu",
        body: "Powiąż zapis z materiałami, ograniczeniami i ścieżką weryfikatora.",
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
      "Agent Action Receipt może powiązać zadeklarowane upoważnienie, zapis wykonania, odniesienia do materiałów, odnotowany wynik, odniesienie do podpisującego lub klucza — tam, gdzie jest wdrożone — wynik weryfikatora i nierozstrzygnięte luki.",
    receiptStatus: "Opublikowany przykład — nie są to materiały klienta",
    receiptSpecimenTitle: "Przykład Agent Action Receipt",
    receiptRepositoryLabel: "Repozytorium",
    receiptCommitLabel: "Przypięty commit",
    receiptManifestLabel: "SHA-256 manifestu",
    receiptResultLabel: "Zapisany wynik weryfikatora",
    receiptResult: "pass_with_sample_limitations",
    receiptLink: "Otwórz przypięty przykład materiałów",
    offerEyebrow: "Płatny przegląd",
    offerTitle: "Agent Risk & Control Review",
    offerLead: "Przejrzyj workflow, nie tylko plik.",
    offerBody:
      "Przegląd mapuje jeden nazwany workflow, wskazuje luki w upoważnieniach i materiałach, definiuje proponowany kształt zapisu i dostarcza jasno oznaczony przykładowy pakiet z zaleceniami dotyczącymi kontroli.",
    bestForTitle: "Dla kogo",
    bestForBody:
      "Zespoły bezpieczeństwa, platform, compliance, MSSP i automatyzacji AI, które pozwalają agentom lub automatyzacjom działać w systemach wrażliwych.",
    deliverablesTitle: "Zakres dostawy",
    deliverables: [
      "Mapa workflow i uprawnień",
      "Analiza luk w zatwierdzeniach i materiałach",
      "Proponowany zapis i ścieżka weryfikatora",
      "Przykładowy pakiet i zalecenia dotyczące kontroli",
    ],
    commercialLine:
      "Od 6 500 zł (ok. €1 500) · Termin potwierdzany podczas oceny dopasowania · Jeden agentowy lub zautomatyzowany workflow",
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
  const requestHref = buyerRequestHref(locale);
  const offerHref = "/catalog/workflows";
  const sampleHref = "/review/sample-cases/ai-agent-action-proof-run";

  return (
    <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="agent-proof-offer">
      <section data-ui-proof-id="homepage-hero" className={styles.heroSection}>
        <header className={`${styles.frame} ${styles.heroFrame}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{heroCopy.eyebrow}</p>
            <h1 data-ui-proof-id="homepage-hero-headline" className={styles.heroTitle}>{heroCopy.title}</h1>
            <p data-ui-proof-id="homepage-hero-body" className={styles.heroBody}>{heroCopy.body}</p>
            <p className={styles.heroIntro}>{text.heroIntro}</p>
            <div className={styles.heroActions}>
              <CtaButton uiProofId="homepage-hero-primary-cta" href={requestHref} variant="primary" label={text.primaryCta} className={styles.primaryCta} />
              <CtaButton href={offerHref} variant="secondary" label={text.offerCta} className={styles.secondaryCta} />
            </div>
            <Link className={styles.heroSampleLink} href={sampleHref}>{text.sampleLink} <span aria-hidden="true">↗</span></Link>
            <p className={styles.assuranceLine}>{text.handlingBoundary}</p>
          </div>

          <aside className={styles.flowPanel} aria-label={text.flowLabel}>
            <div className={styles.flowHeader}><span>{text.flowLabel}</span><span aria-hidden="true">φ</span></div>
            <ol className={styles.flowList}>
              {text.flowItems.map((item, index) => (
                <li key={item.step}>
                  <span className={styles.flowNumber}>{String(index + 1).padStart(2, "0")}</span>
                  <div><p>{item.step}</p><h2>{item.title}</h2><span>{item.body}</span></div>
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

      <section id="agent-risk-control" className={styles.offerSection} aria-labelledby="home-offer-heading">
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
