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
        claim="WitnessOps reconstructs one consequential agent or automation workflow and separates what was authorised, executed, observed, and still unresolved."
        verificationPath="The proposed receipt shape and sample pack name the evidence references, verifier result, and challenge path. Extract the supported receipt JSON from the sample pack to test it through /verify; /verify does not accept the whole pack. A receipt proves only what that verifier and its referenced evidence support. It does not certify compliance or agent safety."
        notIncluded={[...PRIMARY_OFFER.notIncluded.en]}
      />
    </>
  );
}
