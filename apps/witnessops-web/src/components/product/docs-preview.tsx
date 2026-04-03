import Link from "next/link";

export function DocsPreview() {
  const docs = [
    { section: "SYSTEM", title: "How governed execution works", desc: "How WitnessOps wraps tooling in policy-gated, scope-enforced execution.", href: "/docs/security-systems/governed-execution" },
    { section: "RECEIPTS", title: "What a receipt contains", desc: "The canonical fields, execution hash, chain links, and signed record structure.", href: "/docs/evidence/receipt-spec" },
    { section: "VERIFICATION", title: "How verification works", desc: "How to verify signatures, execution integrity, and proof artifacts independently.", href: "/docs/how-it-works/verification" },
    { section: "TRUST", title: "Trust boundaries", desc: "Where WitnessOps control ends, what it delegates, and what remains a trust assumption.", href: "/docs/security-systems/threat-model" },
  ];

  return (
    <section className="mx-auto max-w-[960px] px-6 pb-24">
      <p
        className="mb-3"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}
      >
        Documentation
      </p>
      <h2
        className="mb-3 text-text-primary"
        style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        Understand the System
      </h2>
      <p className="mb-8 text-sm text-text-muted">
        Learn how governed execution works, what a receipt contains, how verification works, and where the trust boundaries are.
      </p>

      <div className="grid grid-cols-1 gap-px bg-surface-border border border-surface-border sm:grid-cols-2">
        {docs.map((doc) => (
          <Link
            key={doc.title}
            href={doc.href}
            className="block bg-surface-bg p-6 transition-all hover:bg-surface-card group"
          >
            <p
              className="mb-2"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,107,53,0.4)" }}
            >
              {doc.section}
            </p>
            <h3
              className="text-text-primary group-hover:text-brand-accent transition-colors"
              style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              {doc.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">{doc.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center border border-surface-border px-4 py-3 text-text-primary transition-all hover:border-brand-accent/40 hover:text-brand-accent"
            style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Docs
          </Link>
          <Link
            href="/verify"
            className="inline-flex items-center border border-surface-border px-4 py-3 text-text-primary transition-all hover:border-brand-accent/40 hover:text-brand-accent"
            style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            Verify
          </Link>
        </div>
      </div>
    </section>
  );
}
