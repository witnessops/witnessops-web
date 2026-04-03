import type { Metadata } from "next";
import { getCanonicalAlternates } from "@witnessops/config";
import { ContactForm } from "./contact-form";
import { getMailboxConfig } from "@/lib/mailboxes";

export const metadata: Metadata = {
  title: "Engage",
  description: "Tell us what you need governed. Every engagement runs through the same governed pipeline.",
  alternates: getCanonicalAlternates("witnessops", "/contact"),
};

export default function ContactPage() {
  const mailboxes = getMailboxConfig();
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-20">
      {/* Proof bar */}
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
        Controlled &middot; Provable &middot; Bounded &middot; Fail-safe
      </div>

      {/* Split layout */}
      <div className="grid gap-0 md:grid-cols-2 border border-surface-border">
        {/* Left — value prop */}
        <div className="border-r border-surface-border p-10 md:p-12 flex flex-col justify-between">
          <div>
            <h1
              className="text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-text-primary mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Engage
            </h1>
            <p className="text-sm leading-relaxed text-text-muted mb-8 max-w-[360px]">
              Every engagement runs through the same governed pipeline.
            </p>

            {/* Pipeline words */}
            <div
              className="mb-10 space-y-1"
              style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.04em", color: "var(--color-text-secondary)" }}
            >
              <div>Scoped.</div>
              <div>Approved.</div>
              <div>Receipted.</div>
              <div>Verifiable.</div>
            </div>

            {/* Checklist */}
            <ul className="border-t border-surface-border">
              {[
                "Policy-gated execution",
                "Signed evidence chains",
                "Independent verification",
                "Compliance-ready deliverables",
                "Response within 1 business day",
              ].map((item) => (
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

          {/* Penguin motto */}
          <div
            className="mt-10"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--color-brand-muted)", lineHeight: 1.8 }}
          >
            <div>Respect the penguin.</div>
            <div>Bring receipts.</div>
          </div>
        </div>

        {/* Right — form */}
        <div className="p-10 md:p-12" style={{ background: "var(--color-surface-bg-alt)" }}>
          <div
            className="mb-6"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            Get started
          </div>
          <ContactForm contactEmail={mailboxes.engage} />
        </div>
      </div>
    </div>
  );
}
