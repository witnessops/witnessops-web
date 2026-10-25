import type { Metadata } from "next";
import { WhyWitnessOps } from "@/components/marketing/why-witnessops";
import { languageAlternates } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

const title = "Evidence-Backed Security Reviews | Why WitnessOps";
const description =
  "See how WitnessOps scopes security reviews, traces findings to inspectable evidence, records uncertainty, and gives you a clear next step.";

export const metadata: Metadata = {
  title,
  description,
  alternates: languageAlternates("/why-witnessops", { en: "/why-witnessops", pl: "/pl/why-witnessops" }),
  openGraph: {
    images: DEFAULT_OPEN_GRAPH_IMAGES,
    title,
    description,
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    images: DEFAULT_TWITTER_IMAGES,
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Page() {
  return <WhyWitnessOps locale="en" />;
}
