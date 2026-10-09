import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaButton } from "@/components/shared/cta-button";
import { BUYER_SERVICES, buyerRequestHref, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_REVIEW_ID, publicPaidReviews } from "@/lib/public-paid-reviews";
import { HOMEPAGE_TWO_OFFER_COPY } from "./homepage-two-offer-copy";
import { OwnSystemCase } from "./own-system-case";
import { HeroGap } from "./hero-gap";
import styles from "./buyer-homepage.module.css";

type HeroCopy = { eyebrow: string; title: string; body: string };

export function BuyerHomepage({ locale, hero }: { locale: BuyerLocale; hero?: HeroCopy }) {
  const pl = locale === "pl";
  const prefix = pl ? "/pl" : "";
  const text = HOMEPAGE_TWO_OFFER_COPY[locale];
  const requestHref = buyerRequestHref(locale);
  const services = publicPaidReviews(BUYER_SERVICES);
  const agent = services[0];
  const sampleHref = "/review/sample-cases/ai-agent-action-proof-run";
  const title = hero?.title ?? text.headline;
  const body = hero?.body ?? text.support;
  const agentHref = agent ? buyerServiceRequestHref(locale, agent) : requestHref;
  const stages = pl ? [
    ["Uzgodnij granicę", "Wskaż działanie, system i decyzję, którą mają wesprzeć ustalenia. Cenę i zasady dostępu uzgadniamy przed pracą."],
    ["Sprawdź i przetestuj", "Sprawdź właściwy stan, zachowanie i zabezpieczenia. Wykonaj uzgodnione testy i zachowaj obserwacje wspierające wynik."],
    ["Przekaż ustalenie", "Otrzymaj wynik, dowody, ograniczenia, niewiadome i praktyczne kolejne kroki. Naprawa i ponowne testy pozostają zależne od uzgodnionego zakresu."],
  ] : [
    ["Agree the boundary", "Name the action, system and decision the work needs to support. Agree price and access before work begins."],
    ["Inspect and test", "Inspect the relevant state, behaviour and controls. Run the agreed checks and preserve the observations that support the result."],
    ["Deliver the finding", "Receive the result, supporting evidence, limitations, unknowns and practical next steps. Corrections and retesting remain subject to the agreed scope."],
  ];
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="security-verification">
    <section data-ask-trigger-guard data-ui-proof-id="homepage-hero" className={styles.heroSection}>
      <header className={`${styles.frame} ${styles.heroFrame}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{hero?.eyebrow ?? (pl ? "Bezpieczeństwo · Weryfikacja · Dowody" : "Security · Verification · Evidence")}</p>
          <h1 data-ui-proof-id="homepage-hero-headline" data-copy-length="long" className={styles.heroTitle}>{title}</h1>
          <p data-ui-proof-id="homepage-hero-body" className={styles.heroBody}>{body}</p>
          <p data-ui-proof-id="homepage-hero-mobile-body" className={styles.heroMobileBody}>{body}</p>
        </div>
        <CtaButton uiProofId="homepage-hero-primary-cta" href={agentHref} variant="primary" label={text.aiCta} className={styles.primaryCta} />
        <aside aria-label={pl ? "Przykładowe ustalenie przeglądu" : "Example review finding"}><h2 className="sr-only">{pl ? "Przykładowe ustalenie przeglądu" : "Example review finding"}</h2><HeroGap locale={locale} /></aside>
        <Link data-ui-proof-id="homepage-sample-review-cta" className={styles.heroSampleLink} href={sampleHref}>{pl ? "Zobacz historyczny przykład działania (EN)" : "See a historical action example"}<ArrowRight size={18} aria-hidden="true" /></Link>
        <p className={styles.heroNote}>{pl ? "Zacznij od krótkiego opisu. Zakres i cenę uzgodnimy przed rozpoczęciem pracy. Bez danych logowania i danych klientów." : "Start with a short description. We’ll confirm fit, scope and price before work begins. No credentials or customer records needed."}</p>
      </header>
      <div className={styles.frame}>
        <ul className={styles.deliverableStrip} aria-label={pl ? "Podejście" : "Our approach"}>{(pl ? ["Ekspozycja", "Zmiany", "Działania", "Dowody"] : ["Exposure", "Changes", "Actions", "Evidence"]).map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
    <section className={styles.reviewSection} aria-labelledby="home-services-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{text.reviewsEyebrow}</p><h2 id="home-services-heading" className={styles.sectionTitle}>{text.reviewsTitle}</h2><p className={styles.sectionBody}>{text.reviewsBody}</p></div>
      <ul className={`${styles.reviewGrid} ${styles.serviceGrid} ${styles.twoOfferGrid}`}>{services.map((service) => {
        const ai = service.id === PUBLIC_AGENT_ACTION_REVIEW_ID;
        return <li key={service.id} data-home-offer={service.id}><h3>{ai ? text.aiHeadline : text.externalHeadline}</h3><p>{service.name[locale]}</p><p>{service.price[locale]}</p><p>{service.cardSituation[locale]}</p><p>{service.timing[locale]}</p><Link className={styles.textLink} href={buyerServiceRequestHref(locale, service)}>{ai ? text.aiCta : text.externalCta}<ArrowRight size={16} aria-hidden="true" /></Link></li>;
      })}</ul>
      <aside className={styles.freeCheck} aria-label={text.freeLabel}><div><h3>{text.freeTitle}</h3><p>{text.freeBody}</p></div><Link className={styles.textLink} href="/check">{text.freeCta}<ArrowRight size={16} aria-hidden="true" /></Link></aside>
      <p className={styles.askEntry}>{pl ? "Nie wiesz, który przegląd pasuje?" : "Not sure which review fits?"} <Link href="/docs/assistant">{pl ? "Zapytaj o zakres (EN)" : "Ask about scope"}<ArrowRight size={16} aria-hidden="true" /></Link></p>
      <Link className={styles.sectionLink} href={`${prefix}/catalog`}>{text.compareCta}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section className={`${styles.reviewSection} ${styles.decisionSection}`} aria-labelledby="home-decision-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Kiedy zacząć" : "When to start"}</p><h2 id="home-decision-heading" className={styles.sectionTitle}>{pl ? "Przed kolejną ważną decyzją." : "Before the next consequential step."}</h2></div>
      <ul className={styles.decisionGrid}>
        <li><h3>{pl ? "Przed nadaniem dostępu do produkcji" : "Before production access"}</h3><p>{pl ? "System, agent lub integracja ma dostać nowy dostęp? Sprawdź ekspozycję, uprawnienia i zabezpieczenia, zanim zatwierdzisz, ograniczysz lub odłożysz zmianę." : "Giving a system, agent or integration new access? Verify its exposure, permissions and controls before you approve, restrict or delay the change."}</p></li>
        <li><h3>{pl ? "Przed decyzją klienta o bezpieczeństwie" : "Before a customer security decision"}</h3><p>{pl ? "Klient potrzebuje dowodów na to, jak zachowuje się Twój system lub do czego ma dostęp? Zweryfikuj właściwe twierdzenie i przygotuj ustalenia, które klient może sprawdzić." : "A customer needs evidence about how your system behaves or what it can access? Verify the relevant claim and prepare findings they can inspect."}</p></li>
      </ul>
      <p className={styles.sectionBody}>{pl ? "Powiedz, co ma się wydarzyć i do kiedy. Uzgodnimy zakres, cenę i możliwy termin przed rozpoczęciem pracy." : "Tell us what needs to happen and by when. We’ll confirm scope, price and whether we can meet your deadline before work begins."}</p>
      <Link className={styles.sectionLink} href={requestHref}>{text.fitCta}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section id="how-it-works" className={styles.reviewSection} aria-labelledby="home-review-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Sposób pracy" : "Our approach"}</p><h2 id="home-review-heading" className={styles.sectionTitle}>{pl ? "Od pytania do ustaleń, które możesz sprawdzić." : "From a question to findings you can inspect."}</h2><p className={styles.sectionBody}>{pl ? "Oddzielamy obserwacje od założeń. Pokazujemy, co sprawdzono, co pozostaje nieznane i co warto zrobić dalej." : "We separate observations from assumptions. You can see what was checked, what remains unknown and what to do next."}</p></div>
      <ol className={styles.reviewGrid}>{stages.map(([heading, detail], i) => <li key={heading}><span>{String(i + 1).padStart(2, "0")}</span><h3>{heading}</h3><p>{detail}</p></li>)}</ol>
      <OwnSystemCase locale={locale} />
      <div className={styles.evidenceNote}><p>{pl ? "Przykład paczki dowodowej" : "Proof bundle example"}</p><Link href={sampleHref}>{pl ? "Zobacz, jak działa paczka dowodowa (EN)" : "See how a proof bundle works"}<ArrowRight size={16} aria-hidden="true" /></Link><p>{pl ? "Przykład syntetyczny: sprawdza opublikowane pliki i zadeklarowaną zmianę. Nie potwierdza rzeczywistej operacji u dostawcy." : "Synthetic example, not customer evidence: checks the published artifacts and declared transition. It does not establish a real provider action."}</p></div>
      <Link className={styles.sectionLink} href={`${prefix}/why-witnessops`}>{pl ? "Zobacz, jak weryfikujemy" : "See how WitnessOps verifies"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <div className={styles.frame}><section className={styles.closingSection} aria-labelledby="home-close-heading"><div><h2 id="home-close-heading">{pl ? "Co robi Twój system i co chcesz sprawdzić?" : "What does your system do and what needs checking?"}</h2><p>{pl ? "Opisz system i pytanie bezpieczeństwa. Zaproponujemy konkretny zakres i kolejny krok. Bez haseł, kluczy API i danych klientów." : "Describe the system and the security question. We’ll propose a clear scope and next step. Leave out credentials and customer data."}</p></div><CtaButton href={requestHref} variant="primary" label={text.fitCta} className={styles.closingPrimary} /></section></div>
  </main>;
}
