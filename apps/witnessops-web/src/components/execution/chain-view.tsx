"use client";

import type { PublishedReceiptView } from "@/lib/receipts";

interface ChainViewProps {
  receipts: PublishedReceiptView[];
}

export function ChainView({ receipts }: ChainViewProps) {
  if (receipts.length === 0) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-8 text-center">
        <p className="text-text-muted">No receipts in chain.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {receipts.map((receipt, i) => (
        <div key={receipt.receiptId} className="relative">
          {/* Chain connector */}
          {i > 0 && (
            <div className="absolute top-0 left-6 h-4 w-px -translate-y-full bg-brand-accent/30" />
          )}

          <div className="flex items-start gap-4">
            {/* Chain node */}
            <div className="flex flex-col items-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-brand-accent/30 bg-brand-accent/5 text-xs font-bold text-brand-accent">
                {i + 1}
              </span>
              {i < receipts.length - 1 && (
                <div className="h-8 w-px bg-brand-accent/30" />
              )}
            </div>

            {/* Receipt card */}
            <div className="flex-1 rounded-lg border border-surface-border bg-surface-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-text-primary">
                  {receipt.receiptId}
                </span>
                <span className="text-xs text-text-muted">{receipt.timestamp}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                <span>Stage: {receipt.stage}</span>
                {receipt.runbookId ? <span>Runbook: {receipt.runbookId}</span> : null}
                {receipt.policyGate ? <span>Gate: {receipt.policyGate}</span> : null}
                {receipt.operator ? <span>Operator: {receipt.operator}</span> : null}
              </div>
              {receipt.prevReceiptId && (
                <p className="mt-2 font-mono text-xs text-text-muted/60">
                  prev: {receipt.prevReceiptId}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
