import type { Metadata } from "next";
import { WhyWitnessOps } from "@/components/marketing/why-witnessops";
import { languageAlternates } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

const description = "Dowiedz się, jak WitnessOps analizuje działanie agenta AI lub automatyzacji, jakie materiały wspierają ustalenia i gdzie kończy się zakres przeglądu.";
export const metadata: Metadata = {
  title: "Dlaczego WitnessOps", description,
  alternates: languageAlternates("/pl/why-witnessops", { en: "/why-witnessops", pl: "/pl/why-witnessops" }),
  openGraph: {
  images: DEFAULT_OPEN_GRAPH_IMAGES, title: "Dlaczego WitnessOps | WitnessOps", description, siteName: "WitnessOps", type: "website" },
  twitter: {
  images: DEFAULT_TWITTER_IMAGES, card: "summary_large_image", title: "Dlaczego WitnessOps | WitnessOps", description },
};
export default function Page() { return <WhyWitnessOps locale="pl" />; }
