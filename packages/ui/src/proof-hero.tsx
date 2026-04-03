"use client";

import React from "react";
import { isVerifiedLine } from "./proof-status";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type ProofHeroNodeId =
  | "runbook"
  | "policy"
  | "execution"
  | "receipt"
  | "verify"
  | "bundle"
  | "witness"
  | "proof";

export type ProofHeroDetail = {
  title: string;
  lines: string[];
  emphasis?: string;
  metrics?: Array<{
    label: string;
    value: string;
  }>;
};

export type ProofHeroNode = {
  id: ProofHeroNodeId;
  label: string;
  detail?: ProofHeroDetail;
};

export type ProofHeroLedgerBlock = {
  id: string;
  meta: string[];
  detail?: ProofHeroDetail;
  hashLabel?: string;
};

export type ProofHeroTimelineStep = {
  id: string;
  atMs: number;
  activateNode?: ProofHeroNodeId;
  emitLedgerBlock?: ProofHeroLedgerBlock;
  terminalLine?: string;
};

export type ProofHeroPreview = {
  title: string;
  lines: string[];
};

export type ProofHeroScene = {
  mode: "witnessops" | "vaultmesh";
  title: string;
  subtitle: string;
  ledgerTitle: string;
  thesis: string;
  terminalStaticLines?: string[];
  defaultDetailNodeId?: ProofHeroNodeId;
  nodes: ProofHeroNode[];
  timeline: ProofHeroTimelineStep[];
  seedLedger: ProofHeroLedgerBlock[];
  preview: ProofHeroPreview;
};

type Tone = "witnessops" | "vaultmesh";

type ProofHeroInstrumentProps = {
  scene: ProofHeroScene;
  tone: Tone;
  className?: string;
};

const theme = {
  witnessops: {
    accentBorder: "border-orange-400/30",
    accentBg: "bg-orange-400/8",
    accentText: "text-orange-200",
    accentMeta: "text-orange-300/80",
    accentSoft: "text-orange-200/70",
    glow: "shadow-[0_0_22px_rgba(251,146,60,0.12)]",
    ambient:
      "bg-[radial-gradient(circle_at_16%_0%,rgba(255,107,53,0.14),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(245,158,11,0.08),transparent_24%)]",
    particle: "bg-orange-300",
    chain: "from-orange-400/0 via-orange-300/55 to-orange-400/0",
    pill: "border-orange-300/15 bg-orange-400/[0.06] text-orange-200/85",
    preview: "border-orange-400/14 bg-orange-400/[0.05]",
  },
  vaultmesh: {
    accentBorder: "border-emerald-400/30",
    accentBg: "bg-emerald-400/8",
    accentText: "text-emerald-200",
    accentMeta: "text-emerald-300/80",
    accentSoft: "text-emerald-200/70",
    glow: "shadow-[0_0_24px_rgba(16,185,129,0.14)]",
    ambient:
      "bg-[radial-gradient(circle_at_16%_0%,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(0,212,126,0.09),transparent_24%)]",
    particle: "bg-emerald-300",
    chain: "from-emerald-400/0 via-emerald-300/55 to-emerald-400/0",
    pill: "border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-200/85",
    preview: "border-emerald-400/14 bg-emerald-400/[0.05]",
  },
} as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reduced;
}

function terminalTone(line: string) {
  if (isVerifiedLine(line)) {
    return "text-emerald-300";
  }

  if (line.startsWith("$")) {
    return "text-sky-300";
  }

  if (line.startsWith("Witness:")) {
    return "text-emerald-200";
  }

  if (/\b(VALID|PASS|MATCH|COMPLETE|LINKED|attested)\b/.test(line)) {
    return "text-emerald-300";
  }

  if (
    line.startsWith("policy:") ||
    line.startsWith("authority:") ||
    line.startsWith("receipt:") ||
    line.startsWith("bundle:") ||
    line.startsWith("root:") ||
    line.startsWith("QUORUM:")
  ) {
    return "text-slate-300";
  }

  return "text-slate-200";
}

