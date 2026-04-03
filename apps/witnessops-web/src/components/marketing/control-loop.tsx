import Link from "next/link";
import { SectionShell } from "@/components/shared/section-shell";

type ControlStage = {
  id: string;
  label: string;
  title: string;
  body: string;
  bullets: string[];
  edgeLabel?: string;
};

const controlStages: ControlStage[] = [
  {
    id: "intent",
    label: "Stage 01",
    title: "Operator Intent",
    body: "An operator declares the requested run, target, or remediation path.",
    bullets: ["Requested Run", "Target Scope", "Declared Objective"],
    edgeLabel: "runbook",
  },
  {
    id: "governed-execution",
    label: "Stage 02",
    title: "WITNESSOPS Governed Execution",
    body: "WITNESSOPS applies runbooks, policy gates, and scope controls before action is allowed to execute.",
    bullets: ["Runbooks", "Policy Gates", "Scope Controls"],
    edgeLabel: "action",
  },
  {
    id: "operational-action",
    label: "Stage 03",
    title: "Operational Action",
    body: "The governed action runs under explicit control rather than direct operator invocation.",
    bullets: ["Containment", "Evidence Collection", "Remediation"],
    edgeLabel: "receipt",
  },
  {
    id: "execution-receipt",
    label: "Stage 04",
    title: "Execution Receipt",
    body: "Every governed run emits a signed receipt with a continuity link and execution binding that records what ran and under what authority.",
    bullets: ["Signed", "Chained", "Bound"],
  },
];

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

export function ControlLoop() {
  return (
    <SectionShell className="section-gradient-subtle overflow-hidden py-18">
      <div className="relative rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,107,53,0.06),transparent_30%),linear-gradient(180deg,rgba(9,12,18,0.94)_0%,rgba(6,8,12,0.99)_100%)] px-6 py-8 shadow-[0_24px_90px_rgba(2,6,23,0.28)] sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/60">
            Governed Execution Loop
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-4xl">
            WitnessOps turns operational actions into governed runs with signed execution receipts and explicit continuity.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary md:text-base">
            WitnessOps explains control before action: operator intent passes through runbooks, policy gates, and scope controls before execution occurs.
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(10,12,16,0.68)_0%,rgba(8,10,14,0.78)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5 lg:p-6">
            <div className="mb-5 flex flex-col gap-3 border-b border-white/8 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                  WitnessOps System
                </p>
                <p className="mt-1 font-mono text-xs text-text-muted">
                  Intent → governed execution → action → receipt
                </p>
              </div>
              <div className="rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs text-orange-300">
                Governed operational control
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {controlStages.map((stage, index) => (
                <div key={stage.id} className="relative">
                  <div className={`h-full rounded-[26px] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
                    index === 1 || index === 3
                      ? "border-orange-400/22 bg-[linear-gradient(180deg,rgba(30,18,14,0.94)_0%,rgba(20,12,10,0.98)_100%)]"
                      : "border-white/12 bg-[linear-gradient(180deg,rgba(18,22,28,0.96)_0%,rgba(11,13,16,0.98)_100%)]"
                  }`}>
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

                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-text-primary md:text-xl">
                      {stage.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {stage.body}
                    </p>

                    <ul className="mt-5 space-y-2">
                      {stage.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-center gap-2 text-sm text-white/78"
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            index === 1 || index === 3 ? "bg-orange-300/70" : "bg-white/50"
                          }`} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {index < controlStages.length - 1 && stage.edgeLabel && (
                    <div className="pointer-events-none hidden lg:block">
                      <div className="absolute left-[calc(100%+8px)] top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-[#0e1318] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
                          {stage.edgeLabel}
                        </span>
                        <div className="h-px w-8 bg-gradient-to-r from-white/20 to-white/5" />
                        <div className="h-2 w-2 rotate-45 border-r border-t border-white/25" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0e1318] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
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

          <aside className="rounded-[28px] border border-orange-400/15 bg-gradient-to-b from-orange-400/10 to-transparent p-4 md:p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-orange-300/70">
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
          </aside>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/8 pt-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-medium text-text-primary">
              WitnessOps turns operational actions into governed runs with signed execution receipts and explicit continuity.
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              WitnessOps governs execution, Qin can witness runtime behavior, and downstream verification infrastructure can package that evidence for independent proof verification.
            </p>
          </div>

          <Link
            href="/governed-execution"
            className="inline-flex items-center rounded-full border border-orange-400/18 bg-orange-400/[0.06] px-4 py-2 text-sm font-medium text-brand-accent transition-colors hover:border-orange-400/30 hover:bg-orange-400/[0.1] hover:text-text-primary"
          >
            View governed execution
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}
