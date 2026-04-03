export function GovernedExecutionSection() {
  return (
    <section id="governed-execution" className="section-gradient-subtle py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <h2 className="mb-6 text-3xl font-bold">Governed Execution</h2>
        <p className="mb-12 max-w-[720px] text-lg text-text-secondary">
          Every operational action passes through a policy gate before execution.
          The result is a signed receipt that proves what ran, under what authority,
          and with what outcome.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {["Policy Gate", "Runbook", "Execution", "Receipt", "Chain"].map((step, i) => (
            <div key={step} className="flex items-center gap-4">
              <div className="rounded border border-surface-border bg-surface-card px-6 py-3 text-sm font-medium">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent/10 text-xs font-bold text-brand-accent">
                  {i + 1}
                </span>
                {step}
              </div>
              {i < 4 && <span className="text-text-muted">{"\u2192"}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
