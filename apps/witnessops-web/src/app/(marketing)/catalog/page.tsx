import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Agent Action Security Review",
  description:
    "One consequential agent or automation action. Scope, deliverables and price before work begins.",
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
