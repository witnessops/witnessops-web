import {
  listPublishedTier1FreezeV2_1Chain,
  type PublishedTier1ChainEntry,
} from "@witnessops/proof/receipt";

/**
 * UI-only projection of the published Tier 1 chain.
 * This is not the receipt contract and must not invent missing receipt fields.
 */
export interface PublishedReceiptView {
  receiptId: string;
  stage: PublishedTier1ChainEntry["stage"];
  timestamp: string;
  prevReceiptId: string | null;
  runbookId?: string;
  policyGate?: string;
  operator?: string;
  signature?: string;
  status?: string;
  operation?: string;
  executionHash?: string;
  summary?: string;
  sourcePath: string;
}

function readString(
  source: PublishedTier1ChainEntry,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = source[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function toPublishedReceiptView(
  entry: PublishedTier1ChainEntry,
): PublishedReceiptView {
  return {
    receiptId: entry.receiptId,
    stage: entry.stage,
    timestamp: entry.timestamp,
    prevReceiptId: entry.prevReceiptId,
    runbookId: readString(entry, ["runbookId", "runbook_id"]),
    policyGate: readString(entry, ["policyGate", "policy_gate"]),
    operator: readString(entry, ["operator"]),
    signature: readString(entry, ["signature"]),
    status: readString(entry, ["status"]),
    operation: readString(entry, ["operation"]),
    executionHash:
      readString(entry, ["executionHash", "execution_hash", "hash", "artifactHash", "artifact_hash"]),
    summary: readString(entry, ["summary"]),
    sourcePath: entry.sourcePath,
  };
}

export async function listReceipts(): Promise<PublishedReceiptView[]> {
  const chain = await listPublishedTier1FreezeV2_1Chain(process.cwd());
  return chain.map(toPublishedReceiptView);
}

export async function getReceipt(
  receiptId: string,
): Promise<PublishedReceiptView | null> {
  const receipts = await listReceipts();
  return receipts.find((receipt) => receipt.receiptId === receiptId) ?? null;
}
