import type { Metadata } from "next";
import { MediaKitContent } from "@/components/marketing/media-kit-content";
import { canonicalUrl, languageAlternates } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

export const metadata: Metadata = {
  title: "Media kit",
  description:
    "Canonical WitnessOps Logo System v1, integrity metadata, public brand guidance, product screenshots and company description.",
  alternates: languageAlternates("/media-kit", {
    en: "/media-kit",
    pl: "/pl/media-kit",
  }),
  openGraph: {
    images: DEFAULT_OPEN_GRAPH_IMAGES,
    title: "Media kit | WitnessOps",
    description:
      "Canonical WitnessOps Logo System v1, integrity metadata, public brand guidance, product screenshots and company description.",
    siteName: "WitnessOps",
    type: "website",
    url: canonicalUrl("/media-kit"),
  },
  twitter: {
    images: DEFAULT_TWITTER_IMAGES,
    card: "summary_large_image",
    title: "Media kit | WitnessOps",
    description:
      "Canonical WitnessOps Logo System v1, integrity metadata, public brand guidance, product screenshots and company description.",
  },
};

export default function MediaKitPage() {
  return <MediaKitContent locale="en" />;
}
