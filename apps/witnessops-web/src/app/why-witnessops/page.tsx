import type { Metadata } from "next";
import { WhyWitnessOps } from "@/components/marketing/why-witnessops";
import { languageAlternates } from "@/lib/public-seo";

const description = "Security and verification for AI agents and automation. Explore the approach, evidence supporting findings and limits of a scoped review.";
export const metadata: Metadata = {
  title: "Why WitnessOps", description,
  alternates: languageAlternates("/why-witnessops", { en: "/why-witnessops", pl: "/pl/why-witnessops" }),
  openGraph: { title: "Why WitnessOps | WitnessOps", description, siteName: "WitnessOps", type: "website" },
  twitter: { card: "summary_large_image", title: "Why WitnessOps | WitnessOps", description },
};
export default function Page() { return <WhyWitnessOps locale="en" />; }
