import type { Metadata } from "next";

import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { buyerServiceById } from "@/lib/buyer-services";

const service = buyerServiceById("bounded-workflow-review");

export const metadata: Metadata = {
  title: service.name.en,
  description: service.situation.en,
  alternates: { canonical: "/catalog/workflows" },
};

export default function CatalogWorkflowsPage() {
  return (
    <BuyerServiceDetail
      locale="en"
      service={service}
      claim="This review determines whether one named agentic or automated workflow has a defensible authority, control, evidence, receipt, and verification path."
      verificationPath="The sample proof bundle names the proposed receipt schema, referenced evidence, signer, verifier result, and challenge path. A receipt proves only what that named verifier and referenced evidence support."
      notIncluded={[
        "Self-serve checkout",
        "Compliance certification",
        "Production deployment of the proposed controls",
        "Open-ended investigation or whole-environment audit",
        "Customer evidence intake before scope and handling are agreed",
      ]}
    />
  );
}
