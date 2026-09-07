import type { Metadata } from "next";
import { WhyWitnessOps } from "@/components/marketing/why-witnessops";
import { languageAlternates } from "@/lib/public-seo";

const description = "Bezpieczeństwo i weryfikacja agentów AI oraz automatyzacji. Poznaj sposób pracy, materiały wspierające ustalenia i ograniczenia przeglądu.";
export const metadata: Metadata = {
  title: "Dlaczego WitnessOps", description,
  alternates: languageAlternates("/pl/why-witnessops", { en: "/why-witnessops", pl: "/pl/why-witnessops" }),
  openGraph: { title: "Dlaczego WitnessOps | WitnessOps", description, siteName: "WitnessOps", type: "website" },
  twitter: { card: "summary_large_image", title: "Dlaczego WitnessOps | WitnessOps", description },
};
export default function Page() { return <WhyWitnessOps locale="pl" />; }
