import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { getMailboxConfig } from "@/lib/mailboxes";

export const metadata: Metadata = {
  title: "Request one access-change proof run",
  description:
    "Start one bounded access-change proof run without submitting secrets or source evidence.",
  alternates: {
    canonical: "/review/request",
  },
  openGraph: {
    title: "Request one access-change proof run | WitnessOps",
    description:
      "Start one bounded access-change proof run without submitting secrets or source evidence.",
    siteName: "WitnessOps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Request one access-change proof run | WitnessOps",
    description:
      "Start one bounded access-change proof run without submitting secrets or source evidence.",
  },
};

const proofOutputs = [
  {
    title: "Run manifest",
    summary: "What access-change action is in scope, when it happened, and what system is involved.",
  },
  {
    title: "Authority record",
    summary: "Who had authority to approve the change and what boundary is being claimed.",
  },
  {
    title: "Evidence manifest",
    summary: "What source artifacts exist, where they came from, and what remains missing.",
  },
  {
    title: "Custody, receipt, and findings",
    summary: "How the evidence was handled, what the receipt binds, and what the run concludes.",
  },
];

const nextSteps = [
  "We check whether the access change can be bounded to one proof run.",
  "We confirm the authority boundary, likely evidence sources, and obvious gaps.",
  "We reply by email with fit, scope, fee, and the next action. No proof run starts from the form alone.",
];

const sampleArtifacts = [
  "run_manifest.json",
  "authority_record.json",
  "evidence_manifest.json",
  "custody_log.json",
  "receipt.json",
  "verifier_readme.md",
  "findings.md",
];

const offerPageHref = "/access-change-proof-run";

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
          Bounded access-change proof run
        </div>
        <h1
          className="mb-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary md:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Request one access-change proof run
        </h1>
        <p className="max-w-[620px] text-base leading-relaxed text-text-muted">
          Send short non-secret context for one access grant, revoke, role
          change, vendor access review, or admin permission update. Source
          materials are handled only after scope and intake are agreed.
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
              Do not submit secrets, credentials, source exports, full logs,
              screenshots, or customer evidence. Name evidence types only.
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
              Fee and timeline
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-text-muted">
              <p>EUR 2,500 fixed fee.</p>
              <p>5 business days after source materials are received.</p>
              <p>50% upfront, 50% on delivery.</p>
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
              Proof-run bundle
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
              href={offerPageHref}
              className="text-sm text-brand-accent underline-offset-4 hover:underline"
            >
              View access-change offer
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
              Boundary
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-text-muted">
              <p>Not a legal audit opinion.</p>
              <p>Not a compliance certification.</p>
              <p>Not a verifier-of-record result.</p>
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
