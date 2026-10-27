import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Agent Action Security Review",
  description:
    "Jedno istotne działanie agenta lub automatyzacji. Zakres, wyniki i cena przed rozpoczęciem pracy.",
  alternates: languageAlternates("/pl/reviews", {
    en: "/reviews",
    pl: "/pl/reviews",
  }),
};

export default function PolishReviewsPage() {
  return <BuyerCatalogue locale="pl" />;
}
