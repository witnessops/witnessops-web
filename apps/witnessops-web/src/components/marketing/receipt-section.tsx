import { SectionShell } from "@/components/shared/section-shell";
import { CodeFrame } from "@/components/shared/code-frame";

interface ReceiptSectionProps {
  id?: string;
  title?: string;
  body?: string;
}

export function ReceiptSection({
  id = "receipts",
  title = "Execution Receipts",
  body = "Every governed operation produces a signed receipt. Receipts chain together to form a reviewable execution history, while richer evidence stays in adjacent manifests, state, logs, and notes.",
}: ReceiptSectionProps) {
  const receiptLines = [
    '{',
    '  "receiptId": "rx-20260312-a7f3",',
    '  "runbookId": "rb-incident-triage-v3",',
    '  "policyGate": "policy:containment:v2",',
    '  "operator": "op-sovereign",',
    '  "timestamp": "2026-03-12T14:30:00Z",',
    '  "executionHash": "sha256:9d5e42...",',
    '  "prevReceipt": "rx-20260312-e2b1",',
    '  "status": "passed",',
    '  "signature": "ed25519:k7x9..."',
    '}',
  ];

  const fields = [
    { name: "receiptId", description: "Unique identifier for this execution record" },
    { name: "runbookId", description: "Which runbook produced the governed action" },
    { name: "policyGate", description: "Which policy or gate context governed execution" },
    { name: "executionHash", description: "Hash binding the receipt to the related execution material" },
    { name: "prevReceipt", description: "Chain link to the previous receipt" },
    { name: "signature", description: "Cryptographic proof of integrity" },
  ];

  return (
    <SectionShell id={id} className="section-gradient-subtle">
      <h2 className="animate-fade-in-up mb-4 text-3xl font-bold text-text-primary md:text-4xl">{title}</h2>
      <p className="animate-fade-in-up delay-100 mb-12 text-lg leading-relaxed text-text-secondary">{body}</p>

      <div className="grid gap-12 lg:grid-cols-2">
        <CodeFrame
          language="json"
          lines={receiptLines}
          title="execution-receipt.json"
        />

        <div className="space-y-4">
          <h3 className="mb-4 text-lg font-semibold text-text-primary">Receipt Fields</h3>
          {fields.map((field) => (
            <div key={field.name} className="flex items-start gap-3">
              <code className="shrink-0 rounded bg-surface-card px-2 py-0.5 font-mono text-xs text-brand-accent">
                {field.name}
              </code>
              <p className="text-sm text-text-secondary">{field.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
