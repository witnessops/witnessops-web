import Link from "next/link";

import { buyerServiceById, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { getServiceLanding } from "@/lib/service-landings";
import { PriceText } from "@/lib/price-unit";
import { InlineArrow } from "./inline-arrow";
import styles from "./review-offer.module.css";

const REVIEW_PATH = {
  agent: {
    en: "/reviews/agent-action-security-review",
    pl: "/pl/reviews/agent-action-security-review",
  },
  external: {
    en: "/reviews/external-attack-surface-review",
    pl: "/pl/reviews/external-attack-surface-review",
  },
} as const;

const COPY = {
  en: {
    all: "All reviews",
    reviews: "/reviews",
    receive: "What you receive",
    limits: "Scope and limits",
    start: "How to start",
    agentEyebrow: "Review one agent action",
    externalEyebrow: "Review external exposure",
    otherReview: "Other review",
  },
  pl: {
    all: "Wszystkie przeglądy",
    reviews: "/pl/reviews",
    receive: "Co otrzymasz",
    limits: "Zakres i ograniczenia",
    start: "Jak zacząć",
    agentEyebrow: "Jedno działanie agenta",
    externalEyebrow: "Ekspozycja zewnętrzna",
    otherReview: "Inny przegląd",
  },
} as const;

function visibleBoundary(item: string, locale: BuyerLocale): boolean {
  if (locale === "pl") return !/cena stała|stała cena|€2 500 stała/i.test(item);
  return !/fixed|retention|residen|data location|deleted as soon/i.test(item);
}

export function ReviewOffer({ locale, offer }: { locale: BuyerLocale; offer: "agent" | "external" }) {
  const copy = COPY[locale];
  const id = offer === "agent" ? PUBLIC_AGENT_ACTION_REVIEW_ID : "external-exposure-assessment";
  const service = buyerServiceById(id);
  const landing = getServiceLanding(id, locale);
  const current = offer === "agent" ? PUBLIC_AGENT_ACTION_OFFER : EXTERNAL_ATTACK_SURFACE_OFFER;
  const other = offer === "agent" ? EXTERNAL_ATTACK_SURFACE_OFFER : PUBLIC_AGENT_ACTION_OFFER;
  const requestHref = buyerServiceRequestHref(locale, service);
  return (
    <main id="main-content" tabIndex={-1} className={`buyer-page ${styles.page}`}>
      <div className={styles.grid}>
        <p className={styles.back}><Link href={copy.reviews}>{copy.all}</Link></p>
        <div className={styles.content}>
          <p className={styles.eyebrow}>{offer === "agent" ? copy.agentEyebrow : copy.externalEyebrow}</p>
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
          <div className={styles.cross}>
            <p className={styles.eyebrow}>{copy.otherReview}</p>
            <p className={styles.crosslead}>
              <Link href={REVIEW_PATH[offer === "agent" ? "external" : "agent"][locale]}>
                {other.name[locale]} · <PriceText text={other.price[locale]} /> <InlineArrow />
              </Link>
            </p>
          </div>
        </div>
        <aside className={styles.rail}>
          <p className={styles.price}><PriceText text={current.price[locale]} /></p>
          <p>{current.timing[locale]}</p>
          <Link className={styles.cta} href={requestHref}>{landing.primaryCta}</Link>
        </aside>
      </div>
    </main>
  );
}
