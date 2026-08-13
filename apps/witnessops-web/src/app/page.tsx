import type { Metadata } from "next";
import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { loadHomeContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";

const home = loadHomeContent();

export const metadata: Metadata = buildMetadata(home.seo);

export default function HomePage() {
  return (
    <>
      <JsonLd id="witnessops-organization" value={organizationJsonLd} />
      <JsonLd id="witnessops-website" value={websiteJsonLd} />
      <BuyerHomepage
        locale="en"
        hero={{
          eyebrow: home.hero.eyebrow,
          title: home.hero.title,
          body: home.hero.body,
        }}
      />
    </>
  );
}
