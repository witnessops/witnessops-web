import Link from "next/link";

export function SystemFraming() {
  return (
    <section className="mx-auto max-w-[960px] px-6 pt-32 pb-20">
      <p
        className="mb-4"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--color-brand-accent)",
        }}
      >
        Consequential Work with Portable Proof
      </p>

      <h1
        className="max-w-[18ch] text-text-primary mb-6"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(36px, 6vw, 56px)",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          lineHeight: 1.02,
        }}
      >
        Bounded reviews with clear handover.
      </h1>

      <p className="max-w-[540px] text-base leading-relaxed text-text-secondary mb-6">
        WitnessOps delivers bounded security and operational reviews with evidence
        references, named limits, and a practical handover.
      </p>

      <div className="max-w-[540px] space-y-2 text-sm leading-relaxed mb-8" style={{ color: "var(--color-text-muted)" }}>
        <p>Agree scope before work starts.</p>
        <p>Keep observed evidence separate from assumptions.</p>
        <p>Hand over a result another person can inspect.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/catalog"
          className="inline-flex items-center bg-brand-accent px-5 py-3 text-surface-bg transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,107,53,0.25)]"
          style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          View services
        </Link>
        <Link
          href="/verify"
          className="inline-flex items-center border border-surface-border px-5 py-3 text-text-primary transition-all hover:border-brand-accent/40 hover:text-brand-accent"
          style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          Verify a receipt
        </Link>
      </div>

      <p
        className="max-w-[540px] text-sm leading-relaxed mb-10"
        style={{ color: "var(--color-text-muted)" }}
      >
        Start with a non-secret fit check. Do not send secrets during first contact.
      </p>

      {/* Trust strip */}
      <div
        className="border-y border-surface-border py-3 flex items-center gap-3"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--color-brand-muted)",
        }}
      >
        <span>signed</span>
        <span style={{ color: "var(--color-surface-border)" }}>&middot;</span>
        <span>timestamped</span>
        <span style={{ color: "var(--color-surface-border)" }}>&middot;</span>
        <span>tamper-evident</span>
        <span style={{ color: "var(--color-surface-border)" }}>&middot;</span>
        <span>offline-verifiable</span>
      </div>

      <p
        className="mt-6 max-w-[540px] text-sm leading-relaxed"
        style={{ color: "var(--color-brand-accent)" }}
      >
        Do not trust the claim. Verify the artifacts.
      </p>
    </section>
  );
}
