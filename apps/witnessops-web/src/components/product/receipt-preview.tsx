import Link from "next/link";

export function ReceiptPreview() {
  const lines = [
    { key: "receiptId", val: "rx-20260312-a7f3" },
    { key: "runbookId", val: "rb-external-recon-v1" },
    { key: "policyGate", val: "policy:external-recon:v1", bright: true },
    { key: "operator", val: "alice@acme.com" },
    { key: "timestamp", val: "2026-03-12T14:30:00.000Z" },
    { key: "prevReceipt", val: "rx-20260312-e2b1" },
    { key: "executionHash", val: "sha256:9d5e42c11cb5...", dim: true },
    { key: "signature", val: "ed25519:k7x9b2...", dim: true },
  ];

  return (
    <section className="mx-auto max-w-[620px] px-6 pb-24">
      <h2
        className="mb-6 text-text-primary"
        style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        Signed Receipt with a Clear Verification Path
      </h2>

      <div className="overflow-hidden border border-surface-border">
        <div
          className="flex items-center justify-between border-b border-surface-border px-4 py-2.5"
          style={{ background: "var(--color-brand-accent-subtle)", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" }}
        >
          <span style={{ color: "var(--color-brand-accent)" }}>Example Receipt</span>
          <span style={{ color: "var(--color-signal-green)" }}>SIGNED</span>
        </div>
        <div className="p-4">
          {lines.map((line) => (
            <div
              key={line.key}
              className="flex gap-5 py-2"
              style={{ fontFamily: "var(--font-mono)", fontSize: line.dim ? 10 : 12 }}
            >
              <span style={{ minWidth: 110, color: "var(--color-brand-muted)" }}>{line.key}</span>
              <span style={{ color: line.bright ? "var(--color-text-primary)" : line.dim ? "var(--color-brand-muted)" : "var(--color-text-secondary)" }}>
                {line.val}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-text-muted">
        Receipts can be verified with the correct public key. Proof bundles
        extend this into portable, offline verification.
      </p>
      <div className="mt-6">
        <Link
          href="/verify"
          className="inline-flex items-center border border-surface-border px-4 py-3 text-text-primary transition-all hover:border-brand-accent/40 hover:text-brand-accent"
          style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
        >
          Verify a Receipt
        </Link>
      </div>
    </section>
  );
}
