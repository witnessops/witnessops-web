import { witnessopsScene } from "@/lib/hero/witnessops-scene";

const previewLines =
  witnessopsScene.terminalStaticLines ??
  witnessopsScene.timeline
    .map((step) => step.terminalLine)
    .filter((line): line is string => Boolean(line))
    .slice(-5);

export function HeroStageFallback() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.99)_100%)] p-4 shadow-[0_30px_90px_rgba(2,6,23,0.58)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(255,107,53,0.18),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.12),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="relative space-y-4">
        <section className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="mb-3 text-[11px] font-medium tracking-[0.24em] text-slate-500 uppercase">
            Pipeline
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {witnessopsScene.nodes.map((node) => (
              <div
                key={node.id}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
              >
                <div className="mb-2 text-[11px] tracking-[0.16em] text-slate-500 uppercase">
                  {node.id}
                </div>
                <div className="text-sm font-medium text-slate-100">{node.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="mb-3 text-[11px] font-medium tracking-[0.24em] text-slate-500 uppercase">
            {witnessopsScene.ledgerTitle}
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[...witnessopsScene.seedLedger.slice(-2), witnessopsScene.timeline.find((step) => step.emitLedgerBlock)?.emitLedgerBlock]
              .filter(Boolean)
              .map((item) => (
                <div
                  key={item!.id}
                  className="min-w-[220px] rounded-[20px] border border-orange-400/20 bg-black/35 px-4 py-3"
                >
                  <div className="mb-2 font-mono text-xs text-slate-100">{item!.id}</div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {item!.meta.map((meta) => (
                      <div key={meta}>{meta}</div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[22px] border border-white/10 bg-black/55">
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-[13px] font-medium text-slate-100">{witnessopsScene.title}</div>
            <div className="text-[11px] text-slate-500">{witnessopsScene.subtitle}</div>
          </div>
          <div className="space-y-4 px-4 py-4">
            <div className="rounded-[18px] border border-orange-400/16 bg-orange-400/[0.06] px-3 py-3">
              <div className="mb-2 text-[11px] tracking-[0.18em] text-slate-500 uppercase">
                {witnessopsScene.preview.title}
              </div>
              <div className="space-y-1 font-mono text-[11px] text-slate-300">
                {witnessopsScene.preview.lines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>

            <div className="rounded-[18px] border border-white/8 bg-black/60 px-4 py-4 font-mono text-[12px] leading-6">
              {previewLines.map((line, index) => (
                <div key={`${index}:${line}`} className="text-slate-200">
                  {line || <span className="block h-3" aria-hidden="true" />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
        {witnessopsScene.thesis}
      </p>
    </div>
  );
}
