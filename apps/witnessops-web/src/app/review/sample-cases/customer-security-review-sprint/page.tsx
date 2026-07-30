import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { SampleCaseBanner } from "@/components/marketing/sample-case-banner";
import { CtaButton } from "@/components/shared/cta-button";

const path = "/review/sample-cases/customer-security-review-sprint";

export const metadata: Metadata = {
  title: "Sample — Customer Security Review Sprint",
  description:
    "Synthetic demonstration of a customer security questionnaire response package: proposed answers, evidence references, qualifications, and open items. Not live customer evidence.",
  alternates: getCanonicalAlternates("witnessops", path),
  openGraph: {
    title: "Sample — Customer Security Review Sprint | WitnessOps",
    description:
      "Inspect a synthetic questionnaire response package shape. Not live customer evidence or certification.",
    siteName: "WitnessOps",
    type: "website",
  },
};

const deliverables = [
  "proposed answer matrix",
  "evidence index",
  "qualifications and unsupported-claim list",
  "open-item and owner list",
  "claim map where useful",
  "cover note for the customer or internal approver",
] as const;

const syntheticRows = [
  ["Encryption in transit", "Supported", "Architecture standard, section 4"],
  ["Annual penetration test", "Open", "Current report not supplied in this demonstration"],
  [
    "Regional data residency",
    "Supported with qualification",
    "Product scope and hosting region must match",
  ],
] as const;

const boundaries = [
  "The customer owns the final answers, approvals and submission.",
  "WitnessOps does not certify compliance or guarantee that a customer, auditor or procurement team will accept the package.",
  "WitnessOps does not invent evidence or turn an unsupported claim into a supported one.",
  "Formal certifications and reports remain necessary where the reviewer requires them.",
  "This page is a synthetic demonstration — not live customer evidence.",
] as const;

export default function CustomerSecurityReviewSamplePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="buyer-page"
      data-page="csr-sample"
    >
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <SampleCaseBanner
          title="Customer Security Review Sprint"
          note="Synthetic demonstration only. It shows how WitnessOps packages proposed answers, evidence references, qualifications, and open items for one questionnaire and one product scope. Not live customer evidence and not certification."
        />

        <header className="mt-8 max-w-4xl border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            Sample case
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            Customer Security Review Sprint
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
            Situation: a security questionnaire is holding up a deal. The package maps supplied
            material to questions, separates supported answers from open items, and returns a
            response for the customer’s approval — not WitnessOps submission on their behalf.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton
              href="/review/request"
              variant="primary"
              label="Start a non-secret fit check"
            />
            <CtaButton
              href="/customer-security-review"
              variant="secondary"
              label="View service"
            />
            <CtaButton
              href="/review/sample-cases"
              variant="secondary"
              label="Browse all examples"
            />
          </div>
        </header>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            What you receive
          </h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            {deliverables.map((item) => (
              <li key={item} className="border-t border-surface-border pt-4">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-b border-surface-border py-12">
          <div className="border border-surface-border">
            <p className="border-b border-surface-border bg-surface-card/50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-accent">
              SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE
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
                  <li>Architecture standard — current approved version</li>
                  <li>Access review procedure — product scope</li>
                  <li>Incident response policy — owner-confirmed</li>
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
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Full synthetic package files
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            Complete synthetic CSR package for orientation: questionnaire, evidence stubs,
            answer matrix exports, and validation. Not live customer evidence.
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-7 text-text-secondary">
            {[
              "README.md",
              "manifest.json",
              "canonical/questionnaire.json",
              "canonical/evidence_inventory.json",
              "exports/answer_matrix.csv",
              "exports/evidence_index.csv",
              "exports/claim_status_open_item_map.csv",
              "evidence/EVD-001_security_overview.md",
              "validation/validation_report.json",
            ].map((file) => (
              <li key={file} className="border-t border-surface-border pt-3 font-mono text-xs sm:text-sm">
                <a
                  href={`/samples/csr-sprint-synthetic/${file}`}
                  className="text-brand-accent underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {file}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">Boundaries</h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            {boundaries.map((item) => (
              <li key={item} className="border-t border-surface-border pt-4">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="border-t border-surface-border pt-10">
          <div className="flex flex-wrap gap-3">
            <CtaButton
              href="/review/request"
              variant="primary"
              label="Start a non-secret fit check"
            />
            <CtaButton
              href="/customer-security-review"
              variant="secondary"
              label="Back to service"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
