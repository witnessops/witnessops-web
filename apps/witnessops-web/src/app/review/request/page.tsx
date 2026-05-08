import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { getMailboxConfig } from "@/lib/mailboxes";

export const metadata: Metadata = {
  title: "Request One Proof Run",
  description:
    "Send a short, non-secret fit request for one bounded technical action. No proof run starts from this form, and no files, logs, screenshots, secrets, credentials, or customer evidence belong in the first message.",
  alternates: {
    canonical: "/review/request",
  },
  openGraph: {
    title: "Request One Proof Run | WitnessOps",
    description:
      "Send a short, non-secret fit request for one bounded technical action. No proof run starts from this form, and no files, logs, screenshots, secrets, credentials, or customer evidence belong in the first message.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request One Proof Run | WitnessOps",
    description:
      "Send a short, non-secret fit request for one bounded technical action. No proof run starts from this form, and no files, logs, screenshots, secrets, credentials, or customer evidence belong in the first message.",
  },
};

const proofOutputs = [
  {
    title: "Boundary map",
    summary: "What action is in scope, who approved it, who acted, and where authority stops.",
  },
  {
    title: "Action path",
    summary: "The one workflow, tool path, or touched system under review.",
  },
  {
    title: "Evidence manifest",
    summary: "Available artifact classes, source references, hashes where available, and known gaps.",
  },
  {
    title: "Receipt artifact and verifier path",
    summary: "Package artifacts that name approval, action, evidence references, limits, and challenge path when the scope supports them.",
  },
];

const nextSteps = [
  "We check whether the technical action is bounded enough for one proof pack.",
  "We confirm the system boundary, action path, likely evidence sources, and obvious gaps.",
  "We reply with fit, scope, fee, and next action before any source materials are accepted.",
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
          Proof Run Request
        </div>
        <h1
          className="mb-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary md:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Request one proof run
        </h1>
        <p className="max-w-[640px] text-base leading-relaxed text-text-muted">
          Name one code patch, security finding, AI-agent action, access
          decision, or operational handoff you want packaged. No files, logs,
          screenshots, exports, credentials, private keys, MFA codes, or
          customer evidence are needed for the first fit check.
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
              <p>Fee, timing, and evidence handling are confirmed by email after the first fit check.</p>
              <p>No proof run starts from this form.</p>
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
              Typical bundle
            </div>
            <ul className="mb-4 grid gap-2 text-xs leading-relaxed text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
              {sampleArtifacts.slice(0, 5).map((artifact) => (
                <li key={artifact} className="flex items-center gap-2">
                  <span style={{ color: "var(--color-signal-green)", fontSize: 9 }}>&#10003;</span>
                  <span>{artifact}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/review/sample-cases/ai-agent-action-proof-run"
              className="text-sm text-brand-accent underline-offset-4 hover:underline"
            >
              Inspect sample package
            </Link>
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
              <p>Not a production deployment claim.</p>
              <p>Not a legal compliance claim.</p>
              <p>Not a complete AI governance program.</p>
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
          What the proof pack contains
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
