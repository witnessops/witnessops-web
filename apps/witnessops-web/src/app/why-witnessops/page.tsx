import type { Metadata } from "next";
import { WhyWitnessOps } from "@/components/marketing/why-witnessops";
import { languageAlternates } from "@/lib/public-seo";

const title = "Evidence-Backed Security Reviews | Why WitnessOps";
const description =
  "See how WitnessOps scopes security reviews, traces findings to inspectable evidence, records uncertainty, and gives you a clear next step.";

export const metadata: Metadata = {
  title,
  description,
  alternates: languageAlternates("/why-witnessops", {
    en: "/why-witnessops",
    pl: "/pl/why-witnessops",
  }),
  openGraph: {
    title,
    description,
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Page() {
  return <WhyWitnessOps locale="en" />;
}
