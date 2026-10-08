import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import {
  buyerServiceByProductId,
  buyerServiceByPublicOfferId,
} from "@/lib/buyer-services";
import { linkedinPremiumCampaignAttribution } from "@/lib/marketing-attribution";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { NewSalesIntakeClosed } from "@/components/review-request/new-sales-intake-closed";
import {
  NEW_SALES_EXTERNAL_PRODUCT_ID,
  resolveNewSalesPageQuery,
} from "@/lib/new-review-request-policy";
import {
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_SALES_CONTACT_EMAIL,
  publicSalesContactMailto,
} from "@/lib/public-contact";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Tell Us What You Need Reviewed",
  description: `Describe a security concern, an AI action or an automation that needs checking. We agree scope, fee and access before work begins.`,
  alternates: languageAlternates("/review/request", {
    en: "/review/request",
    pl: "/pl/review/request",
  }),
  openGraph: {
    title: "Tell Us What You Need Reviewed | WitnessOps",
    description: `Describe a security concern, an AI action or an automation that needs checking. We agree scope, fee and access before work begins.`,
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tell Us What You Need Reviewed | WitnessOps",
    description: `Describe a security concern, an AI action or an automation that needs checking. We agree scope, fee and access before work begins.`,
  },
};

const publicExposureOutputs = [
  {
    title: "External attack-surface map",
    summary: "Confirmed attacker-visible hosts, services, and endpoints inside the accepted first-party boundary.",
  },
  {
    title: "Evidence-backed findings",
    summary: "Prioritised observations with affected targets and inspectable evidence references.",
  },
  {
    title: "Remediation priorities",
    summary: "Practical fix-now and fix-next recommendations for the reported findings.",
  },
  {
    title: "Limits and unknowns",
    summary: "What was not tested, not established, stopped, excluded, or left for deeper work.",
  },
];

const agentActionNextSteps = [
  `${PUBLIC_AGENT_ACTION_OFFER.fitCheckQuestion.en} Do not send source files or secrets.`,
  `${PUBLIC_AGENT_ACTION_OFFER.unit.en}. ${PUBLIC_AGENT_ACTION_OFFER.price.en}.`,
  `${PUBLIC_AGENT_ACTION_OFFER.timing.en}. Payment and authority are agreed before work. This form does not start the review.`,
];

const agentActionOutputs = [
  { title: "Authority and executing identity", summary: "Who can cause the action, and which identity actually executes it." },
  { title: "Approval and permission boundary", summary: "Where approval stops, and which permissions the action can use." },
  { title: "Evidence path", summary: "Which execution evidence is available, missing, or not yet in scope." },
  { title: "Findings and unknowns", summary: "Prioritized findings for that one action, with gaps left explicit." },
];

const publicExposureNextSteps = [
  "We check the named public-facing system, your authority, first-party boundary, exclusions, and operator capacity.",
  "We accept or reject the scope asynchronously. No sales call is required.",
  "After payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed, the three-working-day delivery clock starts.",
];

