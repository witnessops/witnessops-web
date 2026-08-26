import type { Metadata } from "next";

import { BuyerHomepage } from "@/components/marketing/buyer-homepage";
import { JsonLd } from "@/components/seo/json-ld";
import { languageAlternates } from "@/lib/public-seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Podpisane zapisy działań agentów AI",
  description:
    "Agents act. WitnessOps proves. Podpisane potwierdzenia i zewnętrzna weryfikacja istotnych działań agentów AI.",
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
