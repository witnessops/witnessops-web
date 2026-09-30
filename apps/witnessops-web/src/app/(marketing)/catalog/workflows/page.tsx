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
        claim="WitnessOps records which agent tools appear in an agreed dated system-level inventory, reviews one named agent setup and selected tool connection, then traces the authority and effective downstream permissions of one consequential action. The report distinguishes observed evidence, absence within a named source, failed or unavailable sources, and sources not inspected. It does not claim complete agent discovery or that a proposed action occurred, and does not guarantee security."
        verificationPath="Findings cite the inspected sources, observation time, method and limitations. A configuration can show declared capability, while downstream permission and execution records are needed to support claims about effective access or an action that occurred. The historical synthetic one-action sample is an example of evidence reasoning, not a sample of this full review."
        notIncluded={[...PRIMARY_OFFER.notIncluded.en]}
        promoteCommercialContract
      />
    </>
  );
}
