import type { Metadata } from "next";

import { ReviewOffer } from "@/components/marketing/review-offer";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { PUBLIC_AGENT_ACTION_REVIEW_ID } from "@/lib/public-paid-reviews";
import { languageAlternates } from "@/lib/public-seo";
import { pageSocialMetadata } from "@/lib/social-metadata";
import { getServiceLanding } from "@/lib/service-landings";

const landing = getServiceLanding(PUBLIC_AGENT_ACTION_REVIEW_ID, "pl");

export const metadata: Metadata = {
  title: PUBLIC_AGENT_ACTION_OFFER.name.pl,
  description: landing.headline,
  alternates: languageAlternates("/pl/reviews/agent-action-security-review", {
    en: "/reviews/agent-action-security-review",
    pl: "/pl/reviews/agent-action-security-review",
  }),
  ...pageSocialMetadata(PUBLIC_AGENT_ACTION_OFFER.name.pl, landing.headline),
};

export default function PolishAgentActionSecurityReviewPage() {
  return <ReviewOffer locale="pl" />;
}
