import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Security Reviews, Verification and Workflow Repair",
  description:
    "Review one AI action, examine one system or restore a workflow. Compare the scope, deliverables and prices of WitnessOps services.",
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
