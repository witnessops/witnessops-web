import type { Metadata } from "next";
import { SimpleHomepage } from "@/components/marketing/simple-homepage";
import { JsonLd } from "@/components/seo/json-ld";
import { languageAlternates, organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";

const title = "Przeglądy agenta AI i ekspozycji zewnętrznej";
const description = "Przeglądy bezpieczeństwa agentów AI i systemów dostępnych z internetu. Pisemne ustalenia, materiały do sprawdzenia i priorytety. Najpierw uzgodniony zakres.";

export const metadata: Metadata = {
  title,
  description,
  alternates: languageAlternates("/pl", { en: "/", pl: "/pl" }),
  openGraph: { title: `${title} | WitnessOps`, description, siteName: "WitnessOps", type: "website" },
  twitter: { card: "summary_large_image", title: `${title} | WitnessOps`, description },
};

export default function PolishHomePage() {
  return <>
    <JsonLd id="witnessops-organization" value={organizationJsonLd} />
    <JsonLd id="witnessops-website" value={websiteJsonLd} />
    <SimpleHomepage locale="pl" />
  </>;
}
