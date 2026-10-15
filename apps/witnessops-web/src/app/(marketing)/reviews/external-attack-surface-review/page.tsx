import type { Metadata } from "next";

import CatalogSkuDetailPage from "@/app/(marketing)/catalog/[skuId]/page";
import { canonicalUrl } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "External Attack Surface Review",
  description:
    "Understand what your public-facing system exposes—and what to fix first. One authorised internet-facing system. This is not a penetration test.",
  alternates: {
    canonical: canonicalUrl("/reviews/external-attack-surface-review"),
  },
};

export default function ExternalAttackSurfaceReviewPage() {
  return CatalogSkuDetailPage({
    params: Promise.resolve({ skuId: "offsec-external-exposure" }),
  });
}
