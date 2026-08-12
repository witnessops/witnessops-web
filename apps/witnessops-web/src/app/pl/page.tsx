import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";

export const metadata: Metadata = {
  title: "Ocena ekspozycji zewnętrznej | WitnessOps",
  description:
    "Zobacz, co widzi internet. Płatny pilotaż dla jednej publicznej domeny lub aplikacji, dostarczony w ciągu trzech dni roboczych za €1 500.",
  alternates: {
    canonical: "/pl",
    languages: { en: "/", pl: "/pl", "x-default": "/" },
  },
};

export default function PolishHomePage() {
  return <BuyerHomepage locale="pl" />;
}
