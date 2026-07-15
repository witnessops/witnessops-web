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
    <BuyerServiceDetail locale="en" service={service}>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <section>
          <h2 className="text-xl font-semibold text-text-primary">Working boundary</h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            The review covers one agreed action, workflow or handoff. Scope, authority,
            fee, timing and evidence handling are confirmed before work starts.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-text-primary">Inspection path</h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            The delivered package names the receipt artifact, verifier result where
            produced, and the challenge or inspection path for the agreed evidence.
            If a verifier does not apply, the package says so.
          </p>
        </section>
        <section className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-text-primary">Not included</h2>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-text-secondary sm:grid-cols-2">
            {[
              "Self-serve checkout",
              "Compliance certification",
              "Open-ended investigation",
              "Customer evidence intake before scope and handling are agreed",
            ].map((item) => (
              <li key={item} className="border border-surface-border bg-surface-card/40 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </BuyerServiceDetail>
  );
}
