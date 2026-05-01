import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Request verified",
  description:
    "Mailbox verification is complete for a WitnessOps AI-agent proof-run request.",
  robots: { index: false, follow: false },
};

const nextSteps = [
  "WitnessOps reviews whether the agent-assisted workflow is bounded enough for one proof run.",
  "We confirm the authority boundary, action path, likely evidence sources, verifier result, and obvious gaps.",
  "We reply by email with fit, scope, fee, and next action.",
];

const waitLinks = [
  {
    href: "/docs/how-it-works/verification",
    label: "How verification works",
    body: "Read the verification model and how WitnessOps separates proof from claims.",
  },
  {
    href: "/library",
    label: "Library",
    body: "Browse public docs, sample cases, proof bundles, and proof presentation material.",
  },
  {
    href: "/review",
    label: "Proof-run offer",
    body: "Review the bounded offer, outputs, fit, and claim boundaries.",
  },
  {
    href: "/support",
    label: "Support",
    body: "Use support for non-secret questions about the request path.",
  },
];

export default function ReviewRequestConfirmedPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-[960px] px-6 py-12 md:py-16"
    >
      <section className="mb-10 max-w-[720px]">
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
          AI-agent proof-run request
        </div>
        <h1
          className="mb-4 text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary md:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Request verified
        </h1>
        <p className="max-w-[620px] text-base leading-relaxed text-text-muted">
          Your mailbox is verified for this AI-agent proof-run request.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section
          className="border border-surface-border p-6 md:p-8"
          style={{ background: "var(--color-surface-bg-alt)" }}
        >
          <div className="space-y-5 text-sm leading-relaxed text-text-muted">
            <p className="text-base text-text-primary">
              No proof run has started yet.
            </p>
            <p>No customer evidence has been accepted.</p>
            <p>
              Source materials are handled only after scope, fee, and evidence
              handling are agreed.
            </p>
            <p>
              Do not submit secrets, credentials, private keys, MFA codes,
              source exports, full logs, screenshots, or customer evidence until
              the intake path is agreed.
            </p>
          </div>

          <div className="mt-8 border-t border-surface-border pt-6">
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
              What happens next
            </div>
            <ol className="space-y-4 text-sm leading-relaxed text-text-muted">
              {nextSteps.map((item, index) => (
                <li key={item} className="grid grid-cols-[32px_1fr] gap-3">
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-brand-accent)",
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
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
              Boundary
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-text-muted">
              <p>Not a production deployment claim.</p>
              <p>Not a legal compliance claim.</p>
              <p>Not a complete AI governance program.</p>
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
              While you wait
            </div>
            <div className="space-y-4">
              {waitLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block border border-surface-border p-3 transition hover:border-brand-accent"
                >
                  <span className="block text-sm font-semibold text-text-primary">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-muted">
                    {item.body}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
