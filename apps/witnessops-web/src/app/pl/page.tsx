import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";

export const metadata: Metadata = {
  title: "Przegląd publicznej ekspozycji | WitnessOps",
  description:
    "Sprawdź, co ujawnia jedna autoryzowana domena publiczna. Ręcznie zweryfikowane ustalenia z materiałami w ciągu trzech dni roboczych za €1 900 bez VAT.",
  alternates: {
    canonical: "/pl",
    languages: { en: "/", pl: "/pl", "x-default": "/" },
  },
};

export default function PolishHomePage() {
  return <BuyerHomepage locale="pl" />;
}
