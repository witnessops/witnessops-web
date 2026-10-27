import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaButton } from "@/components/shared/cta-button";
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
    ["Uzgodnij granicę", "Wskaż istotne działanie, systemy i termin decyzji. Zakres, upoważnienie i obsługę materiałów uzgadniamy przed pracą."],
    ["Odczytaj i zrekonstruuj", "Sprawdź wyzwalacz, tożsamość wykonawczą, uprawnienia, zatwierdzanie i dostępne dowody wykonania. Przegląd nie wykonuje działania."],
    ["Przekaż raport", "Otrzymasz mapę działania, ustalenia powiązane z dowodami, zalecenia według priorytetu, udokumentowane niewiadome, raport pisemny i omówienie."],
  ] : [
    ["Agree the boundary", "Name the consequential action, the systems involved and the decision deadline. Agree scope, authority and evidence handling before work begins."],
    ["Read and reconstruct", "Inspect the trigger, executing identity, permissions, approvals and available execution evidence. The review does not execute the action."],
    ["Deliver the report", "Receive an action map, findings linked to evidence, prioritised recommendations, documented unknowns, a written report and a readout."],
  ];
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="security-verification">
    <section data-ask-trigger-guard data-ui-proof-id="homepage-hero" className={`${styles.heroSection} ${heroStyles.page} ${heroStyles.hero}`}>
      <header className={heroStyles.frame}>
        <div className={heroStyles.heroCopy}>
          <p className={heroStyles.eyebrow}>{hero?.eyebrow ?? (pl ? "Bezpieczeństwo · Weryfikacja · Dowody" : "Security · Verification · Evidence")}</p>
          <h1 data-ui-proof-id="homepage-hero-headline">{title}</h1>
          <p data-ui-proof-id="homepage-hero-body" className={heroStyles.lead}>{body}</p>
          <div className={heroStyles.actions}>
            <Link data-ui-proof-id="homepage-hero-primary-cta" href={agentHref} className={heroStyles.primary}>{text.aiCta}</Link>
            <Link data-ui-proof-id="homepage-sample-review-cta" className={heroStyles.textLink} href={sampleHref}>{pl ? "Zobacz historyczny przykład działania (EN)" : "See a historical action example"}<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <p className={heroStyles.note}>{pl ? "Zacznij od krótkiego opisu. Najpierw niepoufna ocena dopasowania, potem uzgodniony zakres, upoważnienie i obsługa materiałów. Bez sekretów i materiałów produkcyjnych." : "Start with a short description. A non-secret fit check comes first, then agreed scope, authority and evidence handling. No secrets or production evidence."}</p>
        </div>
      </header>
      <div className={styles.frame}>
        <ul className={styles.deliverableStrip} aria-label={pl ? "Zakres przeglądu" : "What the review inspects"}>{(pl ? ["Wyzwalacz", "Tożsamość", "Uprawnienia", "Dowody"] : ["Trigger", "Identity", "Permissions", "Evidence"]).map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>
    <section className={styles.reviewSection} aria-labelledby="home-services-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{text.reviewsEyebrow}</p><h2 id="home-services-heading" className={styles.sectionTitle}>{text.reviewsTitle}</h2><p className={styles.sectionBody}>{text.reviewsBody}</p></div>
      <ul className={`${styles.reviewGrid} ${styles.serviceGrid}`}>{services.map((service) => (
        <li key={service.id} data-home-offer={service.id}><h3>{text.aiHeadline}</h3><p>{service.name[locale]}</p><p className={styles.price}><PriceText text={text.aiPrice} /></p><p>{text.aiWhoFor}</p><p>{text.aiDescription}</p><ul>{text.deliverables.map((item) => <li key={item}>{item}</li>)}</ul><p>{text.aiScopeNote}</p><p className={styles.timing}>{service.timing[locale]}</p><Link className={styles.textLink} href={buyerServiceRequestHref(locale, service)}>{text.aiCta}<ArrowRight size={16} aria-hidden="true" /></Link></li>
      ))}</ul>
      {sovereignAssistantPublished() ? <p className={styles.askEntry}>{pl ? "Nie wiesz, który przegląd pasuje?" : "Not sure which review fits?"} <Link href="/docs/assistant">{pl ? "Zapytaj o zakres (EN)" : "Ask about scope"}<ArrowRight size={16} aria-hidden="true" /></Link></p> : null}
      <Link className={styles.sectionLink} href={pl ? "/pl/reviews" : "/reviews"}>{text.compareCta}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section className={`${styles.reviewSection} ${styles.decisionSection}`} aria-labelledby="home-decision-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Kiedy zacząć" : "When to start"}</p><h2 id="home-decision-heading" className={styles.sectionTitle}>{pl ? "Przed kolejną ważną decyzją." : "Before the next consequential step."}</h2></div>
      <ul className={styles.decisionGrid}>
        <li><h3>{pl ? "Przed uruchomieniem" : "Before launch"}</h3><p>{pl ? "Agent ma wykonać zwrot, zmienić rekord albo nadać dostęp? Najpierw poznaj wyzwalacz, tożsamość wykonawczą, uprawnienia i zatwierdzanie." : "About to let an agent issue a refund, change a record or grant access? Inspect the trigger, executing identity, permissions and approvals first."}</p></li>
        <li><h3>{pl ? "Przed przekazaniem" : "Before handover"}</h3><p>{pl ? "Partner wdrożeniowy przekazuje agenta zespołowi? Ustalenia, niewiadome i zalecenia zostają w raporcie pisemnym." : "Handing an agent to another team? The findings, unknowns and recommendations stay in the written report."}</p></li>
      </ul>
      <p className={styles.sectionBody}>{pl ? "Powiedz, co ma się wydarzyć i do kiedy. Uzgodnimy zakres, cenę i możliwy termin przed rozpoczęciem pracy." : "Tell us what needs to happen and by when. We’ll confirm scope, price and whether we can meet your deadline before work begins."}</p>
      <Link className={styles.sectionLink} href={requestHref}>{text.fitCta}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
    <section id="how-it-works" className={styles.reviewSection} aria-labelledby="home-review-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>{pl ? "Sposób pracy" : "Our approach"}</p><h2 id="home-review-heading" className={styles.sectionTitle}>{pl ? "Od pytania do ustaleń, które możesz sprawdzić." : "From a question to findings you can inspect."}</h2><p className={styles.sectionBody}>{pl ? "Oddzielamy obserwacje od założeń. Pokazujemy, co sprawdzono, co pozostaje nieznane i co warto zrobić dalej." : "We separate observations from assumptions. You can see what was checked, what remains unknown and what to do next."}</p></div>
      <ol className={styles.reviewGrid}>{stages.map(([heading, detail], i) => <li key={heading}><span>{String(i + 1).padStart(2, "0")}</span><h3>{heading}</h3><p>{detail}</p></li>)}</ol>
      <OwnSystemCase locale={locale} />
      <div className={styles.evidenceNote}><p className="wo-h4">{pl ? "Przykład paczki dowodowej" : "Proof bundle example"}</p><Link href={sampleHref}>{pl ? "Zobacz, jak działa paczka dowodowa (EN)" : "See how a proof bundle works"}<ArrowRight size={16} aria-hidden="true" /></Link><p>{pl ? "Przykład syntetyczny: sprawdza opublikowane pliki i zadeklarowaną zmianę. Nie potwierdza rzeczywistej operacji u dostawcy." : "Synthetic example, not customer evidence: checks the published artifacts and declared transition. It does not establish a real provider action."}</p></div>
      <Link className={styles.sectionLink} href={`${prefix}/why-witnessops`}>{pl ? "Zobacz, jak weryfikujemy" : "See how WitnessOps verifies"}<ArrowRight size={16} aria-hidden="true" /></Link>
    </div></section>
      <div className={styles.frame}><section className={styles.closingSection} aria-labelledby="home-close-heading"><div><h2 id="home-close-heading">{pl ? "Jakie działanie ma wykonać agent?" : "What consequential action can the agent take?"}</h2><p>{pl ? "Podaj działanie, systemy i termin decyzji. Najpierw niepoufna ocena dopasowania. Bez haseł, kluczy API i materiałów produkcyjnych." : "Name the action, the systems involved and the decision deadline. A non-secret fit check comes first. Leave out secrets and production evidence."}</p></div><CtaButton href={requestHref} variant="primary" label={text.fitCta} className={styles.closingPrimary} /></section></div>
  </main>;
}
