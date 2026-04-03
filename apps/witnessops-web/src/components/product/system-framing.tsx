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
        Proof-Backed Security Operations
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
        Every operation witnessed. Every result verifiable.
      </h1>

      <p className="max-w-[540px] text-base leading-relaxed text-text-secondary mb-6">
        WitnessOps runs governed security operations and produces signed,
        timestamped receipts for what was executed, what was approved, and what
        stayed in scope.
      </p>

      <div className="max-w-[540px] space-y-2 text-sm leading-relaxed mb-8" style={{ color: "var(--color-text-muted)" }}>
        <p>Not just reports.</p>
        <p>Not just logs.</p>
        <p>Portable evidence you can verify independently.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="#governed-recon"
          className="inline-flex items-center bg-brand-accent px-5 py-3 text-surface-bg transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,107,53,0.25)]"
          style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          Start Governed Recon
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center border border-surface-border px-5 py-3 text-text-primary transition-all hover:border-brand-accent/40 hover:text-brand-accent"
          style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          Engage
        </Link>
      </div>

      <p
        className="max-w-[540px] text-sm leading-relaxed mb-10"
        style={{ color: "var(--color-text-muted)" }}
      >
        Built for teams that need proof, not post-hoc storytelling.
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
    </section>
  );
}
