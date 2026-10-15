import type { Metadata } from "next";

import MediaKitPage from "../../media-kit/page";
import { languageAlternates } from "@/lib/public-seo";

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
    title: "Zestaw dla mediów | WitnessOps",
    description,
    siteName: "WitnessOps",
    type: "website",
    url: "https://witnessops.com/pl/media-kit",
  },
};

export default function PolishMediaKitPage() {
  return <MediaKitPage locale="pl" />;
}
