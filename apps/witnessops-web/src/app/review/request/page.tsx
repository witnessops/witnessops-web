import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { getMailboxConfig } from "@/lib/mailboxes";

export const metadata: Metadata = {
  title: "Request one proof run",
  description:
    "Submit one consequential AI-agent action path for a bounded WitnessOps proof run.",
  alternates: {
    canonical: "/review/request",
  },
  openGraph: {
    title: "Request one proof run | WitnessOps",
    description:
      "Submit one consequential AI-agent action path for a bounded WitnessOps proof run.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request one proof run | WitnessOps",
    description:
      "Submit one consequential AI-agent action path for a bounded WitnessOps proof run.",
  },
};

const proofOutputs = [
  {
    title: "Authority map",
    summary: "Who approved the action and where authority stopped.",
  },
  {
    title: "Evidence manifest",
    summary: "What artifacts exist, what they bind to, and what is missing.",
  },
  {
    title: "Signed receipt",
    summary: "The bound record of approval, action, evidence, result, and limits.",
  },
  {
    title: "Verifier result + challenge path",
    summary: "What another party can check, fail, or dispute after the run.",
  },
];

const nextSteps = [
  "We review whether the workflow can be scoped as one bounded proof run.",
  "We identify the approval boundary and evidence gaps.",
  "We reply by email with fit, scope, and the next action. No proof run starts from the form alone.",
];

const sampleArtifacts = [
  "ACTION_BOUNDARY.json",
  "AUTHORITY_MAP.json",
  "EVIDENCE_MANIFEST.json",
  "RECEIPT.json",
  "VERIFY_RESULT.json",
  "CHALLENGE_PATH.md",
];

const sampleBundleHref =
  "/review/sample-cases/ai-agent-action-proof-run";

export default function ReviewRequestPage() {
  const mailboxes = getMailboxConfig();

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1040px] px-6 py-12 md:py-16">
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
          AI agent action proof run
        </div>
        <h1
          className="mb-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary md:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Submit one proof run
        </h1>
        <p className="max-w-[620px] text-base leading-relaxed text-text-muted">
          Send the minimum context. We reply by email before anything runs.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="border border-surface-border p-6 md:p-8" style={{ background: "var(--color-surface-bg-alt)" }}>
          <ContactForm contactEmail={mailboxes.engage} />
        </section>

        <aside className="space-y-4">
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
              {nextSteps.map((item, index) => (
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
              Keep it light
            </div>
            <p className="text-sm leading-relaxed text-text-muted">
              Do not paste secrets. A short description is enough for the first
              review.
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
              Sample proof bundle
            </div>
            <ul className="mb-4 grid gap-2 text-xs leading-relaxed text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
              {sampleArtifacts.slice(0, 4).map((artifact) => (
                <li key={artifact} className="flex items-center gap-2">
                  <span style={{ color: "var(--color-signal-green)", fontSize: 9 }}>&#10003;</span>
                  <span>{artifact}</span>
                </li>
              ))}
            </ul>
            <Link
              href={sampleBundleHref}
              className="text-sm text-brand-accent underline-offset-4 hover:underline"
            >
              View sample proof run
            </Link>
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
          What you get back
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {proofOutputs.map((item, index) => (
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
    </main>
  );
}
