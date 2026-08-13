import type { Metadata } from "next";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Customer Security Review Sprint",
  description:
    "WitnessOps takes one questionnaire and one product scope, identifies which proposed answers are supported by the supplied evidence, separates management assertions and open items, and returns a response package for your approval.",
  alternates: languageAlternates("/customer-security-review", {
    en: "/customer-security-review",
    pl: "/pl/customer-security-review",
  }),
};

const deliverables = [
  "proposed answer matrix",
  "evidence index",
  "qualifications and unsupported-claim list",
  "open-item and owner list",
  "claim map where useful",
  "cover note for the customer or internal approver",
];

const steps = [
  [
    "Fit check",
    "Confirm the questionnaire, product scope, deadline, owners and handling constraints without sending secrets.",
  ],
  [
    "Scope agreement",
    "Confirm authority, inputs, price, timing, exclusions and evidence handling.",
  ],
  [
    "Review",
    "Map supplied material to questions, draft supportable answers and separate assertions, gaps and unknowns.",
  ],
  [
    "Approval package",
    "Return the package for the customer’s review and final submission.",
  ],
] as const;

const boundaries = [
  "The customer owns the final answers, approvals and submission.",
  "WitnessOps does not certify compliance or guarantee that a customer, auditor or procurement team will accept the package.",
  "WitnessOps does not invent evidence or turn an unsupported claim into a supported one.",
  "Formal certifications and reports remain necessary where the reviewer requires them.",
];

const syntheticRows = [
  ["Encryption in transit", "Supported", "Architecture standard, section 4"],
  ["Annual penetration test", "Open", "Current report not supplied in this demonstration"],
  ["Regional data residency", "Supported with qualification", "Product scope and hosting region must match"],
] as const;

export default function CustomerSecurityReviewPage() {
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <header className="grid gap-8 border-b border-surface-border pb-12 md:gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
              Customer Security Review Sprint
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
              Send us the security questionnaire holding up your deal.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
              WitnessOps takes one questionnaire and one product scope, identifies which proposed
              answers are supported by the supplied evidence, separates management assertions and
              open items, and returns a response package for your approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaButton
                href="/review/request"
                variant="primary"
                label="Start a non-secret fit check"
              />
              <a
                href="/assets/one-pagers/csr-sprint-en-a4.pdf"
                target="_blank"
                rel="noopener noreferrer"
                type="application/pdf"
                data-one-pager="customer-security-review-sprint"
                className="inline-flex min-h-12 items-center justify-center border border-surface-border px-6 text-center text-sm font-semibold leading-5 text-text-primary transition-colors hover:border-brand-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              >
                One-pager (PDF)
              </a>
              <CtaButton
                href="/review/sample-cases/customer-security-review-sprint"
                variant="secondary"
                label="Inspect CSR sample"
              />
              <CtaButton href="/catalog" variant="secondary" label="View services" />
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
              Start with a general, non-secret description. Do not send files, credentials, logs,
              screenshots, private keys, API keys, MFA codes, recovery codes, session tokens or
              customer evidence during the fit check.
            </p>
          </div>

          <aside className="border border-brand-accent/40 bg-brand-accent/5 p-6 sm:p-7">
            <div className="sm:grid sm:grid-cols-2 sm:gap-8 lg:block">
              <div>
                <p className="text-sm font-semibold text-text-muted">Commercial line</p>
                <p className="mt-3 text-3xl font-semibold text-text-primary">From €1,600</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  After a non-secret fit check. One questionnaire. One product scope.
                </p>
              </div>
              <div className="mt-6 border-t border-surface-border pt-5 sm:mt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8 lg:mt-6 lg:border-t lg:border-l-0 lg:pt-5 lg:pl-0">
                <p className="text-sm leading-6 text-text-secondary">
                  Approximately three working days after scope, owners, required inputs and evidence access are confirmed.
                </p>
              </div>
            </div>
          </aside>
        </header>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">Who it is for</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            B2B software, SaaS, AI and technical-service companies facing a live customer security
            questionnaire, vendor-security review or evidence request.
          </p>
        </section>

        <section className="grid gap-10 border-b border-surface-border py-12 md:grid-cols-2 md:gap-8 lg:gap-10">
          <div>
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
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              How the sprint works
            </h2>
            <ol className="mt-6 space-y-4">
              {steps.map(([title, body], index) => (
                <li key={title} className="border-t border-surface-border pt-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {index + 1}. {title}
                  </p>
                  <p className="mt-1 text-sm leading-7 text-text-secondary">{body}</p>
                </li>
              ))}
            </ol>
          </div>
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

        <section className="py-12">
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
          <PublicContactRoute subject="fit-check" />
        </div>
      </div>
    </main>
  );
}
