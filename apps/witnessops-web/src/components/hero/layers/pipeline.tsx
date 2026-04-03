"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { HeroScene } from "@/lib/hero/types";
import { ease } from "@/lib/motion";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Pipeline strip — animated node chain for the WitnessOps hero.
 *
 * Nodes activate sequentially based on the scene timeline.
 * Shows: Runbook → Policy Gate → Execution → Receipt → Verify
 */
export function PipelineStrip({
  scene,
  className,
}: {
  scene: HeroScene;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [activeNode, setActiveNode] = React.useState<string | null>(null);

  const sortedTimeline = React.useMemo(
    () => [...scene.timeline].sort((a, b) => a.atMs - b.atMs),
    [scene.timeline],
  );

  React.useEffect(() => {
    const timers: number[] = [];
    sortedTimeline.forEach((step) => {
      if (step.activateNode) {
        const timer = window.setTimeout(() => {
          setActiveNode(step.activateNode!);
        }, step.atMs);
        timers.push(timer);
      }
    });
    return () => timers.forEach(window.clearTimeout);
  }, [sortedTimeline]);

  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto sm:gap-2", className)}>
      {scene.nodes.map((node, index) => (
        <React.Fragment key={node.id}>
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.08, duration: 0.22, ease }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all whitespace-nowrap",
              activeNode === node.id
                ? "border-orange-400/40 bg-orange-400/10 text-orange-200 shadow-[0_0_12px_rgba(251,146,60,0.15)]"
                : "border-white/10 text-slate-500",
            )}
          >
            {node.label}
          </motion.div>
          {index < scene.nodes.length - 1 && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { scaleX: 0 }}
              animate={reduce ? { opacity: 1 } : { scaleX: 1 }}
              transition={{ delay: 0.3 + index * 0.08 + 0.1, duration: 0.18, ease }}
              className="h-px w-4 shrink-0 origin-left bg-white/15 sm:w-6"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
