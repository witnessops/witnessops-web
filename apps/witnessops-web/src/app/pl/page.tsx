import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";

export const metadata: Metadata = {
  title: "Public Exposure Review",
  description:
    "Ręczny, ograniczony zakresem przegląd bezpieczeństwa jednego autoryzowanego systemu publicznie dostępnego, dostarczony w ciągu trzech dni roboczych za €1 900 netto.",
  alternates: {
    canonical: "/pl",
    languages: { en: "/", pl: "/pl", "x-default": "/" },
  },
};

export default function PolishHomePage() {
  return <BuyerHomepage locale="pl" />;
}
