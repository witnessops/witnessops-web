import type { Metadata } from "next";

import { SimpleHomepage } from "@/components/marketing/simple-homepage";
import { languageAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";
import { JsonLd } from "@/components/seo/json-ld";

const homeTitle = "Red teaming agentów AI i testy bezpieczeństwa";
const homeDescription = "Niezależne testy bezpieczeństwa agentów AI przed wdrożeniem. Sprawdzamy uprawnienia, zatwierdzanie i wpływ poleceń na jedno działanie w jednym procesie. €2 500 bez VAT.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: languageAlternates("/pl", { en: "/", pl: "/pl" }),
  openGraph: {
    title: `${homeTitle} | WitnessOps`,
    description: homeDescription,
    siteName: "WitnessOps",
    type: "website",
    images: DEFAULT_OPEN_GRAPH_IMAGES,
  },
  twitter: {
    card: "summary_large_image",
    title: `${homeTitle} | WitnessOps`,
    description: homeDescription,
    images: DEFAULT_TWITTER_IMAGES,
  },
};

export default function PolishHomePage() {
  return (
    <>
      <JsonLd id="witnessops-organization" value={organizationJsonLd} />
      <JsonLd id="witnessops-website" value={websiteJsonLd} />
      <SimpleHomepage locale="pl" />
    </>
  );
}
