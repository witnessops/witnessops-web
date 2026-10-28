import Link from "next/link";

import { buyerServiceById, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { getServiceLanding } from "@/lib/service-landings";
import { PriceText } from "@/lib/price-unit";
import styles from "./review-offer.module.css";

const COPY = {
  en: {
    receive: "What you receive",
    limits: "Scope and limits",
    start: "How to start",
    agentEyebrow: "Review one agent action",
  },
  pl: {
    receive: "Co otrzymasz",
    limits: "Zakres i ograniczenia",
    start: "Jak zacząć",
    agentEyebrow: "Jedno działanie agenta",
  },
} as const;

function visibleBoundary(item: string, locale: BuyerLocale): boolean {
  if (locale === "pl") return !/cena stała|stała cena|€2 500 stała/i.test(item);
  return !/fixed|retention|residen|data location|deleted as soon/i.test(item);
}

export function ReviewOffer({ locale }: { locale: BuyerLocale }) {
  const copy = COPY[locale];
  const id = PUBLIC_AGENT_ACTION_REVIEW_ID;
  const service = buyerServiceById(id);
  const landing = getServiceLanding(id, locale);
  const current = PUBLIC_AGENT_ACTION_OFFER;
  const requestHref = buyerServiceRequestHref(locale, service);
  return (
    <main id="main-content" tabIndex={-1} className={`buyer-page ${styles.page}`}>
      <div className={styles.grid}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>{copy.agentEyebrow}</p>
          <h1>{current.name[locale]}</h1>
          <p className={styles.lead}>{landing.headline}</p>
          <p>{landing.whoFor}</p>
          <p>{landing.scopeNote}</p>
          <h2>{copy.receive}</h2>
          <ul>
            {landing.deliverables.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <h2>{copy.limits}</h2>
          <ul>
            {landing.boundaries.filter((item) => visibleBoundary(item, locale)).map((item) => <li key={item}>{item}</li>)}
          </ul>
          <h2>{copy.start}</h2>
          <ol>
            {landing.steps.map(([title, body]) => <li key={title}><strong>{title}</strong> {body}</li>)}
          </ol>
        </div>
        <aside className={`${styles.rail} crop`}>
          <p className={styles.price}><PriceText text={current.price[locale]} /></p>
          <p>{current.timing[locale]}</p>
          <Link className={styles.cta} href={requestHref}>{landing.primaryCta}</Link>
        </aside>
      </div>
    </main>
  );
}
