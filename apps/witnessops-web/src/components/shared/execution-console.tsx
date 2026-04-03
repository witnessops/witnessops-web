"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ease, duration, lineReveal, fadeOnly } from "@/lib/motion";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ─── Inline SVG icons ─── */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

/* ─── Types ─── */
type Runbook = {
  id: string;
  name: string;
  gate: string;
  exec_class: string;
  receipt_type: string;
};

type ReceiptField = {
  key: string;
  value: string;
  tone?: "default" | "muted" | "accent";
};

type VerifyLine = {
  label: string;
  value: string;
  tone: "success" | "default" | "accent";
};

export type ExecutionConsoleProps = {
  title?: string;
  subtitle?: string;
  runbooks?: Runbook[];
  receipt?: ReceiptField[];
  verify?: VerifyLine[];
  className?: string;
};

const defaultRunbooks: Runbook[] = [
  { id: "rb-001", name: "incident-triage-v3", gate: "policy:containment", exec_class: "governed", receipt_type: "signed" },
  { id: "rb-002", name: "block-ip-v2", gate: "policy:firewall", exec_class: "immediate", receipt_type: "signed" },
  { id: "rb-003", name: "nginx-anomaly-response-v1", gate: "policy:remediation", exec_class: "governed", receipt_type: "signed" },
];

const defaultReceipt: ReceiptField[] = [
  { key: "receipt_id", value: "rx-20260312-a7f3", tone: "accent" },
  { key: "runbook_id", value: "rb-incident-triage-v3" },
  { key: "policy_gate", value: "policy:containment:v2" },
  { key: "operator", value: "op-sovereign" },
  { key: "timestamp", value: "2026-03-12T14:30:00Z", tone: "muted" },
  { key: "prev_receipt", value: "rx-20260312-e2b1" },
  { key: "signature", value: "ed25519:k7x9...", tone: "accent" },
];

const defaultVerify: VerifyLine[] = [
  { label: "RECEIPT", value: "VALID", tone: "success" },
  { label: "POLICY", value: "PASS", tone: "success" },
  { label: "CHAIN", value: "LINKED", tone: "success" },
  { label: "SIGNATURE", value: "VALID (Ed25519)", tone: "success" },
];

const tabs = [
  { id: "runbooks", label: "Runbooks" },
  { id: "receipt", label: "Receipt" },
  { id: "verify", label: "Verify" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const fieldToneMap = {
  default: "text-white/80",
  muted: "text-slate-500",
  accent: "text-amber-300",
};

/* ─── Panel transition variants ─── */
const panelVariants = {
  enter: { opacity: 0, y: 6 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.sm, ease },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.12, ease },
  },
};

const panelReducedVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.06 } },
};

/* ─── Verify choreography variants ─── */
const verifyStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.08,
    },
  },
};

const verifyStaggerReduced = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0,
      delayChildren: 0,
    },
  },
};

