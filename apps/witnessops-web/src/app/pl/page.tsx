import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { JsonLd } from "@/components/seo/json-ld";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import { languageAlternates } from "@/lib/public-seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: PRIMARY_OFFER.name.pl,
  description: `${PRIMARY_OFFER.name.pl}: ${PRIMARY_OFFER.unit.pl.toLowerCase()}, ${PRIMARY_OFFER.price.pl.toLowerCase()}, ${PRIMARY_OFFER.fitCheck.pl.toLowerCase()}, dostawa ${PRIMARY_OFFER.timing.pl.toLowerCase()}.`,
  alternates: languageAlternates("/pl", { en: "/", pl: "/pl" }),
  openGraph: {
    title: `${PRIMARY_OFFER.name.pl} | WitnessOps`,
    description: PRIMARY_OFFER.situation.pl,
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${PRIMARY_OFFER.name.pl} | WitnessOps`,
    description: PRIMARY_OFFER.situation.pl,
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
