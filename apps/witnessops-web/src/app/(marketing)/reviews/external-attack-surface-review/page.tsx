import type { Metadata } from "next";

import { ReviewOffer } from "@/components/marketing/review-offer";
import { languageAlternates } from "@/lib/public-seo";
import { pageSocialMetadata } from "@/lib/social-metadata";

const title = "External Attack Surface Review";
const description =
  "Understand what your public-facing system exposes—and what to fix first. One authorised internet-facing system. This is not a penetration test.";

export const metadata: Metadata = {
  title,
  description,
  alternates: languageAlternates("/reviews/external-attack-surface-review", {
    en: "/reviews/external-attack-surface-review",
    pl: "/pl/reviews/external-attack-surface-review",
  }),
  ...pageSocialMetadata(title, description),
};

export default function ExternalAttackSurfaceReviewPage() {
  return <ReviewOffer locale="en" offer="external" />;
}