export function ExecutionConsole({
  title = "witnessops execute",
  subtitle = "governed execution surface",
  runbooks = defaultRunbooks,
  receipt = defaultReceipt,
  verify = defaultVerify,
  className,
}: ExecutionConsoleProps) {
  const [activeTab, setActiveTab] = React.useState<TabId>("receipt");
  const [copied, setCopied] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("Signed receipt panel shown.");
  const reduce = useReducedMotion();
  const panelIdPrefix = React.useId();

  React.useEffect(() => {
    const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? activeTab;
    setAnnouncement(`${activeLabel} panel shown.`);
  }, [activeTab]);

  function handleTabKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
      return;
    }

    e.preventDefault();

    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    }

    setActiveTab(tabs[nextIndex].id);
  }

  async function handleCopy() {
    let payload = "";
    if (activeTab === "receipt") {
      payload = receipt.map((f) => `"${f.key}": "${f.value}"`).join("\n");
    } else if (activeTab === "verify") {
      payload = verify.map((v) => `${v.label}: ${v.value}`).join("\n");
    } else {
      payload = runbooks.map((r) => r.name).join("\n");
    }
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setAnnouncement(`${tabs.find((tab) => tab.id === activeTab)?.label ?? activeTab} content copied.`);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      setAnnouncement("Copy failed.");
    }
  }

  return (
    <>
    <motion.div
      role="region"
      aria-label={title}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 10 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.32, ease, delay: 0.18 }}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border border-white/10",
        "bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(2,6,23,0.98)_100%)]",
        "shadow-[0_24px_80px_rgba(2,6,23,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      {/* Ambient glow — orange for WitnessOps */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,107,53,0.08),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.06),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      {/* ─── Title bar ─── */}
      <div className="relative border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
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
              <div className="truncate text-[11px] text-slate-500">{subtitle}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14 }}
                className="hidden rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 text-[11px] font-medium text-orange-300 sm:inline-flex"
              >
                {activeTab === "runbooks" ? "Governed runbook" : activeTab === "receipt" ? "Signed receipt" : "Verification result"}
              </motion.span>
            </AnimatePresence>
            <motion.button
              type="button"
              onClick={handleCopy}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-slate-300 transition hover:border-white/15 hover:bg-white/[0.07] hover:text-white"
              aria-label="Copy content"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.14 }}
                    className="inline-flex items-center gap-2"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    <span>Copied</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.14 }}
                    className="inline-flex items-center gap-2"
                  >
                    <CopyIcon className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* ─── Tabs with animated pill ─── */}
        <div role="tablist" aria-orientation="horizontal" aria-label={`${title} views`} className="flex items-center gap-2 px-3 pb-3 sm:px-4">
          {tabs.map((tab, index) => {
            const active = tab.id === activeTab;
            const panelId = `${panelIdPrefix}-${tab.id}-panel`;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                role="tab"
                id={`${panelIdPrefix}-${tab.id}-tab`}
                aria-selected={active}
                aria-controls={panelId}
                tabIndex={active ? 0 : -1}
                className={cn(
                  "relative rounded-full px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  active
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="exec-tab-pill"
                    className="absolute inset-0 rounded-full border border-white/10 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Body with animated panel transitions ─── */}
        <div className="relative px-4 py-4 sm:px-5 sm:py-5">
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />

        <AnimatePresence mode="wait" initial={false}>
          {/* Runbooks tab */}
          {activeTab === "runbooks" && (
            <motion.div
              key="runbooks"
              role="tabpanel"
              id={`${panelIdPrefix}-runbooks-panel`}
              aria-labelledby={`${panelIdPrefix}-runbooks-tab`}
              tabIndex={0}
              variants={reduce ? panelReducedVariants : panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-3"
            >
              {runbooks.map((rb, i) => (
                <motion.div
                  key={rb.id}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.22, ease }}
                  className={cn(
                    "group/rb rounded-xl border px-4 py-3 transition",
                    i === 0
                      ? "border-orange-400/20 bg-orange-400/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ShieldIcon className="h-3.5 w-3.5 shrink-0 text-orange-400/60" />
                    <span className={cn(
                      "font-mono text-[13px] font-medium",
                      i === 0 ? "text-orange-300" : "text-slate-200",
                    )}>
                      {rb.name}
                    </span>
                    {i === 0 && (
                      <span className="ml-auto rounded-full bg-orange-400/10 px-2 py-0.5 text-[10px] font-medium text-orange-300">
                        selected
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 pl-5.5 text-[11px]">
                    <span className="text-slate-500">
                      gate: <span className="text-slate-400">{rb.gate}</span>
                    </span>
                    <span className="text-slate-500">
                      class: <span className="text-slate-400">{rb.exec_class}</span>
                    </span>
                    <span className="text-slate-500">
                      receipt: <span className="text-slate-400">{rb.receipt_type}</span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Receipt tab */}
          {activeTab === "receipt" && (
            <motion.div
              key="receipt"
              role="tabpanel"
              id={`${panelIdPrefix}-receipt-panel`}
              aria-labelledby={`${panelIdPrefix}-receipt-tab`}
              tabIndex={0}
              variants={reduce ? panelReducedVariants : panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="font-mono text-[13px] leading-7 sm:text-sm"
            >
              <div className="text-white/40">{"{"}</div>
              {receipt.map((field, i) => (
                <motion.div
                  key={field.key}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -4 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 + i * 0.04, duration: 0.18, ease }}
                  className="flex pl-4"
                >
                  <span className="text-orange-300/80">{`"${field.key}"`}</span>
                  <span className="text-white/40">: </span>
                  <span className={fieldToneMap[field.tone ?? "default"]}>
                    {`"${field.value}"`}
                  </span>
                  {i < receipt.length - 1 && <span className="text-white/40">,</span>}
                </motion.div>
              ))}
              <div className="text-white/40">{"}"}</div>
            </motion.div>
          )}

          {/* Verify tab — sequential choreography */}
          {activeTab === "verify" && (
            <motion.div
              key="verify"
              role="tabpanel"
              id={`${panelIdPrefix}-verify-panel`}
              aria-labelledby={`${panelIdPrefix}-verify-tab`}
              tabIndex={0}
              variants={reduce ? verifyStaggerReduced : verifyStagger}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-2 font-mono text-[13px] leading-6 sm:text-sm"
            >
              {/* Command line */}
              <motion.div
                variants={reduce ? fadeOnly : lineReveal}
                className="flex gap-3"
              >
                <span className="select-none text-slate-600">$</span>
                <span className="text-sky-300">witnessops verify receipt.json</span>
              </motion.div>

              <motion.div variants={reduce ? fadeOnly : lineReveal} className="h-1" />

              {/* Verification results — staggered reveal */}
              {verify.map((line) => (
                <motion.div
                  key={line.label}
                  variants={reduce ? fadeOnly : lineReveal}
                  className="flex gap-3"
                >
                  <span className="select-none text-slate-600">&nbsp;</span>
                  <span className="text-white/60">{line.label.padEnd(10)}</span>
                  <span className={line.tone === "success" ? "text-emerald-400" : "text-slate-100"}>
                    {line.value}
                  </span>
                </motion.div>
              ))}

              <motion.div variants={reduce ? fadeOnly : lineReveal} className="h-1" />

              {/* Final verdict — lands last */}
              <motion.div
                variants={reduce ? fadeOnly : {
                  hidden: { opacity: 0, y: 4 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.24, ease },
                  },
                }}
                className="flex gap-3"
              >
                <span className="select-none text-slate-600">&nbsp;</span>
                <span className="text-emerald-400 font-medium">φ verified</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>

      {/* Thesis hint */}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500/70">
        Intent selects a governed runbook. Execution emits a signed receipt. Verification checks chain integrity.
      </p>
    </>
  );
}
