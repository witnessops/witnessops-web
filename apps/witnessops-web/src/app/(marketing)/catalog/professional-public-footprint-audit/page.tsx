import type { Metadata } from "next";

import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { buyerRequestHref, buyerServiceById } from "@/lib/buyer-services";
import { PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL } from "@/lib/professional-public-footprint-audit";
import { languageAlternates } from "@/lib/public-seo";

const service = buyerServiceById("professional-public-footprint-audit");
const detail = PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.en;

export const metadata: Metadata = {
  title: service.name.en,
  description: service.cardSituation.en,
  alternates: languageAlternates("/catalog/professional-public-footprint-audit", {
    en: "/catalog/professional-public-footprint-audit",
    pl: "/pl/catalog/professional-public-footprint-audit",
  }),
};

export default function ProfessionalPublicFootprintAuditPage() {
  return (
    <BuyerServiceDetail
      locale="en"
      service={service}
      requestHref={buyerRequestHref("en")}
      claim={detail.claim}
      verificationPath={detail.verificationPath}
      notIncluded={[...detail.notIncluded]}
    />
  );
}
