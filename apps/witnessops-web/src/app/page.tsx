import type { Metadata } from "next";
import { SimpleHomepage } from "@/components/marketing/simple-homepage";
import { loadHomeContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { homepageReviewsJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";
import { AskSovereignWidget } from "@/components/ask-sovereign/ask-sovereign-widget";

const home = loadHomeContent();

export const metadata: Metadata = buildMetadata(home.seo);

export default function HomePage() {
  return (
    <>
      <JsonLd id="witnessops-organization" value={organizationJsonLd} />
      <JsonLd id="witnessops-website" value={websiteJsonLd} />
      <JsonLd id="witnessops-reviews" value={homepageReviewsJsonLd()} />
      <SimpleHomepage />
      <AskSovereignWidget />
    </>
  );
}
