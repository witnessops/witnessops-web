export function ScanOutput() {
  const items = [
    { title: "Security Report", desc: "Plain-language findings on exposed services, DNS, TLS posture, headers, and visible attack surface." },
    { title: "Signed Receipt", desc: "A signed record of the governed action, including operator, policy gate, timestamp, and execution binding." },
    { title: "Verification Path", desc: "A verification path that does not depend on WitnessOps remaining in the loop." },
  ];

  return (
    <section className="mx-auto max-w-[960px] px-6 py-24">
      <p
        className="mb-3"
        style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-brand-muted)" }}
      >
        What You Receive
      </p>
      <h2
        className="mb-8 text-text-primary"
        style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
      >
        Security Report, Signed Receipt, Verification Path
      </h2>
      <div className="grid grid-cols-1 gap-px bg-surface-border sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="bg-surface-bg p-7">
            <h3
              className="mb-2 text-text-primary"
              style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {item.title}
            </h3>
            <p className="text-xs leading-relaxed text-text-muted">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
