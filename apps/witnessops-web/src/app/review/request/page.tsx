import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { ContactCompanyDetails } from "@/components/marketing/company-details";
import { buyerServiceByPublicOfferId } from "@/lib/buyer-services";
import { linkedinPremiumCampaignAttribution } from "@/lib/marketing-attribution";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { NewSalesIntakeClosed } from "@/components/review-request/new-sales-intake-closed";
import { resolveNewSalesPageQuery } from "@/lib/new-review-request-policy";
import {
  PUBLIC_CONTACT_SUBJECTS,
  PUBLIC_SALES_REVIEW_EMAIL,
  salesReviewMailto,
} from "@/lib/public-contact";
import { languageAlternates } from "@/lib/public-seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_TWITTER_IMAGES } from "@/lib/social-metadata";

const requestDescription = `${PUBLIC_AGENT_ACTION_OFFER.name.en}: ${PUBLIC_AGENT_ACTION_OFFER.unit.en}. ${PUBLIC_AGENT_ACTION_OFFER.price.en}. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}.`;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const decision = resolveNewSalesPageQuery({
    offerId: params.offerId,
    productId: params.productId,
    offer: params.offer,
  });
  const title = decision.state === "selected"
    ? `Request ${PUBLIC_AGENT_ACTION_OFFER.name.en}`
    : "This link does not start a new review";
  const description = decision.state === "selected"
    ? requestDescription
    : "This request link is unavailable for new engagements. Existing requests and issued agreements keep their original terms.";

  return {
    title,
    description,
    alternates: languageAlternates("/contact", {
      en: "/contact",
      pl: "/pl/contact",
    }),
    openGraph: {
      images: DEFAULT_OPEN_GRAPH_IMAGES,
      title: `${title} | WitnessOps`,
      description,
      siteName: "WitnessOps",
      type: "website",
    },
    twitter: {
      images: DEFAULT_TWITTER_IMAGES,
      card: "summary_large_image",
      title: `${title} | WitnessOps`,
      description,
    },
  };
}

const agentActionNextSteps = [
  `${PUBLIC_AGENT_ACTION_OFFER.fitCheckQuestion.en} Do not send source files or secrets.`,
  `${PUBLIC_AGENT_ACTION_OFFER.unit.en}. ${PUBLIC_AGENT_ACTION_OFFER.price.en}.`,
  `${PUBLIC_AGENT_ACTION_OFFER.timing.en}. Payment and authority are agreed before work. This form does not start the review.`,
];

const agentActionOutputs = [
  { title: "Authority and executing identity", summary: "Who can cause the action, and which identity actually executes it." },
  { title: "Approval and permission boundary", summary: "Where approval stops, and which permissions the action can use." },
  { title: "Evidence path", summary: "Which execution evidence is available, missing, or not yet in scope." },
  { title: "Findings and explicit unknowns", summary: "Prioritized findings for that one action, with explicit unknowns left in the record." },
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
    return (
      <>
        <NewSalesIntakeClosed locale="en" reason={decision.reason} />
        <ContactCompanyDetails locale="en" />
      </>
    );
  }
  const selectedOffer = buyerServiceByPublicOfferId(PUBLIC_AGENT_ACTION_OFFER.id);
  const activeNextSteps = agentActionNextSteps;
  const activeOutputs = agentActionOutputs;

  return (
    <>
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
          {`${PUBLIC_AGENT_ACTION_OFFER.unit.en}. We’ll confirm fit before any work. No secrets or evidence yet.`}
        </p>
        <p className="mt-3 hidden max-w-[640px] text-sm leading-relaxed text-text-muted md:block">
          Prefer email? Send the same non-secret summary to{" "}
          <a
            href={salesReviewMailto(PUBLIC_CONTACT_SUBJECTS.fitCheck)}
            className="break-all text-brand-accent underline decoration-brand-accent/50 underline-offset-4 hover:decoration-brand-accent"
          >
            {PUBLIC_SALES_REVIEW_EMAIL}
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
          <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary">What happens next and scope</summary>
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
                {`${PUBLIC_AGENT_ACTION_OFFER.price.en}. ${PUBLIC_AGENT_ACTION_OFFER.timing.en}. This form is not a booking, checkout, or authority to inspect.`}
              </p>
              <p>No work or target-facing check starts from this form.</p>
              <p>No customer evidence is accepted until scope is agreed.</p>
            </div>
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
              Boundary kept clear
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-text-muted">
              <p>{selectedOffer?.boundary.en}</p>
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
        <summary className="cursor-pointer py-4 text-base font-semibold text-text-primary">What the review includes</summary>
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
          {`What ${PUBLIC_AGENT_ACTION_OFFER.name.en} includes`}
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
    <ContactCompanyDetails locale="en" />
    </>
  );
}
