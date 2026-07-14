import type { Metadata } from "next";
import Link from "next/link";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";

export const metadata: Metadata = {
  title: "Customer Security Review Sprint",
  description:
    "A bounded response package for one enterprise security questionnaire and one product scope, prepared in three working days after prerequisites are confirmed.",
  alternates: {
    canonical: "/customer-security-review",
    languages: {
      en: "/customer-security-review",
      pl: "/pl/customer-security-review",
      "x-default": "/customer-security-review",
    },
  },
};

const deliverables = [
  "Answer matrix prepared for customer approval",
  "Evidence index with dates, owners, scope and supported questions",
  "Claim-status and open-item map",
  "Customer cover note explaining scope, limitations and ownership",
];

const evidenceStatuses = [
  "Supported",
  "Supported with qualification",
  "Owner assertion",
  "Open",
  "Not applicable, with reason",
];

const deliveryBoundary =
  "Delivery within three working days after the questionnaire, product scope, responsible owners and required evidence access are confirmed.";
const certificationBoundary =
  "This sprint does not replace SOC 2, ISO 27001, penetration testing, legal advice, or any certification explicitly required by the customer.";

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
            <p className="text-sm font-semibold text-text-muted">Customer Security Review Sprint</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
              Send us the security questionnaire holding up your deal.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">
              We prepare a supported response for one questionnaire and one
              product scope, keeping qualifications, missing evidence and
              unresolved items visible for customer approval.
            </p>
            <Link
              href="/review/request"
              className="mt-8 inline-flex min-h-12 items-center justify-center bg-black px-6 text-center text-sm font-semibold leading-5 text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
            >
              Send the questionnaire for a bounded fit check.
            </Link>
            <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">
              First contact is non-secret. Do not send the questionnaire, files,
              logs, screenshots, credentials or customer evidence in the initial message.
            </p>
          </div>

          <aside className="bg-black p-6 text-white sm:p-7">
            <div className="sm:grid sm:grid-cols-2 sm:gap-8 lg:block">
              <div>
                <p className="text-sm font-semibold text-white/60">Commercial boundary</p>
                <p className="mt-3 text-3xl font-semibold">From €1,600</p>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  Confirmed after a non-secret fit check. One questionnaire. One product scope.
                </p>
              </div>
              <div className="mt-6 border-t border-white/20 pt-5 sm:mt-0 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8 lg:mt-6 lg:border-t lg:border-l-0 lg:pt-5 lg:pl-0">
                <p className="text-sm leading-6 text-white/80">{deliveryBoundary}</p>
                <p className="mt-3 text-xs leading-5 text-white/55">
                  The delivery clock does not begin while documents or owners are still being located.
                </p>
              </div>
            </div>
          </aside>
        </header>

        <section className="grid gap-10 border-b border-surface-border py-12 md:grid-cols-2 md:gap-8 lg:gap-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">What you receive</h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
              {deliverables.map((item) => (
                <li key={item} className="border-t border-surface-border pt-4">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">How every answer is classified</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {evidenceStatuses.map((status) => (
                <li key={status} className="border border-surface-border bg-surface-bg-alt p-4 text-sm text-text-secondary">{status}</li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-7 text-text-muted">
              Missing evidence stays missing. We do not invent support, remove
              qualifications or turn an owner assertion into a verified fact.
            </p>
          </div>
        </section>

        <section className="border-b border-surface-border py-12">
          <div className="border-2 border-black">
            <p className="bg-black px-5 py-3 text-sm font-semibold tracking-wide text-white">
              SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE
            </p>
            <div className="grid gap-8 p-6 lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Example cover note</h2>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  This fictional response covers one example product and the
                  evidence references listed below. Open items require the named
                  owner before the response is sent.
                </p>
                <h3 className="mt-6 font-semibold text-text-primary">Example evidence references</h3>
                <ul className="mt-3 space-y-2 text-sm text-text-muted">
                  <li>Architecture standard — current approved version</li>
                  <li>Access review procedure — product scope</li>
                  <li>Incident response policy — owner-confirmed</li>
                </ul>
                <p className="mt-6 text-sm leading-7 text-text-muted">
                  Scope and limitation: no live-system testing, certification or
                  independent recomputation is represented by this demonstration.
                </p>
              </div>
              <div
                className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                tabIndex={0}
                aria-label="Synthetic example response table"
              >
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="p-3 font-semibold">Question area</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Reference / limitation</th>
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

        <section className="grid gap-8 py-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">What this Sprint does not replace</h2>
            <p className="mt-4 text-sm leading-7 text-text-secondary">
              {certificationBoundary}
            </p>
          </div>
          <div className="space-y-3 text-sm leading-7 text-text-secondary">
            <p>There is no guarantee of enterprise approval or deal closure. The customer owns every outward-facing answer.</p>
            <p>No public evidence intake, live-system verification, SaaS signup, checkout, marketplace or self-service provisioning is part of this offer.</p>
          </div>
        </section>

        <div className="border-t border-surface-border pt-10">
          <PublicContactRoute subject="fit-check" />
        </div>
      </div>
    </main>
  );
}
