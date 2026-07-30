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
      claim="This package creates a bounded claim about one agreed action, workflow, or handoff and names the evidence that supports it."
      verificationPath="The delivered packet names the receipt artifact, verifier result where produced, and challenge path for the scoped evidence. If a verifier does not apply, the packet must say so."
      notIncluded={[
        "Self-serve checkout",
        "Compliance certification",
        "Open-ended investigation",
        "Customer evidence intake before scope and handling are agreed",
      ]}
    />
  );
}
