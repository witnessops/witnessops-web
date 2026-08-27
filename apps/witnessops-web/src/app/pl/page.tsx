import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { JsonLd } from "@/components/seo/json-ld";
import { languageAlternates } from "@/lib/public-seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Infrastruktura dowodowa dla operacji agentowych",
  description:
    "Sprawdź agenta przed wykonaniem, zachowaj upoważnienie i materiały podczas działania, a potem przygotuj ograniczony zapis możliwy do przeglądu.",
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
