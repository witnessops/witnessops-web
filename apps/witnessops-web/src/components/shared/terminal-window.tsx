"use client";

import React from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ─── Inline SVG icons (avoids lucide-react dep) ─── */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ─── Types ─── */
export type TerminalLine = {
  text: string;
  tone?: "default" | "muted" | "success" | "warning" | "danger" | "accent";
  prefix?: string;
};

export type TerminalTab = {
  id: string;
  label: string;
};

export type TerminalWindowProps = {
  title?: string;
  subtitle?: string;
  prompt?: string;
  lines: TerminalLine[];
  tabs?: TerminalTab[];
  activeTabId?: string;
  badge?: string;
  showCopyButton?: boolean;
  copyText?: string;
  className?: string;
};

const toneMap: Record<NonNullable<TerminalLine["tone"]>, string> = {
  default: "text-slate-100",
  muted: "text-slate-500",
  success: "text-emerald-400",
  warning: "text-amber-300",
  danger: "text-rose-400",
  accent: "text-sky-300",
};

export function TerminalWindow({
  title = "Terminal",
  subtitle = "bash",
  prompt = "$",
  lines,
  tabs = [{ id: "terminal", label: "Terminal" }],
  activeTabId,
  badge,
  showCopyButton = true,
  copyText,
  className,
}: TerminalWindowProps) {
  const [copied, setCopied] = React.useState(false);
  const activeId = activeTabId ?? tabs[0]?.id;

  const payload =
    copyText ??
    lines
      .map((line) => `${line.prefix ?? prompt} ${line.text}`.trim())
      .join("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[24px] border border-white/10",
        "bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.98)_100%)]",
        "shadow-[0_24px_80px_rgba(2,6,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      {/* Top ambient glow — brand-tinted (orange for WitnessOps) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,107,53,0.08),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.06),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      {/* ─── Title bar ─── */}
      <div className="relative border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_12px_rgba(255,95,87,0.55)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_12px_rgba(254,188,46,0.50)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_12px_rgba(40,200,64,0.45)]" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium tracking-[0.01em] text-slate-100">
                {title}
              </div>
              {subtitle && (
                <div className="truncate text-[11px] text-slate-500">{subtitle}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {badge ? (
              <span className="hidden rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 text-[11px] font-medium text-orange-300 sm:inline-flex">
                {badge}
              </span>
            ) : null}
            {showCopyButton ? (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-slate-300 transition hover:border-white/15 hover:bg-white/[0.07] hover:text-white"
                aria-label="Copy terminal content"
              >
                {copied ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <CopyIcon className="h-3.5 w-3.5" />
                )}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* ─── Tabs ─── */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-2 px-3 pb-3 sm:px-4">
            {tabs.map((tab) => {
              const active = tab.id === activeId;
              return (
                <div
                  key={tab.id}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition",
                    active
                      ? "border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "border-transparent bg-transparent text-slate-500",
                  )}
                >
                  {tab.label}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Body ─── */}
      <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
        <div className="space-y-2 font-mono text-[13px] leading-6 sm:text-sm">
          {lines.map((line, index) => (
            <div key={`${index}-${line.text}`} className="flex gap-3">
              <span className="select-none text-slate-600">
                {line.prefix ?? prompt}
              </span>
              <span
                className={cn(
                  "whitespace-pre-wrap break-words",
                  toneMap[line.tone ?? "default"],
                )}
              >
                {line.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
