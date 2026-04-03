"use client";

import type { PublishedReceiptView } from "@/lib/receipts";

interface ReceiptViewerProps {
  receipt: PublishedReceiptView;
}

export function ReceiptViewer({ receipt }: ReceiptViewerProps) {
  const fields: { label: string; value: string | null }[] = [
    { label: "Receipt ID", value: receipt.receiptId },
    { label: "Stage", value: receipt.stage },
    { label: "Runbook", value: receipt.runbookId ?? null },
    { label: "Policy Gate", value: receipt.policyGate ?? null },
    { label: "Operator", value: receipt.operator ?? null },
    { label: "Timestamp", value: receipt.timestamp },
    { label: "Previous Receipt", value: receipt.prevReceiptId },
    { label: "Status", value: receipt.status ?? null },
    { label: "Operation", value: receipt.operation ?? null },
    { label: "Execution Hash", value: receipt.executionHash ?? null },
    { label: "Signature", value: receipt.signature ?? null },
    { label: "Source", value: receipt.sourcePath },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
        <span className="size-3 rounded-full bg-signal-green/80" />
        <span className="font-mono text-xs text-text-muted">{receipt.receiptId}</span>
      </div>
      <div className="divide-y divide-surface-border">
        {fields.map((field) => (
          <div key={field.label} className="flex items-start gap-4 px-4 py-3">
            <span className="w-36 shrink-0 text-xs font-medium text-text-muted uppercase">
              {field.label}
            </span>
            <span className="break-all font-mono text-sm text-text-secondary">
              {field.value ?? <span className="text-text-muted">null</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
