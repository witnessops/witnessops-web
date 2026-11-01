import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { PUBLIC_SALES_REVIEW_EMAIL, salesReviewMailto } from "@/lib/public-contact";
import { BUYER_SERVICES, buyerRequestHref, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { publicPaidReviews } from "@/lib/public-paid-reviews";
import { sovereignAssistantPublished } from "@/lib/sovereign-release";
import { PriceText } from "@/lib/price-unit";
import { HOMEPAGE_TWO_OFFER_COPY } from "./homepage-two-offer-copy";
import { OwnSystemCase } from "./own-system-case";
import heroStyles from "./simple-homepage.module.css";
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
    ["Ustalamy zakres", "Opisz działanie, związane z nim systemy i termin decyzji. Przed rozpoczęciem pracy uzgadniamy zakres, upoważnienie i sposób obchodzenia się z materiałami."],
    ["Analizujemy działanie", "Sprawdzamy, co uruchamia działanie i jaka tożsamość je wykonuje. W dostępnych materiałach szukamy informacji o jej uprawnieniach, zatwierdzaniu działania i zapisach wykonania. Nie wykonujemy tego działania."],
    ["Przekazujemy i omawiamy raport", "Otrzymasz mapę działania, ustalenia powiązane z dowodami, uporządkowane zalecenia i opis tego, czego nie udało się ustalić."],
  ] : [
    ["Agree the boundary", "Name the consequential action, the systems involved and the decision deadline. Agree scope, authority and evidence handling before work begins."],
    ["Read and reconstruct", "Inspect the trigger, executing identity, permissions, approvals and available execution evidence. The review does not execute the action."],
    ["Deliver the report", "Receive an action map, findings linked to evidence, prioritised recommendations, documented unknowns, a written report and a readout."],
  ];
  return <main id="main-content" tabIndex={-1} className={`${styles.page} ${styles.compactHome}`} data-page="home" data-home-direction="security-verification">
    <section data-ask-trigger-guard data-ui-proof-id="homepage-hero" className={`${styles.heroSection} ${heroStyles.page} ${heroStyles.hero}`}>
      <header className={`${heroStyles.frame} ${heroStyles.heroFrame} crop-frame`}>
        <div className={heroStyles.heroCopy}>
          <span className={heroStyles.rule} aria-hidden="true" />
          <p className={heroStyles.eyebrow}>{hero?.eyebrow ?? text.offerName}</p>
          <h1 data-ui-proof-id="homepage-hero-headline">{title}</h1>
        </div>
        <div className={heroStyles.split}>
          <p data-ui-proof-id="homepage-hero-body" className={heroStyles.lead}>{body}</p>
          <div>
            <p className={heroStyles.heroPrice}><PriceText text={text.aiPrice} /></p>
            <p className={heroStyles.subline}>{text.timing}</p>
            <div className={heroStyles.actions}>
              <Link data-ui-proof-id="homepage-hero-primary-cta" href={agentHref} className={heroStyles.primary}>{text.aiCta}</Link>
            </div>
          </div>
        </div>
      </header>
    </section>
    <nav className={heroStyles.linkRow} aria-label={pl ? "Poznaj przegląd" : "Review paths"}><div className={heroStyles.frame}><div className={heroStyles.sectionLinks}>
      <Link className={heroStyles.textLink} href="#home-services-heading">{pl ? "Co otrzymasz" : "What you receive"}</Link>
      <Link className={heroStyles.textLink} href="#how-it-works">{pl ? "Jak pracujemy" : "How it works"}</Link>
      <Link data-ui-proof-id="homepage-sample-review-cta" className={heroStyles.textLink} href={sampleHref}>{pl ? "Historyczny przykład (EN)" : "See a historical action example"}<ArrowRight size={18} aria-hidden="true" /></Link>
    </div></div></nav>
    <section className={styles.reviewSection} aria-labelledby="home-services-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{text.reviewsEyebrow}</p><h2 id="home-services-heading" className={styles.sectionTitle}>{text.reviewsTitle}</h2><p className={styles.sectionBody}>{text.reviewsBody}</p></div>
      <ul className={`${styles.reviewGrid} ${styles.serviceGrid}`}>{services.map((service) => (
        <li key={service.id} data-home-offer={service.id}><h3>{text.aiHeadline}</h3><p>{service.name[locale]}</p><p className={styles.price}><PriceText text={text.aiPrice} /></p><p>{text.aiWhoFor}</p><p>{text.aiDescription}</p><h4>{pl ? "Co otrzymasz" : "What you receive"}</h4><ul>{text.deliverables.map((item) => <li key={item}>{item}</li>)}</ul><p className={styles.timing}>{pl ? text.timing : service.timing[locale]}</p><Link className={styles.textLink} href={buyerServiceRequestHref(locale, service)}>{text.aiCta}<ArrowRight size={16} aria-hidden="true" /></Link></li>
      ))}</ul>
      {sovereignAssistantPublished() ? <p className={styles.askEntry}>{pl ? "Masz pytanie o zakres przeglądu?" : "Not sure which review fits?"} <Link href="/docs/assistant">{pl ? "Zapytaj o zakres (EN)" : "Ask about scope"}<ArrowRight size={16} aria-hidden="true" /></Link></p> : null}
      <Link className={styles.sectionLink} href={pl ? "/pl/reviews" : "/reviews"}>{text.compareCta}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section className={styles.reviewSection} aria-labelledby="home-example-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Przykład" : "Example"}</p><h2 id="home-example-heading" className={styles.sectionTitle}>{pl ? "Zobacz materiały i ich ograniczenia." : "Inspect the evidence and its limits."}</h2><p className={styles.sectionBody}>{pl ? "Przykład pokazuje sposób dokumentowania obserwacji. Nie zastępuje przeglądu Twojego agenta ani nie jest kompletnym raportem z takiego przeglądu." : "An example shows how observations are documented. It is not a complete agent review."}</p></div>
      <OwnSystemCase locale={locale} />
      <div className={styles.evidenceNote}><p className="wo-h4">{pl ? "Przykład paczki dowodowej" : "Proof bundle example"}</p><Link href={sampleHref}>{pl ? "Zobacz, jak działa paczka dowodowa (EN)" : "See how a proof bundle works"}<ArrowRight size={16} aria-hidden="true" /></Link><p>{pl ? "Przykład syntetyczny: sprawdza opublikowane pliki i zadeklarowaną zmianę. Nie potwierdza rzeczywistej operacji u dostawcy." : "Synthetic example, not customer evidence: checks the published artifacts and declared transition. It does not establish a real provider action."}</p></div>
      <Link className={styles.sectionLink} href={`${prefix}/why-witnessops`}>{pl ? "Zobacz, jak weryfikujemy" : "See how WitnessOps verifies"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section id="how-it-works" className={styles.reviewSection} aria-labelledby="home-review-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Sposób pracy" : "Our approach"}</p><h2 id="home-review-heading" className={styles.sectionTitle}>{pl ? "Od pytania do ustaleń, które możesz sprawdzić." : "From a question to findings you can inspect."}</h2><p className={styles.sectionBody}>{pl ? "Oddzielamy obserwacje od założeń. Pokazujemy, co sprawdzono, co pozostaje nieznane i co warto zrobić dalej." : "We separate observations from assumptions. You can see what was checked, what remains unknown and what to do next."}</p></div>
      <ol className={styles.reviewGrid}>{stages.map(([heading, detail], i) => <li key={heading}><span>{String(i + 1).padStart(2, "0")}</span><h3>{heading}</h3><p>{detail}</p></li>)}</ol>
    </div></section>
    <section className={styles.reviewSection} aria-labelledby="home-limits-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Granice przeglądu" : "Review limits"}</p><h2 id="home-limits-heading" className={styles.sectionTitle}>{pl ? "Wiesz, co sprawdzamy." : "Useful evidence. Explicit limits."}</h2><p className={styles.sectionBody}>{pl ? "Analizujemy materiały i opisujemy przebieg jednego działania w zakresie, który można na ich podstawie ustalić. Brakujące dowody i pytania bez odpowiedzi wskazujemy w raporcie." : "We read, inspect, reconstruct and report. Missing evidence and unanswered questions remain explicit."}</p></div>
      <div className={styles.limitColumns}>
        <div><h3>{pl ? "Co pozostaje poza zakresem" : "Outside the scope"}</h3><p>{pl ? "Nie wykonujemy działania, nie zmieniamy produkcji i nie wdrażamy poprawek. Nie prowadzimy ciągłego monitoringu. To nie jest test penetracyjny ani certyfikat bezpieczeństwa agenta." : text.aiScopeNote}</p></div>
        <div><h3>{pl ? "Co ustalamy przed pracą" : "Before work starts"}</h3><p>{pl ? "Zakres, wyłączenia, upoważnienie i sposób przekazania materiałów uzgadniamy pisemnie. Termin realizacji określa podpisany zakres prac (SOW). Jeśli zgłoszenie obejmuje więcej działań, zaproponujemy ograniczenie zakresu do jednego albo odmówimy przeglądu." : "Scope, exclusions, authority and evidence handling are agreed in writing. Delivery timing per signed SOW."}</p></div>
      </div>
    </div></section>
    <section id="enquiry" className={`${heroStyles.section} ${heroStyles.enquiry} ${styles.homeEnquiry}`} aria-labelledby="home-close-heading"><div className={heroStyles.frame}>
      <div><p className={styles.eyebrow}>{pl ? "Zapytaj o przegląd" : "Request the review"}</p><h2 id="home-close-heading">{pl ? "Jakie działanie ma wykonać agent?" : "What consequential action can the agent take?"}</h2><p>{pl ? "Opisz działanie, systemy i termin decyzji. Sprawdzimy, czy przegląd odpowiada Twoim potrzebom. Bez haseł, kluczy API i materiałów produkcyjnych." : "Name the action, systems and decision deadline. Leave out secrets and production evidence."}</p><p className={heroStyles.contactLine}>{pl ? "Lub napisz:" : "Discuss a review:"} <a href={salesReviewMailto()}>{PUBLIC_SALES_REVIEW_EMAIL}</a></p></div>
      <div className={heroStyles.enquiryForm}><ContactForm locale={locale} compact landing /></div>
    </div></section>
  </main>;
}
