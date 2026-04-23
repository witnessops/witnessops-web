import type { Metadata } from "next";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { getMailboxConfig } from "@/lib/mailboxes";

export const metadata: Metadata = {
  title: "Request a Review",
  description:
    "Bring one workflow, automation boundary, or operator decision path. This page starts a bounded review intake for one real path, covering authority, execution, and evidence, and requires mailbox verification before the request enters the queue.",
  alternates: {
    canonical: "/review/request",
  },
  openGraph: {
    title: "Request a Review | WitnessOps",
    description:
      "Bring one workflow, automation boundary, or operator decision path. This page starts a bounded review intake for one real path, covering authority, execution, and evidence, and requires mailbox verification before the request enters the queue.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request a Review | WitnessOps",
    description:
      "Bring one workflow, automation boundary, or operator decision path. This page starts a bounded review intake for one real path, covering authority, execution, and evidence, and requires mailbox verification before the request enters the queue.",
  },
};

const statusChips = [
  { label: "Surface", value: "Live intake" },
  { label: "Scope", value: "One real workflow" },
  { label: "Gate", value: "Mailbox verification" },
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
              decision path. This page starts a bounded review intake for one
              real path: authority path, execution path, evidence kept, and
              what another person can check later. The request enters the queue
              only after mailbox verification.
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
              <div>One queue entry.</div>
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
            Describe one real path with real authority, execution, and evidence.
            Mailbox verification is required before the request enters the queue.
          </p>
          <ContactForm contactEmail={mailboxes.engage} />
        </div>
      </div>
    </main>
  );
}
