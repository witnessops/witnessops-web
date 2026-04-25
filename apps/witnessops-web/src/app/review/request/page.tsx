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
  "We check whether the workflow fits one bounded proof run.",
  "We identify the approval boundary and evidence gaps.",
  "We reply by email with the proof-run scope and next action.",
];

const sampleArtifacts = [
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
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1180px] px-6 py-20">
      <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
        <section className="border border-surface-border p-8 md:p-10">
          <div className="mb-8">
            <h1
              className="mb-5 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary md:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Request an AI Agent Action Proof Run
            </h1>
            <p className="max-w-[560px] text-base leading-relaxed text-text-muted">
              Bring one agent-assisted workflow where later scrutiny matters.
              We map the approval boundary, evidence path, receipt shape,
              verifier result, and challenge path.
            </p>
          </div>

          <div className="mb-8 border-t border-surface-border pt-6">
            <div
              className="mb-4"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              What you get back
            </div>
            <div className="space-y-4">
              {proofOutputs.map((item, index) => (
                <div key={item.title} className="grid gap-2 border-b border-surface-border pb-4 sm:grid-cols-[48px_1fr]">
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
          </div>

          <div className="border border-surface-border bg-surface-bg-alt p-5">
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
            <ul className="mb-4 grid gap-2 text-xs leading-relaxed text-text-muted sm:grid-cols-2" style={{ fontFamily: "var(--font-mono)" }}>
              {sampleArtifacts.map((artifact) => (
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
              View public sample proof run
            </Link>
          </div>
        </section>

        <section className="border border-surface-border p-8 md:p-10" style={{ background: "var(--color-surface-bg-alt)" }}>
          <div className="mb-8 border border-surface-border bg-surface-bg p-5">
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
          </div>

          <ContactForm contactEmail={mailboxes.engage} />

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="border border-surface-border bg-surface-bg p-5">
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
                Before you submit
              </div>
              <p className="text-sm leading-relaxed text-text-muted">
                Describe the workflow and evidence path only. Do not paste
                secrets, private keys, credentials, customer records, or MFA
                codes.
              </p>
            </div>

            <div className="border border-surface-border bg-surface-bg p-5">
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
                Sample boundary
              </div>
              <p className="text-sm leading-relaxed text-text-muted">
                The public sample proves receipt shape and verifier path only.
                It is not a production deployment, legal compliance claim, or
                complete AI governance program.
              </p>
            </div>
          </div>

          <div className="mt-6 text-sm leading-relaxed text-text-muted">
            Product help, access issues, and verifier questions: <Link href="/support" className="text-brand-accent underline-offset-4 hover:underline">Support</Link>.
            <span className="mx-2 text-surface-border">/</span>
            Responsible disclosure: <Link href="/security" className="text-brand-accent underline-offset-4 hover:underline">Security</Link>.
          </div>
        </section>
      </div>
    </main>
  );
}
