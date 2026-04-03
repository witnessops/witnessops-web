import { promises as fs } from "node:fs";
import path from "node:path";
import {
  verifyTier1FreezeV2_1R0,
  type Tier1FreezeV2_1VerificationVerdict,
} from "../verify-bundle";

export * from "./canonicalize";
export * from "./emit-v0";
export * from "./hash";
export * from "./r0-adapter";
export * from "./schema";
export * from "./strict-artifacts";
export { verifyTier1FreezeV2_1R0 };
export type { Tier1FreezeV2_1VerificationVerdict };

export type PublishedTier1Stage = "M0" | "E0" | "P1" | "E2" | "R0" | "V0";

export interface PublishedTier1ChainEntry extends Record<string, unknown> {
  stage: PublishedTier1Stage;
  receiptId: string;
  prevReceiptId: string | null;
  timestamp: string;
  sourcePath: string;
}

type UnknownRecord = Record<string, unknown>;

const PUBLISHED_STAGE_ORDER: ReadonlyArray<PublishedTier1Stage> = [
  "M0",
  "E0",
  "P1",
  "E2",
  "R0",
  "V0",
];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(
  source: UnknownRecord,
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

function normalizeStage(entry: UnknownRecord): PublishedTier1Stage | null {
  const raw = getStringField(entry, ["stage", "type", "node"]);
  if (!raw) {
    return null;
  }

  const stage = raw.toUpperCase();
  if (stage === "MX0") {
    return null;
  }

  if (PUBLISHED_STAGE_ORDER.includes(stage as PublishedTier1Stage)) {
    return stage as PublishedTier1Stage;
  }

  return null;
}

function stageOrder(stage: PublishedTier1Stage): number {
  return PUBLISHED_STAGE_ORDER.indexOf(stage);
}

function normalizeEntries(
  raw: unknown,
  sourcePath: string,
): PublishedTier1ChainEntry[] {
  const candidates = (() => {
    if (Array.isArray(raw)) {
      return raw;
    }

    if (!isRecord(raw)) {
      return [];
    }

    const nested =
      raw.chain ??
      raw.publishedChain ??
      raw.published_chain ??
      raw.receipts ??
      raw.nodes ??
      raw.links;

    return Array.isArray(nested) ? nested : [];
  })();

  const normalized: PublishedTier1ChainEntry[] = [];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const stage = normalizeStage(candidate);
    if (!stage) {
      continue;
    }

    const receiptId =
      getStringField(candidate, ["receiptId", "receipt_id", "id"]) ??
      `${stage.toLowerCase()}-published`;

    const prevReceiptId =
      getStringField(candidate, ["prevReceiptId", "prev_receipt_id", "prevReceipt", "prev_receipt"]) ??
      null;

    const timestamp =
      getStringField(candidate, ["timestamp", "createdAt", "created_at", "publishedAt", "published_at"]) ??
      "";

    normalized.push({
      ...candidate,
      stage,
      receiptId,
      prevReceiptId,
      timestamp,
      sourcePath,
    });
  }

  return normalized.sort((left, right) => stageOrder(left.stage) - stageOrder(right.stage));
}

async function resolvePublishedChainsDir(baseDir: string): Promise<string> {
  const candidates = [
    path.resolve(baseDir, "../../proofs/offsec/chains"),
    path.resolve(baseDir, "proofs/offsec/chains"),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return candidates[0];
}

function selectPublishedChainFile(fileNames: string[]): string | null {
  const jsonFiles = fileNames
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  if (jsonFiles.length === 0) {
    return null;
  }

  const explicit = jsonFiles.find((name) => name === "published-chain.json");
  if (explicit) {
    return explicit;
  }

  return jsonFiles[jsonFiles.length - 1];
}

export async function listPublishedTier1FreezeV2_1Chain(
  baseDir = process.cwd(),
): Promise<PublishedTier1ChainEntry[]> {
  const chainsDir = await resolvePublishedChainsDir(baseDir);

  let entries: string[];
  try {
    entries = await fs.readdir(chainsDir);
  } catch {
    return [];
  }

  const chainFile = selectPublishedChainFile(entries);
  if (!chainFile) {
    return [];
  }

  const filePath = path.join(chainsDir, chainFile);
  let parsed: unknown;
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  return normalizeEntries(
    parsed,
    path.posix.join("proofs/offsec/chains", chainFile),
  );
}
