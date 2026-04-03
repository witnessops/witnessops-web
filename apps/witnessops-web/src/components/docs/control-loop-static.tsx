import Link from "next/link";

const controlStages = [
  {
    id: "intent",
    label: "Stage 01",
    title: "Operator Intent",
    body: "An operator declares the requested run, target, or remediation path.",
    tone: "border-white/12 bg-[linear-gradient(180deg,rgba(18,22,28,0.96)_0%,rgba(11,13,16,0.98)_100%)]",
    accent: "text-text-primary",
    bulletTone: "bg-white/50",
    bullets: ["Requested Run", "Target Scope", "Declared Objective"],
  },
  {
    id: "governed-execution",
    label: "Stage 02",
    title: "WITNESSOPS Governed Execution",
    body: "WITNESSOPS applies runbooks, policy gates, and scope controls before action is allowed to execute.",
    tone: "border-orange-400/20 bg-[linear-gradient(180deg,rgba(30,18,14,0.94)_0%,rgba(20,12,10,0.98)_100%)]",
    accent: "text-orange-200",
    bulletTone: "bg-orange-300/70",
    bullets: ["Runbooks", "Policy Gates", "Scope Controls"],
  },
  {
    id: "operational-action",
    label: "Stage 03",
    title: "Operational Action",
    body: "The governed action runs under explicit control rather than direct operator invocation.",
    tone: "border-white/12 bg-[linear-gradient(180deg,rgba(18,22,28,0.96)_0%,rgba(11,13,16,0.98)_100%)]",
    accent: "text-text-primary",
    bulletTone: "bg-white/50",
    bullets: ["Containment", "Evidence Collection", "Remediation"],
  },
  {
    id: "execution-receipt",
    label: "Stage 04",
    title: "Execution Receipt",
    body: "Every governed run emits a signed receipt with a continuity link and execution binding that records what ran and under what authority.",
    tone: "border-orange-400/20 bg-[linear-gradient(180deg,rgba(28,20,12,0.94)_0%,rgba(17,12,8,0.98)_100%)]",
    accent: "text-orange-200",
    bulletTone: "bg-orange-300/70",
    bullets: ["Signed", "Chained", "Bound"],
  },
] as const;

const controlPath = ["intent", "runbook", "policy gate", "action", "receipt"];

const downstream = [
  {
    title: "Qin",
    body: "Runtime witness layer for traces, witness records, and execution fingerprints.",
  },
  {
    title: "Independent Verification",
    body: "Verification infrastructure that packages governed evidence into portable proof bundles that independent parties can verify.",
  },
];

export function ControlLoopStatic() {
  return (
    <section className="mt-12 overflow-hidden rounded-[28px] border border-surface-border/80 bg-[radial-gradient(circle_at_top,rgba(255,107,53,0.05),transparent_30%),linear-gradient(180deg,rgba(10,12,16,0.96)_0%,rgba(7,9,12,0.99)_100%)] p-5 shadow-[0_20px_70px_rgba(2,6,23,0.24)] sm:p-7">
      <div className="max-w-[44rem]">
        <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/60">
          Governed Execution Loop
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          WitnessOps turns operational actions into governed runs with signed execution receipts and explicit continuity.
        </h2>
        <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
          WitnessOps explains control before action: operator intent passes through runbooks, policy gates, and scope controls before execution occurs.
        </p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.56fr)_minmax(220px,0.72fr)]">
        <div className="rounded-[24px] border border-white/8 bg-black/18 p-4 sm:p-5">
          <div className="flex flex-col gap-2 border-b border-white/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                WitnessOps System
              </p>
              <p className="mt-2 font-mono text-xs text-text-muted">
                Intent → governed execution → action → receipt
              </p>
            </div>
            <div className="rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs text-orange-300">
              Governed operational control
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-4">
            {controlStages.map((stage, index) => (
              <div key={stage.id} className={`rounded-[22px] border p-4 ${stage.tone}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                      {stage.label}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/45">
                    {index + 1}
                  </div>
                </div>
                <h3 className={`mt-3 text-xl font-semibold ${stage.accent}`}>
                  {stage.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {stage.body}
                </p>
                <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                  {stage.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${stage.bulletTone}`} />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[20px] border border-white/8 bg-black/16 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
              Control Path
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
              {controlPath.map((item, i) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    {item}
                  </span>
                  {i < controlPath.length - 1 && (
                    <span className="text-white/25">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-orange-400/15 bg-gradient-to-b from-orange-400/10 to-transparent p-4 sm:p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-300/70">
            Downstream Handoff
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-text-primary">
            Witness &amp; Verification
          </h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            WitnessOps stops at governed execution and signed receipt emission. Those receipts then feed the downstream witness and verification infrastructure.
          </p>

          <div className="mt-5 space-y-3">
            {downstream.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-[#0e1318]/80 p-4"
              >
                <div className="text-sm font-medium text-text-primary">
                  {item.title}
                </div>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-orange-400/15 bg-orange-400/10 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-orange-300/70">
              System Rule
            </div>
            <p className="mt-2 text-sm leading-6 text-orange-50/90">
              WitnessOps diagram = control loop. The proof loop remains a separate downstream verification surface.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-white/8 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-[42rem] text-sm leading-7 text-text-secondary sm:text-base">
          WitnessOps turns operational actions into governed runs with signed execution receipts and explicit continuity.
        </p>
        <Link
          href="/governed-execution"
          className="inline-flex items-center rounded-full border border-orange-400/18 bg-orange-400/[0.06] px-4 py-2 text-sm font-medium text-brand-accent transition-colors hover:border-orange-400/30 hover:bg-orange-400/[0.1] hover:text-text-primary"
        >
          View governed execution
        </Link>
      </div>
    </section>
  );
}
