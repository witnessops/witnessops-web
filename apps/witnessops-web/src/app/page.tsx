import type { Metadata } from "next";
import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { loadHomeContent } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";

const home = loadHomeContent();

export const metadata: Metadata = buildMetadata(home.seo);

export default function HomePage() {
  return (
    <BuyerHomepage
      locale="en"
      hero={{
        eyebrow: home.hero.eyebrow,
        title: home.hero.title,
        body: home.hero.body,
      }}
    />
  );
}
