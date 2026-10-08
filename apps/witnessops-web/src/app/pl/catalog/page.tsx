import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Przeglądy agenta AI i ekspozycji zewnętrznej",
  description:
    "Porównaj przegląd narzędzi i dostępu agenta AI oraz External Attack Surface Review. Poznaj zakres, materiały, cenę i warunki rozpoczęcia.",
  alternates: languageAlternates("/pl/catalog", {
    en: "/catalog",
    pl: "/pl/catalog",
  }),
};

export default function PolishCatalogPage() {
  return <BuyerCatalogue locale="pl" />;
}
