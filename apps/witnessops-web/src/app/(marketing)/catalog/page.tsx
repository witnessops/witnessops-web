import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Security and Operational Review Services",
  description:
    "Choose a bounded WitnessOps review by situation, result, price and timing. Non-secret fit check first; no compliance certification claims.",
  alternates: languageAlternates("/catalog", {
    en: "/catalog",
    pl: "/pl/catalog",
  }),
};

export default function CatalogIndexPage() {
  return (
    <>
      {/* Claim-boundary: non-secret fit check + no compliance certification */}
      <BuyerCatalogue locale="en" />
    </>
  );
}
