import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { languageAlternates } from "@/lib/public-seo";
import { pageSocialMetadata } from "@/lib/social-metadata";

const description = `${PUBLIC_AGENT_ACTION_OFFER.unit.en}. ${PUBLIC_AGENT_ACTION_OFFER.price.en}. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}.`;

export const metadata: Metadata = {
  title: PUBLIC_AGENT_ACTION_OFFER.name.en,
  description,
  alternates: languageAlternates("/reviews", {
    en: "/reviews",
    pl: "/pl/reviews",
  }),
  ...pageSocialMetadata(PUBLIC_AGENT_ACTION_OFFER.name.en, description),
};

export default function ReviewsIndexPage() {
  return <BuyerCatalogue locale="en" />;
}
