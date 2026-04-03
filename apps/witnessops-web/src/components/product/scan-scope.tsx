export function ScanScope() {
  const included = [
    "DNS / NS / MX / TXT records",
    "Subdomain enumeration",
    "HTTP/TLS reachability",
    "TLS configuration review",
    "Security headers check",
    "Service fingerprinting",
  ];

  const excluded = [
    "Exploitation",
    "Brute force / credentials",
    "Intrusive fuzzing",
    "Authenticated testing",
    "Destructive actions",
    "Mailbox testing",
  ];

  return (
    <section className="mx-auto max-w-[700px] px-6 pb-24">
      <h2 className="mb-8 text-center text-2xl font-bold text-text-primary">
        Governed scope. Nothing more.
      </h2>
      <div className="grid grid-cols-2 gap-12">
        <div>
          <p className="mb-4 border-b border-surface-border pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-signal-green">
            Included
          </p>
          {included.map((item) => (
            <p key={item} className="flex items-center gap-3 py-2 text-sm text-text-secondary">
              <span className="text-signal-green">&#10003;</span> {item}
            </p>
          ))}
        </div>
        <div>
          <p className="mb-4 border-b border-surface-border pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            Excluded
          </p>
          {excluded.map((item) => (
            <p key={item} className="flex items-center gap-3 py-2 text-sm text-text-muted">
              <span>&mdash;</span> {item}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
