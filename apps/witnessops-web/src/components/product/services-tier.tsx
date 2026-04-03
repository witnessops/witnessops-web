import Link from "next/link";

export function ServicesTier() {
  const tiers = [
    {
      tier: "TIER 1",
      name: "Recon",
      price: "Free",
      anchor: null,
      hook: "External reconnaissance with a security report and signed receipt.",
      features: [
        "External reconnaissance",
        "DNS + subdomain inventory",
        "TLS + headers review",
        "Signed receipt",
        "Security report",
      ],
      cta: { label: "Start Governed Recon", href: "#governed-recon", variant: "primary" as const },
      featured: false,
    },
    {
      tier: "TIER 2",
      name: "Assessment + Proof Bundle",
      price: "From $4,900",
      anchor: "Most teams start here",
      hook: "Deeper testing, campaign receipts, portable proof bundles, and independent verification.",
      features: [
        "Everything in Recon",
        "Active vulnerability scanning",
        "Web application testing",
        "Multi-phase campaign",
        "Campaign receipt chain",
        "Portable proof bundle",
        "Independent verification link",
        "Executive report",
      ],
      cta: { label: "Engage", href: "/contact", variant: "primary" as const },
      featured: true,
    },
    {
      tier: "TIER 3",
      name: "Continuous",
      price: "From $12,000 / quarter",
      anchor: "For regulated and high-trust environments",
      hook: "Ongoing governed operations, recurring proof, and evidence suitable for high-trust environments.",
      features: [
        "Everything in Assessment",
        "Ongoing monitoring",
        "Incident response runbooks",
        "Receipt continuity review",
        "Recurring proof bundles",
        "Compliance-ready evidence",
      ],
      cta: { label: "Engage", href: "/contact", variant: "ghost" as const },
      featured: false,
    },
  ];

  return (
    <section className="mx-auto max-w-[960px] px-6 py-24">
      {/* Differentiation */}
      <div
        className="mb-10 border border-surface-border p-6"
        style={{ background: "rgba(255,255,255,0.01)" }}
      >
        <p
          className="mb-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-signal-amber)" }}
        >
          Why This Is Different
        </p>
        <div
          className="grid gap-px bg-surface-border sm:grid-cols-3"
        >
          {[
            { stat: "Reports", label: "Most assessments produce reports. WitnessOps also produces signed evidence of what actually ran." },
            { stat: "Logs", label: "Most platforms log security events. WitnessOps produces receipts designed for verification." },
            { stat: "Trust", label: "Most verification depends on the vendor. WitnessOps is built so receipts can be checked independently." },
          ].map((item) => (
            <div key={item.label} className="bg-surface-bg p-4">
              <div
                style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}
              >
                {item.stat}
              </div>
              <div
                className="mt-2"
                style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text-muted)", lineHeight: 1.5, letterSpacing: "0.04em" }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        className="mb-3"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}
      >
        Services
      </p>
      <h2
        className="mb-3 text-text-primary"
        style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        Governed Security at Every Scale
      </h2>
      <p className="mb-10 text-sm text-text-muted">
        Every engagement runs through the same governed pipeline. The difference is depth.
      </p>

      <div className="grid grid-cols-1 gap-px bg-surface-border sm:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`bg-surface-bg p-7 flex flex-col ${t.featured ? "border-t-2 border-t-brand-accent" : ""}`}
          >
            <p
              className="mb-2"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,107,53,0.5)" }}
            >
              {t.tier}
            </p>
            <h3
              className="text-text-primary"
              style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
            >
              {t.name}
            </h3>

            {/* Price */}
            <div className="mt-2 mb-1">
              <span
                style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "0.02em" }}
              >
                {t.price}
              </span>
            </div>

            {/* Anchor / hook */}
            {t.anchor && (
              <p
                className="mb-3"
                style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", color: "var(--color-brand-accent)" }}
              >
                {t.anchor}
              </p>
            )}
            <p className="mb-4 text-xs text-text-muted leading-relaxed">{t.hook}</p>

            <ul className="space-y-0 flex-1">
              {t.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 border-b border-surface-border/50 py-2 text-text-muted"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                >
                  <span className="text-signal-green" style={{ fontSize: 10 }}>&#10003;</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href={t.cta.href}
              className={`mt-5 inline-flex items-center justify-center w-full py-3 transition-all ${
                t.cta.variant === "primary"
                  ? "bg-brand-accent text-surface-bg hover:brightness-110 hover:shadow-[0_0_20px_rgba(255,107,53,0.25)]"
                  : "border border-surface-border text-text-muted hover:border-brand-accent/40 hover:text-text-primary"
              }`}
              style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}
            >
              {t.cta.label}
            </Link>
          </div>
        ))}
      </div>

      {/* Social proof strip */}
      <div
        className="mt-6 border border-surface-border p-4 flex items-center justify-between"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.06em" }}
      >
        <span>Every engagement produces signed evidence.</span>
        <span style={{ color: "var(--color-signal-green)" }}>Receipts. Not reports.</span>
      </div>
    </section>
  );
}