const publicExposureArtifacts = [
  "exposure-map.json",
  "findings.json",
  "evidence-register.json",
  "evidence-manifest.json",
  "MANIFEST.sha256",
];

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ReviewRequestPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const decision = resolveNewSalesPageQuery({
    offerId: params.offerId,
    productId: params.productId,
    offer: params.offer,
  });
  const campaignAttribution = linkedinPremiumCampaignAttribution(params);
  if (decision.state === "rejected") {
    return <NewSalesIntakeClosed locale="en" reason={decision.reason} />;
  }
  if (decision.state === "chooser") {
    return <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Ask about your case</p>
      <h1 className="mt-5 max-w-xl text-4xl font-medium leading-tight tracking-tight">One question. Non-secret details only.</h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-text-secondary">Choose Agent Action Security Review or External Attack Surface Review. A display name, old identifier, or free-text note does not select a different review.</p>
      <div className="mt-10"><ContactForm compact landing campaignAttribution={campaignAttribution} /></div>
      <p className="mt-6 text-sm leading-6 text-text-muted">No work or target-facing check starts from this form.</p>
      <p className="mt-3 text-sm leading-6 text-text-muted">Prefer email? <a href={publicSalesContactMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck)} className="underline underline-offset-4">{PUBLIC_SALES_CONTACT_EMAIL}</a></p>
    </main>;
  }
  const agentActionOrder = decision.role === "offer";
  const publicExposureOrder = decision.role === "product";
  const selectedOffer = agentActionOrder
    ? buyerServiceByPublicOfferId(PUBLIC_AGENT_ACTION_OFFER.id)
    : buyerServiceByProductId(NEW_SALES_EXTERNAL_PRODUCT_ID);
  const activeNextSteps = publicExposureOrder
    ? publicExposureNextSteps
    : agentActionNextSteps;
  const activeOutputs = publicExposureOrder
    ? publicExposureOutputs
    : agentActionOutputs;
  const activeArtifacts = publicExposureOrder
    ? publicExposureArtifacts
    : [];

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-12">
      <section className="mb-5 max-w-[720px]">
        <div
          className="mb-4"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-brand-muted)",
          }}
        >
          {selectedOffer?.name.en ?? "Review Request"}
        </div>
        <h1
          className="mb-4 text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {selectedOffer
            ? "Tell us what you want to check"
            : "Tell us what you need reviewed"}
        </h1>
        <p className="max-w-[640px] text-base leading-relaxed text-text-muted">
          {publicExposureOrder
            ? "Name the authorised internet-facing system and why its external attack surface matters now. We’ll confirm the exact boundary and authority before any target-facing check begins. This is not a penetration test."
            : `${PUBLIC_AGENT_ACTION_OFFER.unit.en}. We’ll confirm fit before any work. No secrets or evidence yet.`}
        </p>
        <p className="mt-3 hidden max-w-[640px] text-sm leading-relaxed text-text-muted md:block">
          Prefer email? Send the same non-secret summary to{" "}
          <a
            href={publicSalesContactMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck)}
            className="text-brand-accent underline decoration-brand-accent/50 underline-offset-4 hover:decoration-brand-accent"
          >
            {PUBLIC_SALES_CONTACT_EMAIL}
          </a>
          .
        </p>
        {selectedOffer ? (
          <div className="mt-4 border-l-2 border-brand-accent pl-4 text-sm leading-6 text-text-secondary">
            <p className="sr-only">Selected offer: {selectedOffer.name.en}</p>
            <p>Price: {selectedOffer.price.en}</p>
            <p>Timing: {selectedOffer.timing.en}</p>
          </div>
        ) : null}
      </section>

      <div className="grid max-w-3xl gap-6">
        <section className="self-start border border-surface-border-strong bg-surface-bg-alt p-4 sm:p-6 md:p-8">
          <ContactForm
            compact={Boolean(selectedOffer)}
            intent={decision.intent}
            campaignAttribution={campaignAttribution}
          />
        </section>

        <details className="border-y border-surface-border">
          <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">What happens next and scope</summary>
          <div className="space-y-4 pb-5">
          {selectedOffer ? (
            <section className="border border-surface-border bg-surface-bg p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                Selected situation
              </div>
              <p className="text-sm leading-relaxed text-text-muted">
                {selectedOffer.situation.en}
              </p>
            </section>
          ) : null}
          <section className="border border-surface-border bg-surface-bg p-5">
            <div
              className="mb-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              What happens next
            </div>
            <ol className="list-none space-y-3 text-sm leading-relaxed text-text-muted">
              {activeNextSteps.map((item, index) => (
                <li key={item} className="grid grid-cols-[28px_1fr] gap-3">
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-brand-accent)" }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="border border-surface-border bg-surface-bg p-5">
            <div
              className="mb-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              First message only
            </div>
            <p className="text-sm leading-relaxed text-text-muted">
              Do not submit secrets, credentials, private keys, MFA codes,
              source exports, full logs, screenshots, customer records, or
              unrelated production data. Name evidence types only; source
              materials are handled after scope is agreed.
            </p>
          </section>

          <section className="border border-surface-border bg-surface-bg p-5">
            <div
              className="mb-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Commercial scope
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-text-muted">
              <p>
                {publicExposureOrder
                  ? `${EXTERNAL_ATTACK_SURFACE_OFFER.price.en}. Payment is due in full before the delivery clock starts. Timing, capacity, and evidence handling are confirmed during asynchronous scope acceptance.`
                  : `${PUBLIC_AGENT_ACTION_OFFER.price.en}. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}. This form is not a booking, checkout, or authority to inspect.`}
              </p>
              <p>No work or target-facing check starts from this form.</p>
              <p>No customer evidence is accepted until scope is agreed.</p>
            </div>
          </section>

          {activeArtifacts.length > 0 ? (
          <section className="border border-surface-border bg-surface-bg p-5">
            <div
              className="mb-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Typical bundle
            </div>
            <ul className="mb-4 grid gap-2 text-xs leading-relaxed text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
              {activeArtifacts.map((artifact) => (
                <li key={artifact} className="flex items-center gap-2">
                  <span style={{ color: "var(--color-signal-green)", fontSize: 9 }}>&#10003;</span>
                  <span>{artifact}</span>
                </li>
              ))}
            </ul>
            <Link
              href={publicExposureOrder
                ? "/review/sample-cases/external-exposure-assessment"
                : "/review/sample-cases/ai-agent-action-proof-run"}
              className="text-sm text-brand-accent underline-offset-4 hover:underline"
            >
              {publicExposureOrder ? `Inspect ${EXTERNAL_ATTACK_SURFACE_OFFER.name.en} sample` : "Inspect sample package"}
            </Link>
          </section>
          ) : null}

          <section className="border border-surface-border bg-surface-bg p-5">
            <div
              className="mb-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Boundary kept clear
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-text-muted">
              {publicExposureOrder ? (
                <>
                  <p>This is not a penetration test.</p>
                  <p>No exploitation, credential testing, destructive activity, or persistence.</p>
                  <p>Not a certification, attestation, completeness claim, or security guarantee.</p>
                </>
              ) : selectedOffer ? (
                <p>{selectedOffer.boundary.en}</p>
              ) : (
                <>
                  <p>Not a production deployment claim.</p>
                  <p>Not a legal compliance claim.</p>
                  <p>Not a complete AI governance program.</p>
                </>
              )}
            </div>
          </section>

          <div className="text-sm leading-relaxed text-text-muted">
            Need help? <Link href="/support" className="text-brand-accent underline-offset-4 hover:underline">Support</Link>.
            <span className="mx-2 text-surface-border">/</span>
            Disclosure: <Link href="/security" className="text-brand-accent underline-offset-4 hover:underline">Security</Link>.
          </div>
          </div>
        </details>
      </div>

      <details className="mt-5 max-w-3xl border-t border-surface-border">
        <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">What the review includes</summary>
        <div
          className="mb-4"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-text-muted)",
          }}
        >
          {publicExposureOrder
            ? `What the ${EXTERNAL_ATTACK_SURFACE_OFFER.name.en} delivers`
            : `What ${PUBLIC_AGENT_ACTION_OFFER.name.en} includes`}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {activeOutputs.map((item, index) => (
            <div key={item.title} className="grid gap-2 border border-surface-border bg-surface-bg p-4 sm:grid-cols-[40px_1fr]">
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--color-brand-muted)",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">{item.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </details>
      </div>
    </main>
  );
}
