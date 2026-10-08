import type { Metadata } from "next";
import { BuyerCatalogue } from "@/components/marketing/buyer-catalogue";
import { EXTERNAL_ATTACK_SURFACE_OFFER, PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";

const pricingDescription = `Compare ${PUBLIC_AGENT_ACTION_OFFER.name.en} and ${EXTERNAL_ATTACK_SURFACE_OFFER.name.en}. See their scope, evidence, prices and start conditions before requesting a review.`;

export const metadata: Metadata = {
  title: "Review Pricing",
  description: pricingDescription,
  alternates: { canonical: "/pricing" },
  twitter: { card: "summary_large_image", title: "Review Pricing | WitnessOps", description: pricingDescription },
  openGraph: { title: "Review Pricing | WitnessOps", description: pricingDescription, siteName: "WitnessOps", type: "website" },
};

export default function PricingPage() {
  return <BuyerCatalogue locale="en" surface="pricing" />;
}
