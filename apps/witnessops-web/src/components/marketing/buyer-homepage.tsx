import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaButton } from "@/components/shared/cta-button";
import { buyerRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { OwnSystemCase } from "./own-system-case";
import { ReviewFinding } from "./agent-review-sample";
import styles from "./buyer-homepage.module.css";

type HeroCopy = { eyebrow: string; title: string; body: string };

export function BuyerHomepage({ locale, hero }: { locale: BuyerLocale; hero?: HeroCopy }) {
  const pl = locale === "pl";
  const prefix = pl ? "/pl" : "";
  const requestHref = buyerRequestHref(locale);
  const sampleHref = "/review/sample-cases/ai-agent-action-proof-run";
  const title = hero?.title ?? (pl ? "Znajdź luki w bezpieczeństwie AI i automatyzacji." : "Find security gaps in your AI and automation.");
  const body = hero?.body ?? (pl ? "Dla zespołów produktowych i operacyjnych, których AI i automatyzacje zmieniają dane, realizują płatności lub nadają dostęp. Poznaj ryzyka, sprawdź materiały i zdecyduj, co poprawić." : "For product and operations teams whose AI and automations change records, move money or control access. Understand the risks, inspect the evidence and decide what to fix.");
  const cta = pl ? "Omów zakres przeglądu" : "Scope a review";
  const services = pl ? [
    ["Sprawdź działanie AI", "Poznaj uprawnienia, zasady zatwierdzania i dowody wykonania przed wdrożeniem lub przekazaniem klientowi.", "/catalog/workflows", "Zobacz zakres przeglądu (EN)"],
    ["Sprawdź system", "Sprawdź bezpieczeństwo jednego serwera Linux lub systemu dostępnego z internetu.", `${prefix}/catalog#system-reviews`, "Zobacz przeglądy systemów"],
    ["Przywróć działanie procesu", "Zdiagnozuj jedną zawodną ścieżkę, uzgodnij naprawę i sprawdź wynik w systemie docelowym.", `${prefix}/catalog/automation-repair`, "Zobacz diagnozę i naprawę"],
  ] : [
    ["Review an AI action", "Understand permissions, approvals and execution evidence before launch or handover.", "/catalog/workflows", "See the review scope"],
    ["Review a system", "Investigate the security question around one Linux host or one internet-facing system.", "/catalog#system-reviews", "See system security services"],
    ["Restore a workflow", "Diagnose a failing path, agree a repair and check the actual destination result.", "/catalog/automation-repair", "See diagnosis and repair"],
  ];
  const stages = pl ? [
    ["Uzgodnij zakres", "Wskaż działanie, systemy i decyzję, którą mają wesprzeć ustalenia. Cenę i zasady dostępu uzgadniamy przed pracą."],
    ["Sprawdź i przetestuj", "Porównaj uprawnienia i oczekiwane zachowanie z dostępnymi materiałami oraz wynikami uzgodnionych testów."],
    ["Podejmij kolejny krok", "Otrzymaj ustalenia z materiałami źródłowymi, ograniczenia i zalecenia. Naprawa i ponowny test zależą od uzgodnionego zakresu."],
  ] : [
    ["Agree the boundary", "Name the action, systems and decision the work needs to support. Agree price and access before work begins."],
    ["Inspect and test", "Compare permissions and expected behavior with available evidence and the results of agreed tests."],
    ["Act on the findings", "Receive evidence references, limitations and practical next steps. Corrections and retesting depend on the agreed scope."],
  ];
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="security-verification">
    <section data-ask-trigger-guard data-ui-proof-id="homepage-hero" className={styles.heroSection}>
      <header className={`${styles.frame} ${styles.heroFrame}`}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{hero?.eyebrow ?? (pl ? "AI · Automatyzacja · Bezpieczeństwo" : "AI · Automation · Security")}</p>
          <h1 data-ui-proof-id="homepage-hero-headline" data-copy-length="long" className={styles.heroTitle}>{title}</h1>
          <p data-ui-proof-id="homepage-hero-body" className={styles.heroBody}>{body}</p>
          <div className={styles.heroActions}>
            <CtaButton uiProofId="homepage-hero-primary-cta" href={requestHref} variant="primary" label={cta} className={styles.primaryCta} />
            <Link data-ui-proof-id="homepage-sample-review-cta" className={styles.heroSampleLink} href="/catalog/workflows#sample-review">{pl ? "Zobacz przykładowe ustalenie (EN)" : "See a sample finding"}<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <p className={styles.heroNote}>{pl ? "Zacznij od krótkiego opisu. Zakres i cenę uzgodnimy przed rozpoczęciem pracy. Bez danych logowania i danych klientów." : "Start with a short description. We’ll confirm fit, scope and price before work begins. No credentials or customer records needed."}</p>
        </div>
        <aside aria-label={pl ? "Przykładowe ustalenie przeglądu" : "Example review finding"}><h2 className="sr-only">{pl ? "Przykładowe ustalenie przeglądu" : "Example review finding"}</h2><ReviewFinding locale={locale} /></aside>
      </header>
      <div className={styles.frame}>
        <ul className={styles.deliverableStrip} aria-label={pl ? "Podejście" : "Our approach"}>{(pl ? ["Uprawnienia", "Zatwierdzanie", "Wykonanie", "Zaobserwowane wyniki"] : ["Permissions", "Approvals", "Execution", "Observed results"]).map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
    <section className={styles.reviewSection} aria-labelledby="home-services-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "W czym możemy pomóc" : "Ways to work with WitnessOps"}</p><h2 id="home-services-heading" className={styles.sectionTitle}>{pl ? "Zacznij od tego, co wymaga sprawdzenia." : "Start with what needs attention."}</h2><p className={styles.sectionBody}>{pl ? "Zacznij przed wdrożeniem, po zmianie lub gdy wynik budzi wątpliwości." : "Start before launch, after a change or when a result is in doubt."}</p></div>
      <ul className={`${styles.reviewGrid} ${styles.serviceGrid}`}>{services.map(([heading, detail, href, label]) => <li key={heading}><h3>{heading}</h3><p>{detail}</p><Link className={styles.textLink} href={href}>{label}<ArrowRight size={16} aria-hidden="true" /></Link></li>)}</ul>
      <p className={styles.askEntry}>{pl ? "Pytania o zakres lub cenę?" : "Questions about scope or pricing?"} <Link href="/docs/assistant">{pl ? "Zapytaj WitnessOps AI (EN)" : "Ask WitnessOps AI"}<ArrowRight size={16} aria-hidden="true" /></Link></p>
      <Link className={styles.sectionLink} href={`${prefix}/catalog`}>{pl ? "Wszystkie usługi i zakresy" : "View all services and scopes"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section className={`${styles.reviewSection} ${styles.decisionSection}`} aria-labelledby="home-decision-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Kiedy zacząć" : "When to start"}</p><h2 id="home-decision-heading" className={styles.sectionTitle}>{pl ? "Przed kolejną ważną decyzją." : "Before the next consequential step."}</h2></div>
      <ul className={styles.decisionGrid}>
        <li><h3>{pl ? "Przed nadaniem dostępu do produkcji" : "Before production access"}</h3><p>{pl ? "Agent ma zmieniać dane lub wykonywać działania? Sprawdź jego uprawnienia i zabezpieczenia, zanim uzyskasz podstawy do zatwierdzenia, ograniczenia lub odroczenia dostępu." : "Giving an agent permission to act? Review its access and controls so you can decide whether to approve, restrict or delay production access."}</p></li>
        <li><h3>{pl ? "Przed decyzją klienta o bezpieczeństwie" : "Before a customer security decision"}</h3><p>{pl ? "Klient pyta, co agent może zrobić i jakie materiały to potwierdzają? Sprawdź jedno istotne działanie i przygotuj ustalenia wspierające tę decyzję." : "A customer needs to know what your agent can do and what supports your answer? Review one consequential action and prepare findings for that decision."}</p></li>
      </ul>
      <p className={styles.sectionBody}>{pl ? "Powiedz, co ma się wydarzyć i do kiedy. Uzgodnimy zakres, cenę i możliwy termin przed rozpoczęciem pracy." : "Tell us what needs to happen and by when. We’ll confirm scope, price and whether we can meet your deadline before work begins."}</p>
      <Link className={styles.sectionLink} href={requestHref}>{pl ? "Omów planowany przegląd" : "Discuss your review"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section id="how-it-works" className={styles.reviewSection} aria-labelledby="home-review-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Sposób pracy" : "Our approach"}</p><h2 id="home-review-heading" className={styles.sectionTitle}>{pl ? "Od pytania do ustaleń, które możesz sprawdzić." : "From a question to findings you can inspect."}</h2><p className={styles.sectionBody}>{pl ? "Oddzielamy obserwacje od założeń. Pokazujemy, co sprawdzono, co pozostaje nieznane i co warto zrobić dalej." : "We separate observations from assumptions. You can see what was checked, what remains unknown and what to do next."}</p></div>
      <ol className={styles.reviewGrid}>{stages.map(([heading, detail], i) => <li key={heading}><span>{String(i + 1).padStart(2, "0")}</span><h3>{heading}</h3><p>{detail}</p></li>)}</ol>
      <OwnSystemCase locale={locale} />
      <div className={styles.evidenceNote}><p>{pl ? "Zajrzyj do materiałów" : "Go deeper into the evidence"}</p><Link href={sampleHref}>{pl ? "Demo weryfikacji (EN)" : "Explore the verification demo"}<ArrowRight size={16} aria-hidden="true" /></Link><p>{pl ? "Przykład syntetyczny: sprawdza opublikowane pliki i zadeklarowaną zmianę. Nie potwierdza rzeczywistej operacji u dostawcy." : "Synthetic example, not customer evidence: checks the published artifacts and declared transition. It does not establish a real provider action."}</p></div>
      <Link className={styles.sectionLink} href={`${prefix}/why-witnessops`}>{pl ? "Poznaj nasze podejście" : "Read about our approach"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <div className={styles.frame}><section className={styles.closingSection} aria-labelledby="home-close-heading"><div><h2 id="home-close-heading">{pl ? "Co robi Twój system i co chcesz sprawdzić?" : "What does your system do and what needs checking?"}</h2><p>{pl ? "Opisz system i swoją wątpliwość. Zaproponujemy zakres i kolejny krok. Bez haseł, kluczy API i danych klientów." : "Tell us about the system and your concern. We’ll propose a scope and next step. Leave out credentials and customer data."}</p></div><CtaButton href={requestHref} variant="primary" label={cta} className={styles.closingPrimary} /></section></div>
  </main>;
}
