import type { Metadata } from "next";
import Link from "next/link";

import { buyerServiceById, buyerServiceRequestHref } from "@/lib/buyer-services";
import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { languageAlternates } from "@/lib/public-seo";
import { getServiceLanding } from "@/lib/service-landings";

const service = buyerServiceById(PUBLIC_AGENT_ACTION_REVIEW_ID);
const landing = getServiceLanding(PUBLIC_AGENT_ACTION_REVIEW_ID, "en");

export const metadata: Metadata = {
  title: PUBLIC_AGENT_ACTION_OFFER.name.en,
  description: landing.headline,
  alternates: languageAlternates("/reviews/agent-action-security-review", {
    en: "/reviews/agent-action-security-review",
    pl: "/pl/reviews/agent-action-security-review",
  }),
};

function visibleBoundary(item: string): boolean {
  return !/fixed|retention|residen|data location|deleted as soon/i.test(item);
}

export default function AgentActionSecurityReviewPage() {
  const requestHref = buyerServiceRequestHref("en", service);
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link href="/reviews" className="inline-flex min-h-11 items-center text-sm text-text-secondary underline-offset-4 hover:underline">
          All reviews
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">Review one agent action</p>
        <h1 className="mt-3 max-w-3xl text-4xl text-text-primary" style={{ fontFamily: "var(--font-display)", fontWeight: 300 }}>
          {PUBLIC_AGENT_ACTION_OFFER.name.en}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-text-secondary">{landing.headline}</p>
        <p className="mt-3 max-w-3xl text-text-secondary">{landing.whoFor}</p>
        <p className="mt-6 text-2xl text-text-primary">{PUBLIC_AGENT_ACTION_OFFER.price.en}</p>
        <p className="mt-2 text-sm text-text-muted">{PUBLIC_AGENT_ACTION_OFFER.timing.en}</p>
        <p className="mt-4 max-w-3xl text-sm text-text-secondary">{landing.scopeNote}</p>
        <Link href={requestHref} className="mt-6 inline-flex min-h-11 items-center bg-text-primary px-5 text-sm font-medium text-text-inverse">
          {landing.primaryCta}
        </Link>
        <h2 className="mt-12 text-2xl text-text-primary" style={{ fontFamily: "var(--font-display)", fontWeight: 300 }}>What you receive</h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-text-secondary">
          {landing.deliverables.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <h2 className="mt-10 text-2xl text-text-primary" style={{ fontFamily: "var(--font-display)", fontWeight: 300 }}>Scope and limits</h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-text-secondary">
          {landing.boundaries.filter(visibleBoundary).map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-8 text-sm text-text-muted">
          <Link href="/reviews/external-attack-surface-review" className="underline-offset-4 hover:underline">External Attack Surface Review · {EXTERNAL_ATTACK_SURFACE_OFFER.price.en}</Link>
        </p>
      </div>
    </main>
  );
}
