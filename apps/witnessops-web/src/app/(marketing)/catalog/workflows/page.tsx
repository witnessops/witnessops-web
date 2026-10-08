import type { Metadata } from "next";

import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { buyerServiceById } from "@/lib/buyer-services";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import {
  primaryOfferBreadcrumbJsonLd,
  primaryOfferServiceJsonLd,
} from "@/lib/public-seo";

const service = buyerServiceById(PUBLIC_AGENT_ACTION_OFFER.id);

export const metadata: Metadata = {
  title: service.name.en,
  description: service.situation.en,
  alternates: { canonical: PUBLIC_AGENT_ACTION_OFFER.route },
  openGraph: {
    title: `${service.name.en} | WitnessOps`,
    description: service.situation.en,
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${service.name.en} | WitnessOps`,
    description: service.situation.en,
  },
};

export default function CatalogWorkflowsPage() {
  return (
    <>
      <JsonLd id="primary-offer-service" value={primaryOfferServiceJsonLd()} />
      <JsonLd
        id="primary-offer-breadcrumbs"
        value={primaryOfferBreadcrumbJsonLd()}
      />
      <BuyerServiceDetail
        locale="en"
        service={service}
        claim="WitnessOps reviews one agreed consequential agent or automation action. It traces who may authorise the action, the executing identity, the effective permissions and the evidence for any reported execution or outcome. Missing or unavailable records remain explicit. A configuration alone cannot establish that an action occurred, and this review does not certify safety."
        verificationPath="Findings cite the agreed source records and their limitations. Where available, approval, identity, downstream permission and execution records support the one-action reconstruction; unsupported action claims remain unresolved. The historical synthetic one-action sample is an illustration, not customer evidence."
        notIncluded={[...PUBLIC_AGENT_ACTION_OFFER.notIncluded.en]}
        promoteCommercialContract
      />
    </>
  );
}
