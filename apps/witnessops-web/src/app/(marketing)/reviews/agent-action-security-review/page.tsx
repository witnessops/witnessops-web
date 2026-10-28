import type { Metadata } from "next";

import { ReviewOffer } from "@/components/marketing/review-offer";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { languageAlternates } from "@/lib/public-seo";
import { pageSocialMetadata } from "@/lib/social-metadata";
import { getServiceLanding } from "@/lib/service-landings";

const landing = getServiceLanding(PUBLIC_AGENT_ACTION_REVIEW_ID, "en");
const description = `${landing.headline} ${PUBLIC_AGENT_ACTION_OFFER.unit.en}. ${PUBLIC_AGENT_ACTION_OFFER.price.en}.`;

export const metadata: Metadata = {
  title: PUBLIC_AGENT_ACTION_OFFER.name.en,
  description,
  alternates: languageAlternates("/reviews/agent-action-security-review", {
    en: "/reviews/agent-action-security-review",
    pl: "/pl/reviews/agent-action-security-review",
  }),
  ...pageSocialMetadata(PUBLIC_AGENT_ACTION_OFFER.name.en, description),
};

export default function AgentActionSecurityReviewPage() {
  return <ReviewOffer locale="en" />;
}
