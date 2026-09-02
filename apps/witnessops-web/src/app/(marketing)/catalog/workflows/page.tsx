import type { Metadata } from "next";

import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { buyerServiceById } from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";
import {
  primaryOfferBreadcrumbJsonLd,
  primaryOfferServiceJsonLd,
} from "@/lib/public-seo";

const service = buyerServiceById(PRIMARY_OFFER.id);

export const metadata: Metadata = {
  title: service.name.en,
  description: service.situation.en,
  alternates: { canonical: PRIMARY_OFFER.route },
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
        claim="WitnessOps reviews one consequential agent or automation action across authority → identity → permissions → tools → execution → evidence. The review identifies over-privileged identities, weak or implicit approval paths, tool access beyond intended scope, broken approval-to-action binding, missing execution evidence, and actions that cannot be independently demonstrated afterward."
        verificationPath={`${PRIMARY_OFFER.deliveryMethod.en} is the delivery method used to reconstruct the action and test the evidence chain. Where useful, the technical package includes an evidence-gap analysis, proposed receipt shape, and sample pack with supported receipt JSON. Extract that JSON to test it through /verify; /verify does not accept the whole pack. A receipt proves only what its named verifier and referenced evidence support; it does not certify compliance or agent safety.`}
        notIncluded={[...PRIMARY_OFFER.notIncluded.en]}
        promoteCommercialContract
      />
    </>
  );
}
