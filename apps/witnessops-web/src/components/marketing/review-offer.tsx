import Link from "next/link";

import { buyerServiceById, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { getServiceLanding } from "@/lib/service-landings";
import { PriceText } from "@/lib/price-unit";
import { agentActionServiceJsonLd } from "@/lib/public-seo";
import styles from "./review-offer.module.css";

const COPY = {
  en: {
    all: "The review",
    reviews: "/reviews",
    receive: "What you receive",
    limits: "Scope and limits",
    start: "How to start",
    agentEyebrow: "Review one agent action",
    fitNote: "Start with a non-secret fit check. Scope, authority and evidence handling are agreed before work starts.",
    example: "Inspect an example",
  },
  pl: {
    all: "Przegląd",
    reviews: "/pl/reviews",
    receive: "Co otrzymasz",
    limits: "Zakres i ograniczenia",
    start: "Jak zacząć",
    agentEyebrow: "Jedno działanie agenta",
    fitNote: "Zacznij od niepoufnej oceny dopasowania. Zakres, upoważnienie i zasady obsługi dowodów uzgadniamy przed pracą.",
    example: "Zobacz przykład",
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
        <p className={styles.back}><Link href={copy.reviews}>{copy.all}</Link></p>
        <header className={`${styles.content} ${styles.intro}`}>
          <p className={styles.eyebrow}>{copy.agentEyebrow}</p>
          <h1>{current.name[locale]}</h1>
          <p className={styles.lead}>{landing.headline}</p>
          <p>{landing.whoFor}</p>
          <p>{landing.scopeNote}</p>
        </header>
        <aside className={styles.rail} aria-label={locale === "pl" ? "Cena i zgłoszenie przeglądu" : "Review price and enquiry"}>
          <p className={styles.price}><PriceText text={current.price[locale]} /></p>
          <p>{current.timing[locale]}</p>
          <Link className={styles.cta} href={requestHref}>{landing.primaryCta}</Link>
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
          {landing.sampleHref ? <section className={styles.sample}>
            <h2>{copy.example}</h2>
            <Link href={landing.sampleHref}>{landing.sampleLabel}</Link>
          </section> : null}
        </div>
      </div>
    </main>
  );
}
