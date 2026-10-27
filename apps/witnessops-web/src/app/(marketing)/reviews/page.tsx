import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: PUBLIC_AGENT_ACTION_OFFER.name.en,
  description: `${PUBLIC_AGENT_ACTION_OFFER.unit.en}. ${PUBLIC_AGENT_ACTION_OFFER.price.en}. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}.`,
  alternates: languageAlternates("/reviews", {
    en: "/reviews",
    pl: "/pl/reviews",
  }),
};

export default function ReviewsIndexPage() {
  return <BuyerCatalogue locale="en" />;
}
