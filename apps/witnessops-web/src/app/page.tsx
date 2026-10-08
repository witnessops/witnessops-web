import type { Metadata } from "next";
import { SimpleHomepage } from "@/components/marketing/simple-homepage";
import { loadHomeContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { languageAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";

const baseMetadata = buildMetadata(loadHomeContent().seo);
const title = "AI Agent and External Attack Surface Reviews";
const description = "Focused security reviews for AI agents and internet-facing systems. Written findings, inspectable evidence and practical priorities. Scope before work.";

export const metadata: Metadata = {
  ...baseMetadata,
  title,
  description,
  alternates: languageAlternates("/", { en: "/", pl: "/pl" }),
  openGraph: { ...baseMetadata.openGraph, title: `${title} | WitnessOps`, description, siteName: "WitnessOps", type: "website" },
  twitter: { ...baseMetadata.twitter, card: "summary_large_image", title: `${title} | WitnessOps`, description },
};

export default function HomePage() {
  return <>
    <JsonLd id="witnessops-organization" value={organizationJsonLd} />
    <JsonLd id="witnessops-website" value={websiteJsonLd} />
    <SimpleHomepage locale="en" />
  </>;
}
