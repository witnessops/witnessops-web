import type { Metadata } from "next";
import Link from "next/link";

import { buyerServiceById, buyerServiceRequestHref } from "@/lib/buyer-services";
import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { languageAlternates } from "@/lib/public-seo";
import { getServiceLanding } from "@/lib/service-landings";

const service = buyerServiceById(PUBLIC_AGENT_ACTION_REVIEW_ID);
const landing = getServiceLanding(PUBLIC_AGENT_ACTION_REVIEW_ID, "pl");

export const metadata: Metadata = {
  title: PUBLIC_AGENT_ACTION_OFFER.name.pl,
  description: landing.headline,
  alternates: languageAlternates("/pl/reviews/agent-action-security-review", {
    en: "/reviews/agent-action-security-review",
    pl: "/pl/reviews/agent-action-security-review",
  }),
};

function visibleBoundary(item: string): boolean {
  return !/cena stała|stała cena|€2 500 stała/i.test(item);
}

export default function PolishAgentActionSecurityReviewPage() {
  const requestHref = buyerServiceRequestHref("pl", service);
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link href="/pl/reviews" className="inline-flex min-h-11 items-center text-sm text-text-secondary underline-offset-4 hover:underline">
          Wszystkie przeglądy
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">Jedno działanie agenta</p>
        <h1 className="mt-3 max-w-3xl text-4xl text-text-primary" style={{ fontFamily: "var(--font-sans)", fontWeight: 300 }}>
          {PUBLIC_AGENT_ACTION_OFFER.name.pl}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-text-secondary">{landing.headline}</p>
        <p className="mt-3 max-w-3xl text-text-secondary">{landing.whoFor}</p>
        <p className="mt-6 text-2xl text-text-primary">{PUBLIC_AGENT_ACTION_OFFER.price.pl}</p>
        <p className="mt-2 text-sm text-text-muted">{PUBLIC_AGENT_ACTION_OFFER.timing.pl}</p>
        <p className="mt-4 max-w-3xl text-sm text-text-secondary">{landing.scopeNote}</p>
        <Link href={requestHref} className="mt-6 inline-flex min-h-11 items-center bg-text-primary px-5 text-sm font-medium text-text-inverse">
          {landing.primaryCta}
        </Link>
        <h2 className="mt-12 text-2xl text-text-primary" style={{ fontFamily: "var(--font-sans)", fontWeight: 300 }}>Co otrzymasz</h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-text-secondary">
          {landing.deliverables.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <h2 className="mt-10 text-2xl text-text-primary" style={{ fontFamily: "var(--font-sans)", fontWeight: 300 }}>Zakres i ograniczenia</h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-text-secondary">
          {landing.boundaries.filter(visibleBoundary).map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-8 text-sm text-text-muted">
          <Link href="/pl/reviews/external-attack-surface-review" className="underline-offset-4 hover:underline">
            External Attack Surface Review · {EXTERNAL_ATTACK_SURFACE_OFFER.price.pl}
          </Link>
        </p>
      </div>
    </main>
  );
}
