import type { Metadata } from "next";

import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { buyerRequestHref, buyerServiceById } from "@/lib/buyer-services";
import { PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL } from "@/lib/professional-public-footprint-audit";
import { languageAlternates } from "@/lib/public-seo";

const service = buyerServiceById("professional-public-footprint-audit");
const detail = PROFESSIONAL_PUBLIC_FOOTPRINT_DETAIL.pl;

export const metadata: Metadata = {
  title: service.name.pl,
  description: service.cardSituation.pl,
  alternates: languageAlternates("/pl/catalog/professional-public-footprint-audit", {
    en: "/catalog/professional-public-footprint-audit",
    pl: "/pl/catalog/professional-public-footprint-audit",
  }),
};

export default function PolishProfessionalPublicFootprintAuditPage() {
  return (
    <BuyerServiceDetail
      locale="pl"
      service={service}
      requestHref={buyerRequestHref("pl")}
      claim={detail.claim}
      verificationPath={detail.verificationPath}
      notIncluded={[...detail.notIncluded]}
    />
  );
}
