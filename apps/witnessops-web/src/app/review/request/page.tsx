import type { Metadata } from "next";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { getMailboxConfig } from "@/lib/mailboxes";

export const metadata: Metadata = {
  title: "Request a Review",
  description:
    "Bring one workflow, automation boundary, or operator decision path. This page sends a bounded review request for email follow-up.",
  alternates: {
    canonical: "/review/request",
  },
  openGraph: {
    title: "Request a Review | WitnessOps",
    description:
      "Bring one workflow, automation boundary, or operator decision path. This page sends a bounded review request for email follow-up.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request a Review | WitnessOps",
    description:
      "Bring one workflow, automation boundary, or operator decision path. This page sends a bounded review request for email follow-up.",
  },
};

const statusChips = [
  { label: "Surface", value: "Email follow-up" },
  { label: "Scope", value: "One real workflow" },
  { label: "Lane", value: "Review intake" },
];

const reviewBullets = [
  "Who can approve or act",
  "Which tools and permissions matter",
  "What runs and in what order",
  "What evidence is kept",
  "What can be replayed later",
  "What looks weak",
  "What to do next",
];

const prepareBullets = [
  "Name one workflow or operator decision path",
  "List the systems, tools, and permissions involved",
  "State who could approve or act",
  "Describe the evidence you already have",
  "Include time bounds or key event order if known",
];

const exclusionBullets = [
  "Product help, access issues, and verifier questions belong on /support",
  "Responsible disclosure belongs on /security",
  "Do not use this page for a broad audit or catch-all security engagement",
];

const nextSteps = [
  "We review whether the request fits one bounded path",
  "We continue by email to confirm scope, limits, and missing evidence",
  "No review result is produced at submit time",
];

export default function ReviewRequestPage() {
  const mailboxes = getMailboxConfig();

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1100px] px-6 py-20">
      <div
        className="mb-10 border-y border-surface-border py-3 text-center"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--color-brand-muted)",
        }}
      >
        Controlled · Provable · Bounded · Fail-safe
      </div>

      <div className="grid gap-0 border border-surface-border md:grid-cols-2">
        <div className="flex flex-col justify-between border-r border-surface-border p-10 md:p-12">
          <div>
            <h1
              className="mb-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Request a review
            </h1>
            <p className="mb-6 max-w-[420px] text-sm leading-relaxed text-text-muted">
              Bring one workflow, one automation boundary, or one operator
              decision path. This page sends a bounded review request for
              email follow-up. We continue by email after intake review.
            </p>

            <div className="mb-8 flex flex-wrap gap-2">
              {statusChips.map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-full border border-surface-border bg-surface-bg px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-text-muted"
                >
                  <span className="font-semibold text-text-primary">{chip.label}:</span>{" "}
                  {chip.value}
                </div>
              ))}
            </div>

            <div
              className="mb-10 space-y-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}
            >
              <div>One workflow.</div>
              <div>One review request.</div>
              <div>One email thread.</div>
              <div>Clear limits.</div>
            </div>

            <ul className="border-t border-surface-border">
              {reviewBullets.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 border-b border-surface-border py-3"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)" }}
                >
                  <span style={{ color: "var(--color-signal-green)", fontSize: 10 }}>&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 border border-surface-border bg-surface-bg p-5">
              <div
                className="mb-3"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                }}
              >
                Prepare before you submit
              </div>
              <ul className="space-y-2 text-sm leading-relaxed text-text-muted">
                {prepareBullets.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span style={{ color: "var(--color-brand-accent)" }}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p
              className="mt-6 max-w-[420px] text-xs leading-relaxed text-text-muted"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.03em" }}
            >
              This request is for one real path only. It is not a broad audit, a
              catch-all security engagement, or an instant review result.
            </p>
          </div>

          <div
            className="mt-10"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--color-brand-muted)", lineHeight: 1.8 }}
          >
            <div>Respect the penguin.</div>
            <div>Bring receipts.</div>
          </div>
        </div>

        <div className="p-10 md:p-12" style={{ background: "var(--color-surface-bg-alt)" }}>
          <div
            className="mb-2"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            Submit one workflow for review
          </div>
          <p className="mb-6 text-sm leading-relaxed text-text-muted">
            Submit one workflow, automation boundary, or operator decision path.
            We respond by email from the review intake mailbox.
          </p>

          <div className="mb-6 border border-surface-border bg-surface-bg p-5">
            <div
              className="mb-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              What happens next
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-text-muted">
              {nextSteps.map((item) => (
                <li key={item} className="flex gap-3">
                  <span style={{ color: "var(--color-brand-accent)" }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6 border border-surface-border bg-surface-bg p-5">
            <div
              className="mb-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Use another lane instead
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-text-muted">
              {exclusionBullets.map((item) => (
                <li key={item} className="flex gap-3">
                  <span style={{ color: "var(--color-brand-accent)" }}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <ContactForm contactEmail={mailboxes.engage} />

          <p className="mt-6 text-xs leading-relaxed text-text-muted" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.03em" }}>
            The details you enter here are sent for email follow-up through the review intake mailbox. Do not paste secrets or material you cannot place in email.
          </p>
        </div>
      </div>
    </main>
  );
}
