import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaButton } from "@/components/shared/cta-button";
import { buyerRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { OwnSystemCase } from "./own-system-case";
import { HeroGap } from "./hero-gap";
import styles from "./buyer-homepage.module.css";

type HeroCopy = { eyebrow: string; title: string; body: string };

export function BuyerHomepage({ locale, hero }: { locale: BuyerLocale; hero?: HeroCopy }) {
  const pl = locale === "pl";
  const prefix = pl ? "/pl" : "";
  const requestHref = buyerRequestHref(locale);
  const sampleHref = "/review/sample-cases/ai-agent-action-proof-run";
  const title = hero?.title ?? (pl ? "Znajdź luki w bezpieczeństwie swoich systemów." : "Find security gaps in your systems.");
  const body = hero?.body ?? (pl ? "Sprawdź, co jest wystawione, co się zmieniło, co zadziałało i co faktycznie potwierdzają dowody." : "Verify what is exposed, what changed, what acted, and what the evidence actually supports.");
  const cta = pl ? "Omów zakres przeglądu" : "Scope a review";
  const services = pl ? [
    ["Zweryfikuj działanie AI", "Sprawdź uprawnienia, zatwierdzenia i dowody wykonania, zanim zaczniesz na nim polegać.", "/catalog/workflows", "Zobacz zakres przeglądu (EN)"],
    ["Sprawdź system", "Zbadaj jedno pytanie bezpieczeństwa dotyczące systemu, usługi lub zasobu wystawionego do internetu.", `${prefix}/catalog#system-reviews`, "Zobacz opcje przeglądu systemu"],
    ["Zweryfikuj lub napraw proces", "Prześledź zawodną ścieżkę, znajdź miejsce awarii i po naprawie sprawdź wynik w systemie docelowym.", `${prefix}/catalog/automation-repair`, "Zobacz diagnozę i naprawę"],
  ] : [
    ["Verify an AI action", "Check permissions, approvals and execution evidence before you rely on it.", "/catalog/workflows", "See the review scope"],
    ["Review a system", "Investigate one security question around a system, service or exposed asset.", "/catalog#system-reviews", "See system review options"],
    ["Verify or repair a workflow", "Trace a failing path, identify the break and verify the destination result after repair.", "/catalog/automation-repair", "See diagnosis and repair"],
  ];
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
          <p data-ui-proof-id="homepage-hero-mobile-body" className={styles.heroMobileBody}>{pl ? "Sprawdź, co jest wystawione, co się zmieniło, co zadziałało i co faktycznie potwierdzają dowody." : "Verify what is exposed, what changed, what acted, and what the evidence actually supports."}</p>
        </div>
        <CtaButton uiProofId="homepage-hero-primary-cta" href={requestHref} variant="primary" label={cta} className={styles.primaryCta} />
        <aside aria-label={pl ? "Przykładowe ustalenie przeglądu" : "Example review finding"}><h2 className="sr-only">{pl ? "Przykładowe ustalenie przeglądu" : "Example review finding"}</h2><HeroGap locale={locale} /></aside>
        <Link data-ui-proof-id="homepage-sample-review-cta" className={styles.heroSampleLink} href="/catalog/workflows#sample-review">{pl ? "Zobacz przykładowe ustalenie (EN)" : "See a sample finding"}<ArrowRight size={18} aria-hidden="true" /></Link>
        <p className={styles.heroNote}>{pl ? "Zacznij od krótkiego opisu. Zakres i cenę uzgodnimy przed rozpoczęciem pracy. Bez danych logowania i danych klientów." : "Start with a short description. We’ll confirm fit, scope and price before work begins. No credentials or customer records needed."}</p>
      </header>
      <div className={styles.frame}>
        <ul className={styles.deliverableStrip} aria-label={pl ? "Podejście" : "Our approach"}>{(pl ? ["Ekspozycja", "Zmiany", "Działania", "Dowody"] : ["Exposure", "Changes", "Actions", "Evidence"]).map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
    <section className={styles.reviewSection} aria-labelledby="home-services-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Co wymaga sprawdzenia?" : "What needs checking?"}</p><h2 id="home-services-heading" className={styles.sectionTitle}>{pl ? "Zacznij od jednego systemu, działania lub wyniku, który ma znaczenie." : "Start with one system, action or result that matters."}</h2><p className={styles.sectionBody}>{pl ? "Zacznij przed wdrożeniem, po zmianie lub gdy wynik budzi wątpliwości." : "Start before launch, after a change or when a result is in doubt."}</p></div>
      <ul className={`${styles.reviewGrid} ${styles.serviceGrid}`}>{services.map(([heading, detail, href, label]) => <li key={heading}><h3>{heading}</h3><p>{detail}</p><Link className={styles.textLink} href={href}>{label}<ArrowRight size={16} aria-hidden="true" /></Link></li>)}</ul>
      <p className={styles.askEntry}>{pl ? "Nie wiesz, co wymaga sprawdzenia?" : "Not sure what needs checking?"} <Link href="/docs/assistant">{pl ? "Zapytaj o zakres (EN)" : "Ask about scope"}<ArrowRight size={16} aria-hidden="true" /></Link></p>
      <Link className={styles.sectionLink} href={`${prefix}/catalog`}>{pl ? "Zobacz wszystkie opcje przeglądu" : "See all review options"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section className={`${styles.reviewSection} ${styles.decisionSection}`} aria-labelledby="home-decision-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Kiedy zacząć" : "When to start"}</p><h2 id="home-decision-heading" className={styles.sectionTitle}>{pl ? "Przed kolejną ważną decyzją." : "Before the next consequential step."}</h2></div>
      <ul className={styles.decisionGrid}>
        <li><h3>{pl ? "Przed nadaniem dostępu do produkcji" : "Before production access"}</h3><p>{pl ? "System, agent lub integracja ma dostać nowy dostęp? Sprawdź ekspozycję, uprawnienia i zabezpieczenia, zanim zatwierdzisz, ograniczysz lub odłożysz zmianę." : "Giving a system, agent or integration new access? Verify its exposure, permissions and controls before you approve, restrict or delay the change."}</p></li>
        <li><h3>{pl ? "Przed decyzją klienta o bezpieczeństwie" : "Before a customer security decision"}</h3><p>{pl ? "Klient potrzebuje dowodów na to, jak zachowuje się Twój system lub do czego ma dostęp? Zweryfikuj właściwe twierdzenie i przygotuj ustalenia, które klient może sprawdzić." : "A customer needs evidence about how your system behaves or what it can access? Verify the relevant claim and prepare findings they can inspect."}</p></li>
      </ul>
      <p className={styles.sectionBody}>{pl ? "Powiedz, co ma się wydarzyć i do kiedy. Uzgodnimy zakres, cenę i możliwy termin przed rozpoczęciem pracy." : "Tell us what needs to happen and by when. We’ll confirm scope, price and whether we can meet your deadline before work begins."}</p>
      <Link className={styles.sectionLink} href={requestHref}>{pl ? "Omów zakres przeglądu" : "Scope a review"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section id="how-it-works" className={styles.reviewSection} aria-labelledby="home-review-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Sposób pracy" : "Our approach"}</p><h2 id="home-review-heading" className={styles.sectionTitle}>{pl ? "Od pytania do ustaleń, które możesz sprawdzić." : "From a question to findings you can inspect."}</h2><p className={styles.sectionBody}>{pl ? "Oddzielamy obserwacje od założeń. Pokazujemy, co sprawdzono, co pozostaje nieznane i co warto zrobić dalej." : "We separate observations from assumptions. You can see what was checked, what remains unknown and what to do next."}</p></div>
      <ol className={styles.reviewGrid}>{stages.map(([heading, detail], i) => <li key={heading}><span>{String(i + 1).padStart(2, "0")}</span><h3>{heading}</h3><p>{detail}</p></li>)}</ol>
      <OwnSystemCase locale={locale} />
      <div className={styles.evidenceNote}><p>{pl ? "Przykład paczki dowodowej" : "Proof bundle example"}</p><Link href={sampleHref}>{pl ? "Zobacz, jak działa paczka dowodowa (EN)" : "See how a proof bundle works"}<ArrowRight size={16} aria-hidden="true" /></Link><p>{pl ? "Przykład syntetyczny: sprawdza opublikowane pliki i zadeklarowaną zmianę. Nie potwierdza rzeczywistej operacji u dostawcy." : "Synthetic example, not customer evidence: checks the published artifacts and declared transition. It does not establish a real provider action."}</p></div>
      <Link className={styles.sectionLink} href={`${prefix}/why-witnessops`}>{pl ? "Zobacz, jak weryfikujemy" : "See how WitnessOps verifies"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <div className={styles.frame}><section className={styles.closingSection} aria-labelledby="home-close-heading"><div><h2 id="home-close-heading">{pl ? "Co robi Twój system i co chcesz sprawdzić?" : "What does your system do and what needs checking?"}</h2><p>{pl ? "Opisz system i pytanie bezpieczeństwa. Zaproponujemy konkretny zakres i kolejny krok. Bez haseł, kluczy API i danych klientów." : "Describe the system and the security question. We’ll propose a clear scope and next step. Leave out credentials and customer data."}</p></div><CtaButton href={requestHref} variant="primary" label={cta} className={styles.closingPrimary} /></section></div>
  </main>;
}
