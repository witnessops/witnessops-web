import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";

export const metadata: Metadata = {
  title: "Customer Security Review Sprint",
  description:
    "Return a supported response to one enterprise security questionnaire in three working days after scope, owners, and evidence access are confirmed.",
  alternates: getCanonicalAlternates("witnessops", "/customer-security-review"),
  openGraph: {
    title: "Customer Security Review Sprint | WitnessOps",
    description:
      "A bounded sprint for one questionnaire and one product scope, prepared for customer approval.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Customer Security Review Sprint | WitnessOps",
    description:
      "A bounded sprint for one questionnaire and one product scope, prepared for customer approval.",
  },
};

const deliverables = [
  {
    title: "Answer matrix prepared for customer approval",
    summary: "Answers prepared for customer approval, with status, qualification, and evidence references kept visible.",
  },
  {
    title: "Evidence index",
    summary: "Named documents with dates, owners, scope, and the questions they support.",
  },
  {
    title: "Claim-status and open-item map",
    summary: "What is supported, qualified, asserted by an owner, unresolved, or not applicable with a reason.",
  },
  {
    title: "Customer cover note",
    summary: "A concise handoff that explains scope, limitations, and what the customer still owns.",
  },
];

const evidenceStatuses = [
  "Supported",
  "Supported with qualification",
  "Owner assertion",
  "Open",
  "Not applicable, with reason",
];

const fitSteps = [
  "Start with a non-secret fit check.",
  "Confirm the questionnaire, one product scope, responsible owners, and required evidence access.",
  "Receive the prepared response within three working days after those prerequisites are confirmed.",
];

export default function CustomerSecurityReviewPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-6 py-10 lg:py-14">
      <header className="border-b border-surface-border pb-10">
        <div className="kb-section-tag">Customer Security Review Sprint</div>
        <h1
          className="mt-2 max-w-4xl text-3xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your enterprise customer sent a security questionnaire. We help you return a supported response in three working days.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-text-secondary">
          A bounded sprint for one questionnaire and one product scope. We organize supported answers, named evidence, qualifications, and unresolved items so your team can return a response prepared for customer approval.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="border border-surface-border bg-surface-card/50 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Commercial scope</div>
            <p className="mt-3 text-lg font-semibold text-text-primary">From €1,600, confirmed after a non-secret fit check.</p>
            <p className="mt-2 text-sm leading-7 text-text-muted">One questionnaire. One product scope. No invented or unsupported answers.</p>
          </div>
          <div className="border border-surface-border bg-surface-card/50 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">Delivery boundary</div>
            <p className="mt-3 text-sm leading-7 text-text-secondary">Delivery within three working days after the questionnaire, product scope, responsible owners and required evidence access are confirmed.</p>
            <p className="mt-2 text-xs leading-5 text-text-muted">The delivery clock does not begin while documents or owners are still being located.</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-start gap-x-8 gap-y-4">
          <div>
            <CtaButton href="/review/request" variant="primary" label="Request a non-secret fit check" />
            <p className="mt-2 max-w-[360px] text-xs leading-5 text-text-muted">No files, logs, screenshots, credentials, or customer evidence belong in the first message.</p>
          </div>
        </div>
      </header>

      <section className="border-b border-surface-border py-10">
        <div className="kb-section-tag">What you receive</div>
        <h2 className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          A supported response package, prepared for customer approval.
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {deliverables.map((item, index) => (
            <div key={item.title} className="border border-surface-border bg-surface-card/40 p-5">
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-brand-accent">{String(index + 1).padStart(2, "0")}</div>
              <h3 className="mt-3 text-sm font-semibold text-text-primary">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{item.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-surface-border py-10">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="kb-section-tag">Evidence status</div>
            <h2 className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Every answer keeps its support level visible.
            </h2>
          </div>
          <ul className="grid gap-3 text-sm leading-7 text-text-secondary sm:grid-cols-2">
            {evidenceStatuses.map((status) => (
              <li key={status} className="border border-surface-border bg-surface-bg p-4">{status}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-surface-border py-10">
        <div className="kb-section-tag">How it starts</div>
        <h2 className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          Non-secret first contact, then bounded delivery.
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {fitSteps.map((step, index) => (
            <li key={step} className="border border-surface-border bg-surface-card/40 p-5">
              <div className="font-mono text-xs uppercase tracking-[0.16em] text-brand-accent">{String(index + 1).padStart(2, "0")}</div>
              <p className="mt-3 text-sm leading-7 text-text-secondary">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-b border-surface-border py-10">
        <div className="border border-surface-border bg-surface-bg p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Boundary</div>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            This sprint does not replace SOC 2, ISO 27001, penetration testing, legal advice, or any certification explicitly required by the customer.
          </p>
          <p className="mt-3 text-sm leading-7 text-text-secondary">There is no guarantee of enterprise approval or deal closure. The customer owns every outward-facing answer.</p>
          <p className="mt-3 text-sm leading-7 text-text-secondary">No public evidence intake, live-system verification, SaaS signup, checkout, marketplace, or self-service provisioning is part of this offer.</p>
        </div>
      </section>

      <section className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="kb-section-tag">Next step</div>
            <h2 className="mt-2 text-2xl font-semibold uppercase leading-tight tracking-[0.04em] text-text-primary lg:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Start with the question, not the evidence bundle.
            </h2>
          </div>
          <CtaButton href="/review/request" variant="primary" label="Request a non-secret fit check" />
        </div>
        <div className="mt-8">
          <PublicContactRoute subject="fit-check" />
        </div>
      </section>
    </main>
  );
}
