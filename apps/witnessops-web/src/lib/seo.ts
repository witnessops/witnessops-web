import type { Metadata } from "next";
import { canonicalUrl, languageAlternates } from "@/lib/public-seo";

export function buildMetadata(seo: {
  title: string;
  description: string;
  canonical_url: string;
  og_image: string;
  og_title: string;
  og_description: string;
  twitter_card: string;
  robots?: string;
}): Metadata {
  const robots = seo.robots
    ? {
        index: seo.robots.includes("index"),
        follow: seo.robots.includes("follow"),
      }
    : undefined;

  return {
    title: seo.title,
    description: seo.description,
    alternates:
      new URL(seo.canonical_url).pathname === "/"
        ? languageAlternates("/", { en: "/", pl: "/pl" })
        : { canonical: canonicalUrl(new URL(seo.canonical_url).pathname) },
    openGraph: {
      title: seo.og_title,
      description: seo.og_description,
      images: [seo.og_image],
      siteName: "WITNESSOPS",
    },
    twitter: {
      card: seo.twitter_card as "summary_large_image" | "summary",
      title: seo.og_title,
      description: seo.og_description,
      images: [seo.og_image],
    },
    robots,
  };
}