function PipelineLayer({
  scene,
  activeNode,
  tone,
}: {
  scene: ProofHeroScene;
  activeNode: ProofHeroNodeId | null;
  tone: Tone;
}) {
  const finalNodeId = scene.nodes.at(-1)?.id ?? null;
  const restingNodeId =
    activeNode === finalNodeId && scene.defaultDetailNodeId
      ? scene.defaultDetailNodeId
      : activeNode;
  const activeIndex = Math.max(
    0,
    scene.nodes.findIndex((node) => node.id === activeNode),
  );
  const progress =
    scene.nodes.length > 1
      ? `${(activeIndex / (scene.nodes.length - 1)) * 100}%`
      : "0%";
  const detailSource =
    scene.nodes.find((node) => node.id === restingNodeId) ??
    scene.nodes[0];
  const detail = detailSource?.detail;
  const palette = theme[tone];

  return (
    <section className="rounded-[20px] border border-white/8 bg-white/[0.025] px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-medium tracking-[0.24em] text-slate-500 uppercase">
          Pipeline
        </div>
        <div className={cn("rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]", palette.pill)}>
          governed path
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 right-0 top-[1.1rem] hidden h-px bg-white/8 sm:block" />
        <div className="absolute left-0 right-0 top-[1.1rem] hidden h-px overflow-hidden sm:block">
          <div
            className={cn("h-full bg-gradient-to-r transition-all duration-700", palette.chain)}
            style={{ width: progress }}
          />
          <div
            className={cn(
              "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_16px_currentColor] transition-all duration-700",
              palette.particle,
            )}
            style={{ left: progress }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {scene.nodes.map((node, index) => {
            const isActive = activeNode === node.id;

            return (
              <div
                key={node.id}
                className={cn(
                  "relative rounded-[18px] border border-white/8 bg-black/24 px-3 py-2.5 text-left transition duration-300",
                  isActive && cn(palette.accentBorder, palette.accentBg, palette.glow),
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full border border-white/15 bg-white/10 transition duration-300",
                      isActive && cn("border-transparent", palette.particle),
                    )}
                  />
                  <span
                    className={cn(
                      "text-[13px] font-medium text-slate-200 transition duration-300",
                      isActive && palette.accentText,
                    )}
                  >
                    {node.label}
                  </span>
                  <span className="ml-auto text-[10px] tracking-[0.18em] text-slate-600 uppercase">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {detail && (
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/28 px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] tracking-[0.16em] text-slate-500 uppercase">
              {detail.title}
            </div>
            {detail.emphasis && (
              <div className={cn("text-[11px] font-medium", palette.accentText)}>
                {detail.emphasis}
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
            {detail.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
          {detail.metrics && detail.metrics.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {detail.metrics.map((metric) => (
                <div
                  key={`${metric.label}:${metric.value}`}
                  className={cn("rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2", palette.glow)}
                >
                  <div className="text-[10px] tracking-[0.18em] text-slate-500 uppercase">
                    {metric.label}
                  </div>
                  <div className={cn("mt-1 text-sm font-medium", palette.accentText)}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LedgerLayer({
  scene,
  items,
  emittedCount,
  activeId,
  tone,
}: {
  scene: ProofHeroScene;
  items: ProofHeroLedgerBlock[];
  emittedCount: number;
  activeId: string | null;
  tone: Tone;
}) {
  const palette = theme[tone];
  const offset = Math.min(emittedCount * 84, 168);
  const detailSource =
    items.find((item) => item.id === activeId) ??
    items[items.length - 1];

  return (
    <section className="rounded-[20px] border border-white/8 bg-white/[0.025] px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] font-medium tracking-[0.24em] text-slate-500 uppercase">
          {scene.ledgerTitle}
        </div>
        <div className="text-[11px] text-slate-500">
          append-only chain
        </div>
      </div>

      <div className="overflow-hidden">
        <div
          className="flex items-stretch gap-3 transition-transform duration-700"
          style={{ transform: `translateX(-${offset}px)` }}
        >
          {items.map((item, index) => {
            const isActive = item.id === activeId;

            return (
              <React.Fragment key={item.id}>
                <div
                  className={cn(
                    "min-w-[220px] rounded-[18px] border px-4 py-3 text-left transition-all duration-300",
                    "border-white/8 bg-black/28",
                    isActive && cn(palette.accentBorder, palette.accentBg, palette.glow),
                  )}
                >
                  <div className="mb-2 font-mono text-xs text-slate-100">{item.id}</div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {item.meta.map((meta) => (
                      <div key={meta}>{meta}</div>
                    ))}
                  </div>
                </div>

                {index < items.length - 1 && (
                  <div className="flex min-w-[88px] flex-col items-center justify-center gap-2 text-center">
                    <div className="text-[10px] tracking-[0.16em] text-slate-600 uppercase">
                      {items[index + 1]?.hashLabel ?? "hash(prev_receipt)"}
                    </div>
                    <div className="relative h-px w-full overflow-hidden bg-white/8">
                      <div className={cn("absolute inset-0 bg-gradient-to-r", palette.chain)} />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {detailSource && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-white/8 bg-black/28 px-3 py-3 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="mb-2 font-mono text-xs text-slate-100">{detailSource.id}</div>
            <div className="space-y-1 text-[11px] text-slate-400">
              {detailSource.meta.map((meta) => (
                <div key={meta}>{meta}</div>
              ))}
            </div>
          </div>

          {detailSource.detail && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
              <div className="text-[10px] tracking-[0.18em] text-slate-500 uppercase">
                {detailSource.detail.title}
              </div>
              <div className="mt-2 font-mono text-[11px] leading-5 text-slate-300">
                {detailSource.detail.lines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TerminalLayer({
  scene,
  lines,
  activeNode,
  tone,
}: {
  scene: ProofHeroScene;
  lines: string[];
  activeNode: ProofHeroNodeId | null;
  tone: Tone;
}) {
  const palette = theme[tone];
  const terminalLines = scene.terminalStaticLines ?? lines;
  const witnessMetrics =
    scene.mode === "vaultmesh"
      ? scene.nodes
          .find((node) => node.id === "witness")
          ?.detail?.metrics?.find((metric) => metric.label === "quorum")?.value
      : null;

  return (
    <section className="overflow-hidden rounded-[22px] border border-white/10 bg-black/55">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-slate-100">
              {scene.title}
            </div>
            <div className="truncate text-[11px] text-slate-500">{scene.subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {witnessMetrics &&
            (activeNode === "witness" || activeNode === "verify" || activeNode === "proof") && (
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase", palette.pill)}>
                quorum {witnessMetrics}
              </div>
            )}
          <div className={cn("rounded-full border px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase", palette.pill)}>
            verification
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className={cn("rounded-[18px] border px-3 py-3", palette.preview)}>
          <div className="mb-2 text-[11px] tracking-[0.18em] text-slate-500 uppercase">
            {scene.preview.title}
          </div>
          <div className="space-y-1 font-mono text-[11px] text-slate-300">
            {scene.preview.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[18px] border border-white/8 bg-black/60 px-4 py-4">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.015)_46%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/6" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_64%)]" />

          <div className="min-h-[220px] space-y-1 font-mono text-[12px] leading-6">
            {terminalLines.length === 0 ? (
              <div className="text-slate-600">$ awaiting governed signal</div>
            ) : (
              terminalLines.map((line, index) => (
                <div key={`${index}:${line}`} className={terminalTone(line)}>
                  {line || <span className="block h-3" aria-hidden="true" />}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProofHeroInstrument({
  scene,
  tone,
  className,
}: ProofHeroInstrumentProps) {
  const sortedTimeline = React.useMemo(
    () => [...scene.timeline].sort((left, right) => left.atMs - right.atMs),
    [scene.timeline],
  );
  const usesStaticTerminal = Boolean(scene.terminalStaticLines?.length);
  const reducedMotion = usePrefersReducedMotion();
  const [activeNode, setActiveNode] = React.useState<ProofHeroNodeId | null>(
    scene.nodes[0]?.id ?? null,
  );
  const [ledger, setLedger] = React.useState<ProofHeroLedgerBlock[]>(scene.seedLedger);
  const [terminalLines, setTerminalLines] = React.useState<string[]>([]);
  const [emittedCount, setEmittedCount] = React.useState(0);

  React.useEffect(() => {
    setActiveNode(scene.nodes[0]?.id ?? null);
    setLedger(scene.seedLedger);
    setTerminalLines([]);
    setEmittedCount(0);

    if (reducedMotion) {
      let nextActiveNode = scene.nodes[0]?.id ?? null;
      const nextLedger = [...scene.seedLedger];
      const nextTerminalLines: string[] = [];

      sortedTimeline.forEach((step) => {
        if (step.activateNode) {
          nextActiveNode = step.activateNode;
        }
        if (step.emitLedgerBlock) {
          nextLedger.push(step.emitLedgerBlock);
        }
        if (step.terminalLine && !usesStaticTerminal) {
          nextTerminalLines.push(step.terminalLine);
        }
      });

      setActiveNode(nextActiveNode);
      setLedger(nextLedger);
      setTerminalLines(nextTerminalLines);
      setEmittedCount(nextLedger.length - scene.seedLedger.length);
      return;
    }

    const timers = sortedTimeline.map((step) =>
      window.setTimeout(() => {
        if (step.activateNode) {
          setActiveNode(step.activateNode);
        }

        if (step.emitLedgerBlock) {
          setLedger((current) => [...current, step.emitLedgerBlock!]);
          setEmittedCount((count) => count + 1);
        }

        if (step.terminalLine && !usesStaticTerminal) {
          setTerminalLines((current) => [...current, step.terminalLine!].slice(-10));
        }
      }, step.atMs),
    );

    return () => timers.forEach(window.clearTimeout);
  }, [reducedMotion, scene, sortedTimeline, usesStaticTerminal]);

  const activeLedgerId = ledger.at(-1)?.id ?? scene.seedLedger.at(-1)?.id ?? null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(11,16,28,0.9)_0%,rgba(2,6,23,0.95)_100%)] p-4 sm:p-5 shadow-[0_22px_70px_rgba(2,6,23,0.42)]",
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0", theme[tone].ambient)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="relative space-y-4">
        <PipelineLayer
          scene={scene}
          activeNode={activeNode}
          tone={tone}
        />

        <LedgerLayer
          scene={scene}
          items={ledger}
          emittedCount={emittedCount}
          activeId={activeLedgerId}
          tone={tone}
        />

        <TerminalLayer scene={scene} lines={terminalLines} activeNode={activeNode} tone={tone} />
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
        {scene.thesis}
      </p>
    </div>
  );
}
