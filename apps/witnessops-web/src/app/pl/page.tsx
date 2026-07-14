import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";

export const metadata: Metadata = {
  title: "WitnessOps — przeglądy bezpieczeństwa i działania operacyjnego",
  description:
    "Wybierz jedną z sześciu usług WitnessOps. Najpierw potwierdzamy dopasowanie, zakres, cenę, termin i sposób postępowania z materiałem.",
  alternates: {
    canonical: "/pl",
    languages: { en: "/", pl: "/pl", "x-default": "/" },
  },
};

export default function PolishHomePage() {
  return <BuyerHomepage locale="pl" />;
}
