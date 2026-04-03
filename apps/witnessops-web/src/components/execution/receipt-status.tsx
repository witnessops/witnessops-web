"use client";

import type { PublishedReceiptView } from "@/lib/receipts";

interface ReceiptStatusProps {
  receipt: PublishedReceiptView;
  verified: boolean;
}

export function ReceiptStatus({ receipt, verified }: ReceiptStatusProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-card px-4 py-3">
      <span
        className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
          verified
            ? "bg-signal-green/10 text-signal-green"
            : "bg-signal-red/10 text-signal-red"
        }`}
      >
        {verified ? "\u2713" : "\u2717"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm text-text-primary">{receipt.receiptId}</p>
        <p className="text-xs text-text-muted">
          {receipt.stage}
          {receipt.operator ? ` · ${receipt.operator}` : ""}
        </p>
      </div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          verified
            ? "bg-signal-green/10 text-signal-green"
            : "bg-signal-red/10 text-signal-red"
        }`}
      >
        {verified ? "Verified" : "Failed"}
      </span>
    </div>
  );
}
