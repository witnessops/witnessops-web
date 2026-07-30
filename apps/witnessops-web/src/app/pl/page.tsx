import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";

export const metadata: Metadata = {
  title: "Przeglądy bezpieczeństwa i operacji | WitnessOps",
  description:
    "Powiedz nam, co trzeba odblokować. Przed rozpoczęciem pracy uzgadniamy sytuację, zakres, wynik, cenę, termin i sposób postępowania z materiałami.",
  alternates: {
    canonical: "/pl",
    languages: { en: "/", pl: "/pl", "x-default": "/" },
  },
};

export default function PolishHomePage() {
  return <BuyerHomepage locale="pl" />;
}
