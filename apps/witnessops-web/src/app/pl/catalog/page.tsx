import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Usługi bezpieczeństwa i przeglądy operacyjne",
  description:
    "Wybierz jeden z jasno określonych przeglądów WitnessOps według sytuacji, rezultatu, ceny i terminu.",
  alternates: languageAlternates("/pl/catalog", {
    en: "/catalog",
    pl: "/pl/catalog",
  }),
};

export default function PolishCatalogPage() {
  return <BuyerCatalogue locale="pl" />;
}
