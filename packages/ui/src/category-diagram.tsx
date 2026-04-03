const stackLayers = [
  {
    id: "control",
    label: "Control",
    system: "OFFSEC",
    role: "Governed Execution",
    accent: "border-orange-400/24 bg-orange-400/10 text-orange-300",
    line: "runbooks · scope controls · policy gates",
  },
  {
    id: "witness",
    label: "Witness",
    system: "Qin",
    role: "Runtime Witness",
    accent: "border-sky-400/24 bg-sky-400/10 text-sky-300",
    line: "runtime traces · witness records · fingerprints",
  },
  {
    id: "verification",
    label: "Verification",
    system: "VaultMesh",
    role: "Verification Infrastructure",
    accent: "border-emerald-400/24 bg-emerald-400/10 text-emerald-300",
    line: "proof objects · proof bundles · verification outputs",
  },
] as const;

const artifactFlow = [
  "Execution Receipt",
  "Runtime Trace",
  "Witness Record",
  "Proof Object",
  "Proof Bundle",
] as const;

const verificationConsumers = [
  "Auditors",
  "Regulators",
  "Insurers",
  "Counterparties",
  "Courts",
  "Systems",
] as const;

export interface CategoryDiagramProps {
  className?: string;
}

export function CategoryDiagram({ className }: CategoryDiagramProps) {
  return (
    <section
      className={`overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,107,53,0.06),transparent_24%),radial-gradient(circle_at_top,rgba(59,130,246,0.06),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_30%),linear-gradient(180deg,rgba(10,12,16,0.96)_0%,rgba(7,9,12,0.99)_100%)] p-5 sm:p-7${className ? ` ${className}` : ""}`}
    >
      <div className="max-w-2xl">
        <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
          VaultMesh Category Diagram
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          One stack. One artifact flow. One verification outcome.
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/65 sm:text-base">
          The category combines governed execution, runtime witness, and verification infrastructure into a single proof-bearing system that outside parties can inspect.
        </p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.75fr)]">
        <div className="rounded-[22px] border border-white/8 bg-black/18 p-4 sm:p-5">
          <div className="flex flex-col gap-2 border-b border-white/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                Proof Infrastructure Stack
              </div>
              <div className="mt-1 text-xs text-white/50">
                CONTROL -&gt; WITNESS -&gt; VERIFICATION
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55">
              category architecture
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {stackLayers.map((layer, index) => (
              <div key={layer.id} className="flex items-center gap-3 xl:block">
                <div className={`flex-1 rounded-2xl border p-4 ${layer.accent}`}>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                    {layer.label}
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-tight text-white">
                    {layer.system}
                  </div>
                  <div className="mt-1 text-xs text-white/70">{layer.role}</div>
                  <div className="mt-3 text-xs leading-5 text-white/60">
                    {layer.line}
                  </div>
                </div>

                {index < stackLayers.length - 1 && (
                  <div className="hidden xl:flex xl:items-center xl:justify-center xl:pt-0">
                    <div className="flex items-center gap-2">
                      <div className="h-px w-8 bg-white/20" />
                      <div className="h-2 w-2 rotate-45 border-r border-t border-white/25" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                Artifact Flow
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
                {artifactFlow.map((artifact, index) => (
                  <div key={artifact} className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs sm:text-sm">
                      {artifact}
                    </span>
                    {index < artifactFlow.length - 1 && (
                      <span className="text-white/25">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden items-center justify-center lg:flex">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/45">
                exits issuer boundary
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                Verification Consumers
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {verificationConsumers.map((consumer) => (
                  <span
                    key={consumer}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75"
                  >
                    {consumer}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="rounded-[22px] border border-emerald-400/15 bg-gradient-to-b from-emerald-400/10 to-transparent p-4 sm:p-5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">
            Category Thesis
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
            Systems that can prove what they did.
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/70">
            VaultMesh exists where governed action must survive transport across organizations, regulators, counterparties, and time as independently verifiable proof.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-[#0e1318]/80 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
              Canonical Line
            </div>
            <p className="mt-2 text-sm leading-6 text-white/85">
              OFFSEC governs action. Qin records runtime truth. VaultMesh turns that evidence into independently verifiable proof.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0e1318]/80 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
              Market Outcome
            </div>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Verification infrastructure is the layer that turns internal evidence into portable institutional proof and unlocks the proof economy around it.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}