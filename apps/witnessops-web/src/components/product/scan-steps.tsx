export function ScanSteps() {
  const steps = [
    {
      num: "01",
      title: "Verify Your Domain",
      desc: "We confirm control of a mailbox on your business domain.",
      badge: "DOMAIN VERIFIED",
      badgeColor: "var(--color-text-muted)",
      badgeBorder: "var(--color-surface-border)",
    },
    {
      num: "02",
      title: "Approve the Scope",
      desc: "You see what will be tested and approve it before execution begins.",
      badge: "APPROVAL GATE",
      badgeColor: "var(--color-brand-accent)",
      badgeBorder: "rgba(255,107,53,0.2)",
    },
    {
      num: "03",
      title: "Run the Operation",
      desc: "WitnessOps executes the governed recon within the approved boundary.",
      badge: "GOVERNED EXECUTION",
      badgeColor: "var(--color-brand-accent)",
      badgeBorder: "rgba(255,107,53,0.2)",
    },
    {
      num: "04",
      title: "Receive Proof",
      desc: "You get a security report, a signed receipt, and a clear verification path.",
      badge: "RECEIPT SIGNED",
      badgeColor: "var(--color-signal-green)",
      badgeBorder: "rgba(0,212,126,0.2)",
    },
  ];

  return (
    <section className="mx-auto max-w-[960px] px-6 py-24">
      <p
        className="mb-3"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}
      >
        How It Works
      </p>
      <div className="grid grid-cols-1 gap-px bg-surface-border sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.num} className="bg-surface-bg px-8 py-10">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 36,
                fontWeight: 700,
                color: "rgba(255,107,53,0.08)",
                lineHeight: 1,
              }}
            >
              {step.num}
            </span>
            <h3
              className="mt-4 mb-2 text-text-primary"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {step.title}
            </h3>
            <p className="text-xs leading-relaxed text-text-muted">{step.desc}</p>
            <span
              className="mt-4 inline-block"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "3px 8px",
                border: `1px solid ${step.badgeBorder}`,
                color: step.badgeColor,
              }}
            >
              {step.badge}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
