export const DEFAULT_SOCIAL_IMAGE_PATH = "/og/witnessops-home-editorial-a-2026-10.png";

export const DEFAULT_OPEN_GRAPH_IMAGES = [
  {
    url: DEFAULT_SOCIAL_IMAGE_PATH,
    width: 1200,
    height: 630,
    alt: "WitnessOps — Understand the controls before your AI agent acts.",
  },
];

export const DEFAULT_TWITTER_IMAGES = [DEFAULT_SOCIAL_IMAGE_PATH];

export function pageSocialMetadata(title: string, description: string) {
  return {
    openGraph: {
      images: DEFAULT_OPEN_GRAPH_IMAGES,
      title: `${title} | WitnessOps`,
      description,
      siteName: "WitnessOps",
      type: "website" as const,
    },
    twitter: {
      images: DEFAULT_TWITTER_IMAGES,
      card: "summary_large_image" as const,
      title: `${title} | WitnessOps`,
      description,
    },
  };
}
