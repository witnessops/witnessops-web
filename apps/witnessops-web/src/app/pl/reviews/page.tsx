import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { canonicalUrl } from "@/lib/public-seo";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { pageSocialMetadata } from "@/lib/social-metadata";

const description = `${PUBLIC_AGENT_ACTION_OFFER.unit.pl}. ${PUBLIC_AGENT_ACTION_OFFER.price.pl} ${PUBLIC_AGENT_ACTION_OFFER.timing.pl}`;

export const metadata: Metadata = {
  title: PUBLIC_AGENT_ACTION_OFFER.name.pl,
  description,
  // /reviews now redirects to the agent action review, so this page has no EN alternate.
  alternates: { canonical: canonicalUrl("/pl/reviews") },
  ...pageSocialMetadata(PUBLIC_AGENT_ACTION_OFFER.name.pl, description),
};

export default function PolishReviewsPage() {
  return <BuyerCatalogue locale="pl" />;
}
