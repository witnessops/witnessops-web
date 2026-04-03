import type { HeroScene } from "./types";

export const witnessopsScene: HeroScene = {
  mode: "witnessops",
  title: "Receipts that survive the operation",
  subtitle: "Signed execution receipts remain inspectable after the run is complete.",
  ledgerTitle: "Receipt Ledger",
  thesis:
    "Intent selects a governed runbook. Execution emits a signed receipt. Signature and continuity checks stay explicit.",
  defaultDetailNodeId: "receipt",
  terminalStaticLines: [
    "$ cat receipt.json",
    "",
    "RECEIPT:   rx-20260312-a7f3",
    "POLICY:    policy:containment:v2",
    "CHAIN:     prev=rx-20260312-e2b1",
    "EXECUTION: sha256:9d5e42...",
    "",
    "SIGNATURE: ed25519:k7x9...",
  ],
  nodes: [
    {
      id: "runbook",
      label: "Runbook",
      detail: {
        title: "Governed runbooks",
        lines: [
          "incident-triage-v3",
          "block-ip-v2",
          "nginx-anomaly-response-v1",
        ],
      },
    },
    {
      id: "policy",
      label: "Gate",
      detail: {
        title: "Authority boundary",
        lines: ["policy: containment:v2", "authority: secops"],
      },
    },
    {
      id: "execution",
      label: "Execute",
      detail: {
        title: "Live execution",
        lines: ["$ witnessops execute incident-triage-v3", "execution: governed"],
      },
    },
    {
      id: "receipt",
      label: "Receipt",
      detail: {
        title: "Receipt emission",
        lines: ["receiptId: rx-20260312-a7f3", "operator: ops-node-2"],
      },
    },
    {
      id: "verify",
      label: "Inspect",
      detail: {
        title: "Receipt check",
        lines: [
          "$ cat receipt.json",
          "receiptId: rx-20260312-a7f3",
          "prevReceipt: rx-20260312-e2b1",
          "executionHash: sha256:9d5e42...",
          "signature: ed25519:k7x9...",
        ],
        emphasis: "signature + continuity visible",
      },
    },
  ],
  seedLedger: [
    {
      id: "rx-20260312-b0c4",
      meta: [
        "runbook: perimeter-baseline-v1",
        "policy: ingress:v1",
        "sig: ed25519",
      ],
      detail: {
        title: "receipt.json",
        lines: [
          "receiptId: rx-20260312-b0c4",
          "prevReceipt: rx-20260312-91aa",
          "signature: ed25519:6a21...",
        ],
      },
    },
    {
      id: "rx-20260312-d11a",
      meta: [
        "runbook: anomaly-sweep-v2",
        "policy: monitor:v2",
        "sig: ed25519",
      ],
      hashLabel: "hash(prev_receipt)",
      detail: {
        title: "receipt.json",
        lines: [
          "receiptId: rx-20260312-d11a",
          "prevReceipt: rx-20260312-b0c4",
          "signature: ed25519:83fd...",
        ],
      },
    },
    {
      id: "rx-20260312-e2b1",
      meta: [
        "runbook: isolate-edge-v2",
        "policy: containment:v2",
        "sig: ed25519",
      ],
      hashLabel: "hash(prev_receipt)",
      detail: {
        title: "receipt.json",
        lines: [
          "receiptId: rx-20260312-e2b1",
          "prevReceipt: rx-20260312-d11a",
          "signature: ed25519:9ce4...",
        ],
      },
    },
  ],
  preview: {
    title: "Active receipt preview",
    lines: [
      "receiptId: rx-20260312-a7f3",
      "runbookId: rb-incident-triage-v3",
      "policyGate: policy:containment:v2",
      "prevReceipt: rx-20260312-e2b1",
      "signature: ed25519:k7x9...",
    ],
  },
  timeline: [
    {
      id: "witnessops-1",
      atMs: 0,
      activateNode: "runbook",
      terminalLine: "runbook: incident-triage-v3",
    },
    {
      id: "witnessops-2",
      atMs: 500,
      activateNode: "policy",
      terminalLine: "policy: containment:v2",
    },
    {
      id: "witnessops-3",
      atMs: 700,
      terminalLine: "authority: secops",
    },
    {
      id: "witnessops-4",
      atMs: 1000,
      activateNode: "execution",
      terminalLine: "$ witnessops execute incident-triage-v3",
    },
    {
      id: "witnessops-5",
      atMs: 1200,
      terminalLine: "execution: governed",
    },
    {
      id: "witnessops-6",
      atMs: 1500,
      activateNode: "receipt",
      emitLedgerBlock: {
        id: "rx-20260312-a7f3",
        meta: [
          "runbook: incident-triage-v3",
          "policy: containment:v2",
          "sig: ed25519",
        ],
        hashLabel: "hash(prev_receipt)",
        detail: {
          title: "receipt.json",
          lines: [
            "receiptId: rx-20260312-a7f3",
            "prevReceipt: rx-20260312-e2b1",
            "operator: ops-node-2",
            "signature: ed25519:k7x9...",
          ],
        },
      },
      terminalLine: "receipt: emitted rx-20260312-a7f3",
    },
    {
      id: "witnessops-7",
      atMs: 2100,
      activateNode: "verify",
      terminalLine: "$ cat receipt.json",
    },
    {
      id: "witnessops-8",
      atMs: 2300,
      terminalLine: "RECEIPT:   rx-20260312-a7f3",
    },
    {
      id: "witnessops-9",
      atMs: 2500,
      terminalLine: "POLICY:    policy:containment:v2",
    },
    {
      id: "witnessops-10",
      atMs: 2700,
      terminalLine: "CHAIN:     prev=rx-20260312-e2b1",
    },
    {
      id: "witnessops-11",
      atMs: 2900,
      terminalLine: "SIGNATURE: ed25519:k7x9...",
    },
    {
      id: "witnessops-12",
      atMs: 3100,
      terminalLine: "EXECUTION: sha256:9d5e42...",
    },
  ],
};
