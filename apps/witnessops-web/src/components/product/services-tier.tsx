import Link from "next/link";

export function ServicesTier() {
  const phases = [
    {
      tier: "ENTRY",
      name: "Review the lane",
      anchor: "Start here",
      hook: "Read the bounded offer, see what qualifies, and decide whether one real workflow belongs in scope.",
      features: [
        "One workflow only",
        "Authority boundary focus",
        "Execution-path focus",
        "Evidence and replayability focus",
      ],
      cta: { label: "Review", href: "/review", variant: "primary" as const },
      featured: false,
    },
    {
      tier: "PRIMARY",
      name: "Request a review",
      anchor: "Single bounded lane",
      hook: "Submit one workflow, automation boundary, or operator decision path for bounded inspection.",
      features: [
        "Single intake path",
        "Business-email verification",
        "Bounded review report",
        "Named weak points and next steps",
      ],
      cta: { label: "Request review", href: "/review/request", variant: "primary" as const },
      featured: true,
    },
    {
      tier: "EVIDENCE",
      name: "Inspect the report shape",
      anchor: "Check before submitting",
      hook: "Open the sample dossier and inspect the exact review structure before you hand over a real mechanism.",
      features: [
        "Sample report",
        "System boundary",
        "Observed artifacts",
        "Blocked conclusions called out",
      ],
      cta: { label: "View sample", href: "/review/sample-report", variant: "ghost" as const },
      featured: false,
    },
  ];

  return (
    <section className="mx-auto max-w-[960px] px-6 py-24">
      <div
        className="mb-10 border border-surface-border p-6"
        style={{ background: "rgba(255,255,255,0.01)" }}
      >
        <p
          className="mb-3"
          style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-signal-amber)" }}
        >
          Lane discipline
        </p>
        <div className="grid gap-px bg-surface-border sm:grid-cols-3">
          {[
            { stat: "One", label: "One workflow, one bounded review path, one report." },
            { stat: "Bounded", label: "The review names what was inspected and what remained out of scope." },
            { stat: "Legible", label: "The public path stays review-first instead of widening into an engagement menu." },
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
        Review lane
      </p>
      <h2
        className="mb-3 text-text-primary"
        style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        One bounded offer from first click to intake
      </h2>
      <p className="mb-10 text-sm text-text-muted">
        These cards are no longer separate service tiers. They are the three public steps around the same bounded review lane.
      </p>

      <div className="grid grid-cols-1 gap-px bg-surface-border sm:grid-cols-3">
        {phases.map((t) => (
          <div
            key={t.name}
            className={`flex flex-col bg-surface-bg p-7 ${t.featured ? "border-t-2 border-t-brand-accent" : ""}`}
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

            {t.anchor && (
              <p
                className="mb-3 mt-2"
                style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", color: "var(--color-brand-accent)" }}
              >
                {t.anchor}
              </p>
            )}
            <p className="mb-4 text-xs leading-relaxed text-text-muted">{t.hook}</p>

            <ul className="flex-1 space-y-0">
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
              className={`mt-5 inline-flex w-full items-center justify-center py-3 transition-all ${
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

      <div
        className="mt-6 flex items-center justify-between border border-surface-border p-4"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-brand-muted)", letterSpacing: "0.06em" }}
      >
        <span>The public path stays review-first.</span>
        <span style={{ color: "var(--color-signal-green)" }}>Bounded. Not broadened.</span>
      </div>
    </section>
  );
}
