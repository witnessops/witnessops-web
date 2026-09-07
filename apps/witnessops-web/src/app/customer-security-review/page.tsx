import type { Metadata } from "next";
import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { buyerServiceById } from "@/lib/buyer-services";
import { languageAlternates } from "@/lib/public-seo";

const service = buyerServiceById("customer-security-review-sprint");

export const metadata: Metadata = {
  title: "Customer Security Review Sprint",
  description:
    "WitnessOps takes one questionnaire and one product scope, identifies which proposed answers are supported by the supplied evidence, separates management assertions and open items, and returns a response package for your approval.",
  alternates: languageAlternates("/customer-security-review", {
    en: "/customer-security-review",
    pl: "/pl/customer-security-review",
  }),
};

const syntheticRows = [
  ["Encryption in transit", "Supported", "Architecture standard, section 4"],
  ["Annual penetration test", "Open", "Current report not supplied in this demonstration"],
  ["Regional data residency", "Supported with qualification", "Product scope and hosting region must match"],
] as const;

export default function CustomerSecurityReviewPage() {
  return (
    <BuyerServiceDetail locale="en" service={service}>
          <div className="border border-surface-border">
            <p className="border-b border-surface-border bg-surface-card/50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-accent">
              SYNTHETIC DEMONSTRATION, NOT CUSTOMER EVIDENCE
            </p>
            <div className="grid gap-8 p-6 lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Example cover note</h2>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  This fictional response covers one example product and the evidence references
                  listed below. Open items require the named owner before the response is sent.
                </p>
                <h3 className="mt-6 font-semibold text-text-primary">Example evidence references</h3>
                <ul className="mt-3 space-y-2 text-sm text-text-muted">
                  <li>Architecture standard: current approved version</li>
                  <li>Access review procedure: product scope</li>
                  <li>Incident response policy: owner-confirmed</li>
                </ul>
              </div>
              <div
                className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                tabIndex={0}
                aria-label="Synthetic example response table"
              >
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="p-3 font-semibold text-text-primary">Question area</th>
                      <th className="p-3 font-semibold text-text-primary">Status</th>
                      <th className="p-3 font-semibold text-text-primary">Reference / limitation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syntheticRows.map(([area, status, reference]) => (
                      <tr key={area} className="border-b border-surface-border align-top">
                        <td className="p-3 text-text-primary">{area}</td>
                        <td className="p-3 text-text-secondary">{status}</td>
                        <td className="p-3 text-text-muted">{reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
    </BuyerServiceDetail>
  );
}
