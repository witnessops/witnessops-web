import type { Metadata } from "next";

import CatalogSkuDetailPage from "@/app/(marketing)/catalog/[skuId]/page";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "External Attack Surface Review",
  description:
    "Understand what your public-facing system exposes—and what to fix first. One authorised internet-facing system. This is not a penetration test.",
  alternates: languageAlternates("/reviews/external-attack-surface-review", {
    en: "/reviews/external-attack-surface-review",
    pl: "/pl/reviews/external-attack-surface-review",
  }),
};

export default function ExternalAttackSurfaceReviewPage() {
  return CatalogSkuDetailPage({
    params: Promise.resolve({ skuId: "offsec-external-exposure" }),
  });
}
