import Link from "next/link";

import { buyerServiceById, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { getServiceLanding } from "@/lib/service-landings";
import { PriceText } from "@/lib/price-unit";
import { agentActionServiceJsonLd } from "@/lib/public-seo";
import { AgentActionExampleRecord } from "./agent-action-example-record";
import { HOMEPAGE_TWO_OFFER_COPY } from "./homepage-two-offer-copy";
import styles from "./review-offer.module.css";

const COPY = {
  en: {
    all: "The review",
    reviews: "/reviews",
    receive: "You keep the report and the evidence.",
    limits: "What this isn't.",
    start: "We agree the scope first. The findings come with the evidence.",
    agentEyebrow: "AI Agent Security Testing",
    fitNote: "Start with a fit check. Don't send secrets. Scope, authority and evidence handling are agreed before work starts.",
    example: "Inspect an example",
  },
  pl: {
    all: "Wróć do oferty",
    reviews: "/pl/reviews",
    receive: "Zachowujesz raport i dowody.",
    limits: "Czym to nie jest.",
    start: "Jak przebiegają testy",
    agentEyebrow: "Testy bezpieczeństwa agentów AI",
    fitNote: "Opisz działanie bez podawania poufnych informacji. Przed testami uzgodnimy zakres, potrzebne upoważnienia i sposób przekazania dowodów.",
    example: "Przykład i jego ograniczenia",
  },
} as const;

export function ReviewOffer({ locale }: { locale: BuyerLocale }) {
  const copy = COPY[locale];
  const id = PUBLIC_AGENT_ACTION_REVIEW_ID;
  const service = buyerServiceById(id);
  const landing = getServiceLanding(id, locale);
  const current = PUBLIC_AGENT_ACTION_OFFER;
  const requestHref = buyerServiceRequestHref(locale, service);
  return (
    <main id="main-content" tabIndex={-1} className={`buyer-page ${styles.page}`} data-buyer-service-detail={id}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(agentActionServiceJsonLd(locale)) }} />
      <div className={styles.grid}>
        {/* /reviews now redirects here, so the EN page has no back link to it. */}
        {locale === "pl" ? <p className={styles.back} data-offer-back={locale}><Link href={copy.reviews}>{copy.all}</Link></p> : null}
        <header className={`${styles.content} ${styles.intro}`}>
          <p className={styles.eyebrow}>{copy.agentEyebrow}</p>
          <h1>{current.name[locale]}</h1>
          <p className={styles.lead}>
            <span className="sr-only">{landing.headline}</span>
            <span aria-hidden="true" className={styles.punchDesktop}>{landing.headline}</span>
            <span aria-hidden="true" className={styles.punchMobile}>{landing.headlineMobile ?? landing.headline}</span>
          </p>
          {landing.whoForCompact ? (
            <>
              <p className={styles.whoForDesktop}>{landing.whoFor}</p>
              <p className={`${styles.whoForCompact} ${styles.whoForHideNarrow}`}>{landing.whoForCompact}</p>
            </>
          ) : <p>{landing.whoFor}</p>}
          {landing.scopeNoteCompact ? (
            <>
              <p className={styles.scopeDesktop}>{landing.scopeNote}</p>
              <p className={styles.scopeCompact}>{landing.scopeNoteCompact}</p>
            </>
          ) : <p>{landing.scopeNote}</p>}
        </header>
        <aside className={styles.rail} aria-label={locale === "pl" ? "Opłata i zgłoszenie przeglądu" : "Review fee and enquiry"}>
          <p className={styles.price}><PriceText text={current.price[locale]} /></p>
          <p>{current.unit[locale]}</p>
          <p>{current.timing[locale]}</p>
          <Link className={styles.cta} href={requestHref} data-ui-proof-id="offer-in-page-cta">{landing.primaryCta}</Link>
          <p className={styles.fitNote}>{copy.fitNote}</p>
        </aside>
        <div className={`${styles.content} ${styles.details}`}>
          <h2>{copy.receive}</h2>
          <ul>
            {landing.deliverables.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <h2>{copy.limits}</h2>
          <ul>
            {landing.boundaries.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <h2>{copy.start}</h2>
          <ol>
            {landing.steps.map(([title, body]) => <li key={title}><strong>{title}</strong> {body}</li>)}
          </ol>
          <AgentActionExampleRecord locale={locale} headline={HOMEPAGE_TWO_OFFER_COPY[locale].evidenceHeadline} />
          {landing.sampleHref ? <section className={styles.sample}>
            <h2>{copy.example}</h2>
            <Link href={landing.sampleHref}>{landing.sampleLabel}</Link>
          </section> : null}
        </div>
      </div>
    </main>
  );
}
