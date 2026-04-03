const layers = [
  {
    id: "control",
    function: "Control",
    system: "OFFSEC",
    role: "Governed Execution",
    accent: "border-orange-400/24 bg-orange-400/10 text-orange-300",
    dotColor: "bg-orange-400",
  },
  {
    id: "witness",
    function: "Witness",
    system: "Qin",
    role: "Runtime Witness",
    accent: "border-sky-400/24 bg-sky-400/10 text-sky-300",
    dotColor: "bg-sky-400",
  },
  {
    id: "verification",
    function: "Verification",
    system: "VaultMesh",
    role: "Verification Infrastructure",
    accent: "border-emerald-400/24 bg-emerald-400/10 text-emerald-300",
    dotColor: "bg-emerald-400",
  },
] as const;

export interface CategoryStackProps {
  className?: string;
}

export function CategoryStack({ className }: CategoryStackProps) {
  return (
    <section
      className={`overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,16,0.96)_0%,rgba(7,9,12,0.99)_100%)] p-5 sm:p-7${className ? ` ${className}` : ""}`}
    >
      <div className="mb-6 max-w-md">
        <div className="mb-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
          Proof Infrastructure Stack
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Three systems. One verification outcome.
        </h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {layers.map((layer, index) => (
          <div key={layer.id} className="flex flex-1 items-center gap-3 sm:gap-4">
            <div
              className={`flex-1 rounded-2xl border p-4 sm:p-5 ${layer.accent}`}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                {layer.function}
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                {layer.system}
              </div>
              <div className="mt-1 text-xs text-white/60">{layer.role}</div>
            </div>

            {index < layers.length - 1 && (
              <div className="flex flex-col items-center gap-1">
                <div className="h-px w-6 bg-white/20 sm:w-8" />
                <div className="h-2 w-2 rotate-45 border-r border-t border-white/25" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-white/8 pt-5">
        <div className="flex items-center gap-2">
          {layers.map((layer) => (
            <span key={layer.id} className={`h-2 w-2 rounded-full ${layer.dotColor}`} />
          ))}
        </div>
        <p className="text-sm text-white/60">
          OFFSEC governs action. Qin witnesses runtime truth. VaultMesh turns evidence into independently verifiable proof.
        </p>
      </div>
    </section>
  );
}
