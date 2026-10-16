import type { Metadata } from "next";

import { MediaKitContent } from "@/components/marketing/media-kit-content";
import { languageAlternates } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES } from "@/lib/social-metadata";

const description =
  "Kanoniczny WitnessOps Logo System v1, sumy kontrolne, zasady marki, zrzuty produktu i opis spółki.";

export const metadata: Metadata = {
  title: "Zestaw dla mediów",
  description,
  alternates: languageAlternates("/pl/media-kit", {
    en: "/media-kit",
    pl: "/pl/media-kit",
  }),
  openGraph: {
    images: DEFAULT_OPEN_GRAPH_IMAGES,
    title: "Zestaw dla mediów | WitnessOps",
    description,
    siteName: "WitnessOps",
    type: "website",
    url: "https://witnessops.com/pl/media-kit",
  },
};

export default function PolishMediaKitPage() {
  return <MediaKitContent locale="pl" />;
}
