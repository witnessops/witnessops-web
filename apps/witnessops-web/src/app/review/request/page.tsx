import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import {
  buyerServiceByProductId,
  buyerServiceFromRequestOffer,
} from "@/lib/buyer-services";
import { isCurrentPublicCatalogSku } from "@/lib/public-commercial-routes";
import { linkedinPremiumCampaignAttribution } from "@/lib/marketing-attribution";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PRIMARY_OFFER,
} from "@/lib/commercial-truth";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_SUBJECTS,
  publicContactMailto,
} from "@/lib/public-contact";
import { getSku } from "@witnessops/catalog";
import { languageAlternates } from "@/lib/public-seo";

export const metadata: Metadata = {
  title: "Tell Us What You Need Reviewed",
  description: `Start a non-secret fit check for ${PRIMARY_OFFER.name.en} or another bounded WitnessOps review. No review starts from this form.`,
  alternates: languageAlternates("/review/request", {
    en: "/review/request",
    pl: "/pl/review/request",
  }),
  openGraph: {
    title: "Tell Us What You Need Reviewed | WitnessOps",
    description: `Start a non-secret fit check for ${PRIMARY_OFFER.name.en} or another bounded WitnessOps review. No review starts from this form.`,
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tell Us What You Need Reviewed | WitnessOps",
    description: `Start a non-secret fit check for ${PRIMARY_OFFER.name.en} or another bounded WitnessOps review. No review starts from this form.`,
  },
};

const proofOutputs = [
  {
    title: "Authority map",
    summary: "Who can authorize the action, which identity executes it, and where production authority stops.",
  },
  {
    title: "Execution path",
    summary: "The one consequential action, connected tools, APIs, MCP integrations, and affected systems.",
  },
  {
    title: "Permission boundary",
    summary: "The identity’s effective access, privilege boundary, scope controls, and possible blast radius.",
  },
  {
    title: "Evidence chain and control gaps",
    summary: "What binds authorization to execution and resulting state, what cannot be independently demonstrated, and the practical fixes.",
  },
];

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

const reviewFitOutputs = [
  {
    title: "Fit decision",
    summary: "Whether the request matches a listed service or needs a separately bounded scope.",
  },
  {
    title: "Scope outline",
    summary: "The named situation or system, authority boundary, exclusions, and input types needed for the next decision.",
  },
  {
    title: "Commercial proposal",
    summary: "The applicable offer, fee, timing, and evidence-handling conditions before work starts.",
  },
  {
    title: "Start boundary",
    summary: "A clear statement that the request itself neither starts work nor authorises evidence collection or target-facing checks.",
  },
];

const nextSteps = [
  "We check whether the technical action is bounded enough for one review package.",
  "We confirm the system boundary, action path, likely evidence sources, and obvious gaps.",
  "We reply with fit, scope, fee, and next action before any source materials are accepted.",
];

const primaryOfferNextSteps = [
  `${PRIMARY_OFFER.fitCheckQuestion.en} We check the failure impact, systems, tools, and security boundaries without asking for secrets.`,
  "If it fits, we agree the one action, authority, executing identity, permissions, tool access, evidence rules, exclusions, and evidence handling before accepting source material.",
  `${PRIMARY_OFFER.timing.en} for the ${PRIMARY_OFFER.price.en} engagement.`,
];

const selectedServiceNextSteps = [
  "We check whether the selected service fits one bounded request.",
  "We confirm the scope owner, consent or authority, exclusions, required inputs, fee, and timing.",
  "We reply with fit and the next action before any source materials are accepted or work begins.",
];

const publicExposureNextSteps = [
  "We check the named public-facing system, your authority, first-party boundary, exclusions, and operator capacity.",
  "We accept or reject the scope asynchronously. No sales call is required.",
  "After payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed, the three-working-day delivery clock starts.",
];

