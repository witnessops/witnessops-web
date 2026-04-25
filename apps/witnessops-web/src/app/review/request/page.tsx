import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { getMailboxConfig } from "@/lib/mailboxes";

export const metadata: Metadata = {
  title: "Request an AI Agent Action Proof Run",
  description:
    "Submit one consequential AI-agent action path for a bounded WitnessOps proof run.",
  alternates: {
    canonical: "/review/request",
  },
  openGraph: {
    title: "Request an AI Agent Action Proof Run | WitnessOps",
    description:
      "Submit one consequential AI-agent action path for a bounded WitnessOps proof run.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request an AI Agent Action Proof Run | WitnessOps",
    description:
      "Submit one consequential AI-agent action path for a bounded WitnessOps proof run.",
  },
};

const reviewBullets = [
  "Authority map",
  "Agent action boundary",
  "Approval gate",
  "Evidence manifest",
  "Signed receipt",
  "Verifier result",
  "Challenge path",
  "Failure-state notes",
];

const nextSteps = [
  "We check that it fits one bounded agent-action path",
  "We reply by email with scope, evidence gaps, and the proof-run boundary",
];

const sampleBundleHref =
  "/review/sample-cases/ai-agent-action-proof-run";

export default function ReviewRequestPage() {
  const mailboxes = getMailboxConfig();

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1100px] px-6 py-20">
      <div className="grid gap-0 border border-surface-border md:grid-cols-2">
        <div className="border-r border-surface-border p-10 md:p-12">
          <div>
            <h1
              className="mb-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Request an AI Agent Action Proof Run
            </h1>
            <p className="mb-6 max-w-[420px] text-sm leading-relaxed text-text-muted">
              Bring one consequential AI-agent action path. Proof-run scoping
              continues by email.
            </p>

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
          </div>
        </div>

        <div className="p-10 md:p-12" style={{ background: "var(--color-surface-bg-alt)" }}>
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
              Sample boundary
            </div>
            <p className="text-sm leading-relaxed text-text-muted">
              The public sample proves the receipt shape and verifier path only.
              It does not claim production deployment, legal compliance, or
              complete AI governance coverage.
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              <Link
                href={sampleBundleHref}
                className="text-brand-accent underline-offset-4 hover:underline"
              >
                Open the AI Agent Action Proof Run sample
              </Link>
            </p>
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
              Other lanes
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-text-muted">
              <p>
                Product help, access issues, and verifier questions: <Link href="/support" className="text-brand-accent underline-offset-4 hover:underline">Support</Link>.
              </p>
              <p>
                Responsible disclosure: <Link href="/security" className="text-brand-accent underline-offset-4 hover:underline">Security</Link>.
              </p>
            </div>
          </div>

          <ContactForm contactEmail={mailboxes.engage} />

          <p className="mt-6 text-xs leading-relaxed text-text-muted" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.03em" }}>
            Email follow-up only. Do not paste secrets.
          </p>
        </div>
      </div>
    </main>
  );
}
