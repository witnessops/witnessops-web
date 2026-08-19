import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { JsonLd } from "@/components/seo/json-ld";
import { languageAlternates } from "@/lib/public-seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Public Exposure Review",
  description:
    "Ręczny, ograniczony zakresem przegląd bezpieczeństwa jednego autoryzowanego systemu publicznie dostępnego, dostarczony w ciągu 24 godzin po spełnieniu zaakceptowanych warunków startu za €1 900 netto.",
  alternates: languageAlternates("/pl", { en: "/", pl: "/pl" }),
};

export default function PolishHomePage() {
  return (
    <>
      <JsonLd id="witnessops-organization" value={organizationJsonLd} />
      <JsonLd id="witnessops-website" value={websiteJsonLd} />
      <BuyerHomepage locale="pl" />
    </>
  );
}
