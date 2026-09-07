import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { JsonLd } from "@/components/seo/json-ld";
const homeTitle = "Bezpieczeństwo i weryfikacja";
const homeDescription = "Znajdź luki w bezpieczeństwie AI i automatyzacji. Sprawdź jedno ważne działanie, poznaj źródła ustaleń i zalecane kolejne kroki.";
import { languageAlternates } from "@/lib/public-seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: languageAlternates("/pl", { en: "/", pl: "/pl" }),
  openGraph: {
    title: `${homeTitle} | WitnessOps`,
    description: homeDescription,
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${homeTitle} | WitnessOps`,
    description: homeDescription,
  },
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
