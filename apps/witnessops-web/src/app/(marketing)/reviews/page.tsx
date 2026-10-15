import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Reviews",
  description:
    "Compare the Agent Action Security Review and External Attack Surface Review. Scope, evidence and prices before work begins.",
  alternates: languageAlternates("/reviews", {
    en: "/reviews",
    pl: "/pl/reviews",
  }),
};

export default function ReviewsIndexPage() {
  return <BuyerCatalogue locale="en" />;
}
