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
      eyebrow: PRIMARY_OFFER.name.en,
      title: PRIMARY_OFFER.cardSituation.en,
      body:
        "Who can authorize it? What identity acts? What can it actually reach? What limits the blast radius? What evidence remains afterward?",
    },
    heroIntro:
      `${PRIMARY_OFFER.name.en} maps identity, permissions, tools, execution path, blast radius, and evidence before a customer, pentest, or incident finds the gaps for you.`,
    primaryCta: "Start a non-secret fit check",
    sampleLink: "Run and verify the compromised API key rotation demo",
    offerCta: "See scope and pricing",
    handlingBoundary:
      "Do not send passwords, private keys, API keys, tokens or recovery codes · One consequential action · Evidence handling agreed before intake",
    flowLabel: "Security review model",
    flowItems: [
      {
        step: "Authority → identity",
        title: "Who approves, and what actually executes?",
        body: "Trace the approval path to the exact service account, agent identity, or runtime principal.",
        href: "#evidence-questions",
      },
      {
        step: "Permissions → tools",
        title: "What can that identity really reach?",
        body: "Map effective permissions, connected tools, APIs, MCP integrations, and privilege boundaries.",
        href: "#evidence-questions",
      },
      {
        step: "Execution → evidence",
        title: "What constrains the action and proves the result?",
        body: "Follow the execution path, blast-radius controls, resulting state, and evidence chain.",
        href: "#agent-action-receipt",
      },
      {
        step: "Paid review",
        title: "Bring one consequential action",
        body: `${PRIMARY_OFFER.price.en}. ${PRIMARY_OFFER.timing.en}.`,
        href: `${PRIMARY_OFFER.requestRoute}?offerId=${PRIMARY_OFFER.id}`,
      },
    ],
    reviewEyebrow: "The security questions",
    reviewTitle: "Five questions. One consequential action.",
    reviewBody:
      "The review follows the action from production authority to resulting state without requiring WitnessOps terminology to understand the risk.",
    reviewItems: [
      { title: "Who can authorize it?", body: "Owner, policy, approval path, and privilege boundary." },
      { title: "What identity performs it?", body: "Agent identity, service account, runtime principal, or delegated user." },
      { title: "What can it reach?", body: "Effective permissions, connected tools, APIs, MCP integrations, and systems." },
      {
        title: "What limits the blast radius?",
        body: "Scope controls, approval gates, tool restrictions, stop conditions, and failure handling.",
      },
      {
        title: "What evidence remains?",
        body: "A chain binding authorization, execution, resulting state, and unresolved gaps.",
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
    offerLead: "Review production authority before the agent acts.",
    offerBody:
      "WitnessOps reviews one consequential agent or automation action across authority, identity, permissions, tools, execution, and evidence.",
    bestForTitle: "Best for",
    bestForBody:
      "Security, platform, compliance, MSSP, and AI automation teams letting agents or automations touch sensitive systems.",
    deliverablesTitle: "Deliverables",
    deliverables: PRIMARY_OFFER.included.en,
    commercialLine: `${PRIMARY_OFFER.price.en} · ${PRIMARY_OFFER.fitCheck.en} · ${PRIMARY_OFFER.unit.en} · ${PRIMARY_OFFER.timing.en}`,
    outcomeTitle: "Outcome",
    outcomeBody:
      "A practical security handover showing the execution path, permission boundary, evidence chain, control gaps, and the smallest useful fixes.",
    boundaryEyebrow: "Proof boundary",
    boundaryTitle: "A receipt is only as strong as its named evidence and verifier.",
    boundaryBody:
      "WitnessOps distinguishes a signed record from a supported claim. A receipt proves only what its named verifier and referenced evidence support. It does not certify that an agent was correct, safe, compliant, or complete. The public receipt specimen is an inspection aid, not customer evidence, and does not establish production deployment, compliance, correctness, safety, or completeness.",
    closeTitle: "Bring one consequential action. Review its authority, access, blast radius, and evidence.",
    closeBody:
      `${PRIMARY_OFFER.fitCheckQuestion.en} Customer evidence is accepted only after scope and handling are agreed.`,
  },
  pl: {
    hero: {
      eyebrow: PRIMARY_OFFER.name.pl,
      title: PRIMARY_OFFER.cardSituation.pl,
      body:
        "Kto może je zatwierdzić? Jaka tożsamość je wykonuje? Do czego agent naprawdę ma dostęp? Co ogranicza zasięg skutków? Jaki ślad dowodowy pozostaje?",
    },
    heroIntro:
      `${PRIMARY_OFFER.name.pl} mapuje tożsamość, uprawnienia, narzędzia, ścieżkę wykonania, zasięg skutków i dowody — zanim luki znajdzie za Ciebie klient, pentest lub incydent.`,
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
    sampleLink: "Uruchom i zweryfikuj demo rotacji skompromitowanego klucza API",
    offerCta: "Zobacz zakres i cenę",
    handlingBoundary:
      "Nie wysyłaj haseł, kluczy prywatnych, kluczy API, tokenów ani kodów odzyskiwania · Jedno istotne działanie · Zasady obsługi materiałów uzgadniane przed przyjęciem",
    flowLabel: "Model przeglądu bezpieczeństwa",
    flowItems: [
      {
        step: "Upoważnienie → tożsamość",
        title: "Kto zatwierdza i co naprawdę wykonuje działanie?",
        body: "Prześledź ścieżkę zatwierdzania do dokładnej tożsamości usługi, agenta lub procesu wykonawczego.",
        href: "#evidence-questions",
      },
      {
        step: "Uprawnienia → narzędzia",
        title: "Do czego ta tożsamość naprawdę ma dostęp?",
        body: "Zmapuj rzeczywiste uprawnienia, narzędzia, API, integracje MCP i granice uprawnień.",
        href: "#evidence-questions",
      },
      {
        step: "Wykonanie → dowody",
        title: "Co ogranicza działanie i potwierdza wynik?",
        body: "Prześledź ścieżkę wykonania, ograniczenia skutków, stan wynikowy i łańcuch dowodowy.",
        href: "#agent-action-receipt",
      },
      {
        step: "Płatny przegląd",
        title: "Zgłoś jedno istotne działanie",
        body: `${PRIMARY_OFFER.price.pl}. ${PRIMARY_OFFER.timing.pl}.`,
        href: `/pl${PRIMARY_OFFER.requestRoute}?offerId=${PRIMARY_OFFER.id}`,
      },
    ],
    reviewEyebrow: "Pytania bezpieczeństwa",
    reviewTitle: "Pięć pytań. Jedno istotne działanie.",
    reviewBody:
      "Przegląd prowadzi od uprawnienia do działania w produkcji aż do stanu wynikowego, bez potrzeby znajomości terminologii WitnessOps.",
    reviewItems: [
      { title: "Kto może je zatwierdzić?", body: "Właściciel, polityka, ścieżka zatwierdzania i granica uprawnień." },
      { title: "Jaka tożsamość je wykonuje?", body: "Tożsamość agenta, konto usługi, proces wykonawczy lub delegowany użytkownik." },
      { title: "Do czego ma dostęp?", body: "Rzeczywiste uprawnienia, narzędzia, API, integracje MCP i systemy." },
      {
        title: "Co ogranicza zasięg skutków?",
        body: "Granice zakresu, bramki zatwierdzania, ograniczenia narzędzi, warunki zatrzymania i obsługa błędów.",
      },
      {
        title: "Jaki ślad dowodowy pozostaje?",
        body: "Łańcuch wiążący zatwierdzenie, wykonanie, stan wynikowy i nierozstrzygnięte luki.",
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
    offerLead: "Sprawdź uprawnienie produkcyjne, zanim agent zacznie działać.",
    offerBody:
      "WitnessOps analizuje jedno istotne działanie agenta lub automatyzacji przez ciąg: upoważnienie, tożsamość, uprawnienia, narzędzia, wykonanie i dowody.",
    bestForTitle: "Dla kogo",
    bestForBody:
      "Zespoły bezpieczeństwa, platform, compliance, MSSP i automatyzacji AI, które pozwalają agentom lub automatyzacjom działać w systemach wrażliwych.",
    deliverablesTitle: "Zakres dostawy",
    deliverables: PRIMARY_OFFER.included.pl,
    commercialLine: `${PRIMARY_OFFER.price.pl} · ${PRIMARY_OFFER.fitCheck.pl} · ${PRIMARY_OFFER.unit.pl} · ${PRIMARY_OFFER.timing.pl}`,
    outcomeTitle: "Wynik",
    outcomeBody:
      "Kupujący otrzymuje praktyczny raport i omówienie: ścieżkę wykonania, granicę uprawnień, łańcuch dowodowy, luki kontrolne i najmniejsze użyteczne poprawki.",
    boundaryEyebrow: "Granica dowodu",
    boundaryTitle: "Zapis jest tak mocny, jak wskazane materiały i weryfikator.",
    boundaryBody:
      "WitnessOps odróżnia podpisany zapis od twierdzenia popartego materiałami. Zapis dowodzi wyłącznie tego, co wspierają wskazany weryfikator i przywołane materiały. Nie certyfikuje, że agent działał poprawnie, bezpiecznie, zgodnie z wymaganiami lub kompletnie. Publiczny przykład zapisu pomaga w inspekcji, ale nie jest materiałem klienta i nie potwierdza wdrożenia produkcyjnego, zgodności, poprawności, bezpieczeństwa ani kompletności.",
    closeTitle: "Zgłoś jedno istotne działanie. Sprawdź jego upoważnienie, dostęp, zasięg skutków i dowody.",
    closeBody:
      `${PRIMARY_OFFER.fitCheckQuestion.pl} Materiały klienta są przyjmowane dopiero po uzgodnieniu zakresu i zasad postępowania.`,
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
            <h1
              data-ui-proof-id="homepage-hero-headline"
              data-copy-length={heroCopy.title.length > 36 ? "long" : "standard"}
              className={styles.heroTitle}
            >
              {heroCopy.title}
            </h1>
            <p className={styles.heroOfferName}>{heroCopy.eyebrow}</p>
            <p data-ui-proof-id="homepage-hero-body" className={styles.heroBody}>{heroCopy.body}</p>
            <p className={styles.heroIntro}>{text.heroIntro}</p>
            <p className={styles.heroCommercial}>
              {PRIMARY_OFFER.unit[locale]} · {PRIMARY_OFFER.price[locale]} · {PRIMARY_OFFER.timing[locale]}
            </p>
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
