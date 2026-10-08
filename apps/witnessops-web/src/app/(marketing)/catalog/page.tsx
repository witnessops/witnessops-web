import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "AI Agent and External Attack Surface Reviews",
  description:
    "Compare the AI Agent Tools & Access Review and External Attack Surface Review. Scope, evidence, prices and start conditions before work begins.",
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
