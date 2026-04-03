"use client";

import { formatVerifiedLine } from "./proof-status";

export type TerminalLine = {
  text: string;
  verified?: boolean;
  tone?: "default" | "success" | "muted";
};

export type TerminalProps = {
  lines: TerminalLine[];
  showCursor?: boolean;
  title?: string;
  className?: string;
};

export function Terminal({
  lines,
  showCursor = true,
  title,
  className = "",
}: TerminalProps) {
  function renderLineText(line: TerminalLine) {
    return line.verified ? formatVerifiedLine(line.text) : line.text;
  }

  function getToneClass(line: TerminalLine) {
    if (line.verified || line.tone === "success") {
      return "text-emerald-400";
    }

    if (line.tone === "muted") {
      return "text-white/50";
    }

    return "text-white/80";
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e17] font-mono text-sm shadow-2xl shadow-black/40 transition-all duration-300 hover:shadow-[0_24px_80px_rgba(2,6,23,0.55)] ${className}`}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_8px_rgba(255,95,87,0.4)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_8px_rgba(254,188,46,0.35)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_8px_rgba(40,200,64,0.35)]" />
        </div>
        {title && (
          <span className="text-xs font-medium text-white/40">{title}</span>
        )}
        <div className="w-[52px]" />
      </div>

      {/* Body */}
      <div className="space-y-1 px-5 py-4">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="select-none text-slate-600">$</span>
            <span className={getToneClass(line)}>{renderLineText(line)}</span>
          </div>
        ))}
        {showCursor && (
          <div className="flex items-center gap-3">
            <span className="select-none text-slate-600">$</span>
            <span className="h-4 w-2 bg-brand-accent animate-pulse [animation-duration:1.5s]" />
          </div>
        )}
      </div>
    </div>
  );
}
