export function ScanScope() {
  const included = [
    "One named workflow or decision path",
    "Observed authority boundary",
    "Tool and permission review",
    "Execution-path inspection",
    "Evidence capture assessment",
    "Replayability judgment",
  ];

  const excluded = [
    "Broad audit coverage",
    "Continuous assurance claims",
    "Multi-workflow expansion",
    "Open-ended consulting",
    "Unbounded architecture review",
    "Runtime operation on your behalf",
  ];

  return (
    <section className="mx-auto max-w-[700px] px-6 pb-24">
      <h2 className="mb-8 text-center text-2xl font-bold text-text-primary">
        Bounded scope. Nothing more.
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