const sampleArtifacts = [
  "ACTION_BOUNDARY.json",
  "AUTHORITY_MAP.json",
  "EVIDENCE_MANIFEST.json",
  "RECEIPT.json",
  "VERIFY_RESULT.json",
  "CHALLENGE_PATH.md",
  "MANIFEST.sha256",
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
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const productId = one(params.productId);
  const offerId = one(params.offerId);
  const offer = one(params.offer);
  const campaignAttribution = linkedinPremiumCampaignAttribution(params);
  const requestedSku = productId ? getSku(productId) : undefined;
  const sku = requestedSku && isCurrentPublicCatalogSku(requestedSku.id)
    ? requestedSku
    : undefined;
  const requestedOffer = buyerServiceFromRequestOffer(offerId, offer);
  const primaryOfferSelected =
    requestedOffer?.id === PRIMARY_OFFER.id &&
    (offerId !== undefined || !sku);
  const selectedOffer = primaryOfferSelected
    ? requestedOffer
    : sku
      ? buyerServiceByProductId(sku.id)
      : requestedOffer;
  const publicExposureOrder =
    selectedOffer?.id === "external-exposure-assessment";
  const primaryOfferOrder = selectedOffer?.id === PRIMARY_OFFER.id;
  const selectedServiceOrder =
    selectedOffer && !publicExposureOrder && !primaryOfferOrder
      ? selectedOffer
      : undefined;
  const activeNextSteps = publicExposureOrder
    ? publicExposureNextSteps
    : primaryOfferOrder
      ? primaryOfferNextSteps
      : selectedServiceOrder
        ? selectedServiceNextSteps
        : nextSteps;
  const activeOutputs = publicExposureOrder
    ? publicExposureOutputs
    : primaryOfferOrder
      ? proofOutputs
      : selectedServiceOrder
        ? [
            {
              title: "Expected outcome",
              summary: selectedServiceOrder.result.en,
            },
            {
              title: "Offer boundary",
              summary: selectedServiceOrder.boundary.en,
            },
          ]
        : reviewFitOutputs;
  const activeArtifacts = publicExposureOrder
    ? publicExposureArtifacts
    : primaryOfferOrder
      ? sampleArtifacts.slice(0, 5)
      : [];

  return (
    <main id="main-content" tabIndex={-1} className="buyer-page">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-16">
      <section className="mb-8 max-w-[720px]">
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
            ? `Start your ${selectedOffer.name.en}`
            : "Tell us what you need reviewed"}
        </h1>
        <p className="max-w-[640px] text-base leading-relaxed text-text-muted">
          {publicExposureOrder
            ? "Name the authorised internet-facing system and why its external attack surface matters now. We’ll confirm the exact boundary and authority before any target-facing check begins. This is not a penetration test."
            : primaryOfferOrder
              ? `${PRIMARY_OFFER.fitCheckQuestion.en} Add the failure impact, systems and tools involved, and any production, customer-data, money, account, permission, or external-communication boundary. Keep it non-secret; evidence is accepted only after scope, evidence rules, and handling are agreed.`
            : selectedServiceOrder
              ? "Give us one non-secret summary for the selected service. We’ll confirm fit, exact scope, required inputs, fee, and timing before work begins."
              : "Start with one non-secret review need. We’ll confirm whether it is bounded enough to scope before any work or evidence intake begins."}
        </p>
        <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-text-muted">
          Prefer email? Send the same non-secret summary to{" "}
          <a
            href={publicContactMailto(
              primaryOfferOrder
                ? PRIMARY_OFFER.mailSubject
                : PUBLIC_CONTACT_SUBJECTS.fitCheck,
            )}
            className="text-brand-accent underline decoration-brand-accent/50 underline-offset-4 hover:decoration-brand-accent"
          >
            {PUBLIC_CONTACT_EMAIL}
          </a>
          .
        </p>
        {selectedOffer ? (
          <div className="mt-5 border border-brand-accent/30 bg-brand-accent/5 p-4 text-sm leading-6 text-text-secondary">
            <p className="font-semibold text-brand-accent">
              Selected offer: {selectedOffer.name.en}
            </p>
            <p className="mt-2">Price: {selectedOffer.price.en}</p>
            <p>Timing: {selectedOffer.timing.en}</p>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="self-start border border-surface-border-strong bg-surface-bg-alt p-4 sm:p-6 md:p-8">
          <ContactForm
            intent={
              primaryOfferOrder
                ? PRIMARY_OFFER.id
                : sku?.id ?? selectedOffer?.id ?? "review"
            }
            campaignAttribution={campaignAttribution}
          />
        </section>

        <aside className="space-y-4">
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
            <ol className="space-y-3 text-sm leading-relaxed text-text-muted">
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
                  : primaryOfferOrder
                    ? `${PRIMARY_OFFER.price.en} for ${PRIMARY_OFFER.unit.en.toLowerCase()}. ${PRIMARY_OFFER.fitCheck.en}. ${PRIMARY_OFFER.timing.en}.`
                    : "Fee, timing, and evidence handling are confirmed by email after the first fit check."}
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
        </aside>
      </div>

      <section className="mt-10 border-t border-surface-border pt-8">
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
            : primaryOfferOrder
              ? `What ${PRIMARY_OFFER.name.en} includes`
              : selectedServiceOrder
                ? `What the ${selectedServiceOrder.name.en} is scoped to deliver`
                : "What the fit check establishes"}
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
      </section>
      </div>
    </main>
  );
}
