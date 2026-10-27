import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { HOMEPAGE_TWO_OFFER_COPY } from "@/components/marketing/homepage-two-offer-copy";
import { languageAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";
import { JsonLd } from "@/components/seo/json-ld";

const homeTitle = "Bezpieczeństwo i weryfikacja";
const homeDescription = `${HOMEPAGE_TWO_OFFER_COPY.pl.headline} ${HOMEPAGE_TWO_OFFER_COPY.pl.support}`;

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
      <BuyerHomepage locale="pl" />
    </>
  );
}
