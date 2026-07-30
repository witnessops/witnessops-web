import type { Metadata } from "next";

import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";

export const metadata: Metadata = {
  title: "Usługi bezpieczeństwa i przeglądy operacyjne",
  description:
    "Wybierz jeden z jasno określonych przeglądów WitnessOps według sytuacji, rezultatu, ceny i terminu.",
  alternates: {
    canonical: "/pl/catalog",
    languages: { en: "/catalog", pl: "/pl/catalog", "x-default": "/catalog" },
  },
};

export default function PolishCatalogPage() {
  return <BuyerCatalogue locale="pl" />;
}
