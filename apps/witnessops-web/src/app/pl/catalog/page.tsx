import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Przeglądy Agent Action i ekspozycji zewnętrznej",
  description:
    "Porównaj Agent Action Security Review oraz External Attack Surface Review. Poznaj zakres, materiały, cenę i warunki rozpoczęcia.",
  alternates: languageAlternates("/pl/catalog", {
    en: "/catalog",
    pl: "/pl/catalog",
  }),
};

export default function PolishCatalogPage() {
  return <BuyerCatalogue locale="pl" />;
}
