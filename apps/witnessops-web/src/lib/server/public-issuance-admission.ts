import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  statfs,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { withFilesystemLock } from "./filesystem-lock";
import { getConfiguredEnvPath } from "./storage-config";
import { getAdmissionStoreDir } from "./token-store";

const DAILY_BUDGET_SCHEMA = "witnessops.public-issuance-budget.v1";
const DEFAULT_DAILY_ISSUANCE_LIMIT = 100;
const DEFAULT_MAX_INTAKE_RECORDS = 50_000;
const DEFAULT_MAX_ISSUANCE_RECORDS = 50_000;
const DEFAULT_MAX_EVENT_BYTES = 512 * 1024 * 1024;
const DEFAULT_MIN_FREE_BYTES = 256 * 1024 * 1024;
const RESERVED_EVENT_BYTES = 16 * 1024;
const BUDGET_RETENTION_DAYS = 8;

interface PublicIssuanceBudget {
  schema: typeof DAILY_BUDGET_SCHEMA;
  day: string;
  count: number;
}

export interface PublicIssuanceAdmissionLimits {
  readonly dailyLimit: number;
  readonly maxIntakeRecords: number;
  readonly maxIssuanceRecords: number;
  readonly maxEventBytes: number;
  readonly minFreeBytes: number;
}

export class PublicIssuanceAdmissionError extends Error {
  constructor(
    readonly code:
      | "DAILY_BUDGET_EXHAUSTED"
      | "INTAKE_CAPACITY_REACHED"
      | "ISSUANCE_CAPACITY_REACHED"
      | "EVENT_CAPACITY_REACHED"
      | "LOW_STORAGE_HEADROOM"
      | "BUDGET_STORE_INVALID",
  ) {
    super("Public verification issuance is temporarily unavailable.");
    this.name = "PublicIssuanceAdmissionError";
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function configuredLimits(): PublicIssuanceAdmissionLimits {
  return {
    dailyLimit: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_DAILY_LIMIT,
      DEFAULT_DAILY_ISSUANCE_LIMIT,
    ),
    maxIntakeRecords: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_MAX_INTAKE_RECORDS,
      DEFAULT_MAX_INTAKE_RECORDS,
    ),
    maxIssuanceRecords: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_MAX_ISSUANCE_RECORDS,
      DEFAULT_MAX_ISSUANCE_RECORDS,
    ),
    maxEventBytes: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_MAX_EVENT_BYTES,
      DEFAULT_MAX_EVENT_BYTES,
    ),
    minFreeBytes: positiveInteger(
      process.env.WITNESSOPS_PUBLIC_ISSUANCE_MIN_FREE_BYTES,
      DEFAULT_MIN_FREE_BYTES,
    ),
  };
}

function eventDirectory(): string {
  return (
    getConfiguredEnvPath(
      ["WITNESSOPS_INTAKE_EVENT_DIR", "WITNESSOPS_TOKEN_AUDIT_DIR"],
      "Intake event ledger directory",
    ) ?? path.join(getAdmissionStoreDir(), "events")
  );
}

function currentDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function budgetDirectory(storeDirectory: string): string {
  return path.join(storeDirectory, "public-issuance-budgets");
}

function budgetPath(storeDirectory: string, day: string): string {
  return path.join(budgetDirectory(storeDirectory), `${day}.json`);
}

async function jsonFileCount(directory: string): Promise<number> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .length;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

async function byteSize(filePath: string): Promise<number> {
  try {
    return (await stat(filePath)).size;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return 0;
    throw error;
  }
}

async function assertStorageHeadroom(
  storeDirectory: string,
  limits: PublicIssuanceAdmissionLimits,
): Promise<void> {
  const [intakeCount, issuanceCount, eventBytes, storeFilesystem, eventFilesystem] =
    await Promise.all([
      jsonFileCount(path.join(storeDirectory, "intakes")),
      jsonFileCount(path.join(storeDirectory, "issuances")),
      byteSize(path.join(eventDirectory(), "events.ndjson")),
      statfs(storeDirectory),
      statfs(eventDirectory()),
    ]);

  if (intakeCount + 1 > limits.maxIntakeRecords) {
    throw new PublicIssuanceAdmissionError("INTAKE_CAPACITY_REACHED");
  }
  if (issuanceCount + 1 > limits.maxIssuanceRecords) {
    throw new PublicIssuanceAdmissionError("ISSUANCE_CAPACITY_REACHED");
  }
  if (eventBytes + RESERVED_EVENT_BYTES > limits.maxEventBytes) {
    throw new PublicIssuanceAdmissionError("EVENT_CAPACITY_REACHED");
  }

  const freeBytes = [storeFilesystem, eventFilesystem].map(
    (filesystem) => Number(filesystem.bavail) * Number(filesystem.bsize),
  );
  if (
    freeBytes.some(
      (available) =>
        !Number.isFinite(available) || available < limits.minFreeBytes,
    )
  ) {
    throw new PublicIssuanceAdmissionError("LOW_STORAGE_HEADROOM");
  }
}

async function readBudget(filePath: string, day: string): Promise<PublicIssuanceBudget> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<PublicIssuanceBudget>;
    if (
      parsed.schema !== DAILY_BUDGET_SCHEMA ||
      parsed.day !== day ||
      typeof parsed.count !== "number" ||
      !Number.isSafeInteger(parsed.count) ||
      parsed.count < 0
    ) {
      throw new PublicIssuanceAdmissionError("BUDGET_STORE_INVALID");
    }
    return parsed as PublicIssuanceBudget;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { schema: DAILY_BUDGET_SCHEMA, day, count: 0 };
    }
    throw error;
  }
}

async function writeBudget(filePath: string, budget: PublicIssuanceBudget): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(budget)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(tempPath, filePath);
}

async function pruneExpiredBudgets(directory: string, day: string): Promise<void> {
  const cutoff = new Date(`${day}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - BUDGET_RETENTION_DAYS);
  const cutoffDay = cutoff.toISOString().slice(0, 10);
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          /^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name) &&
          entry.name.slice(0, 10) < cutoffDay,
      )
      .map((entry) => unlink(path.join(directory, entry.name))),
  );
}

/**
 * Reserves one public verification issuance before it can write intake data or
 * contact a mail provider. The budget is intentionally consumed for attempts:
 * a provider timeout is still an outbound quota event and must not become a
 * retry amplifier.
 */
export async function reservePublicIssuanceAdmission(
  limits: PublicIssuanceAdmissionLimits = configuredLimits(),
): Promise<void> {
  const storeDirectory = getAdmissionStoreDir();
  const day = currentDay();
  const budgetsDirectory = budgetDirectory(storeDirectory);

  await withFilesystemLock(
    {
      lockPath: path.join(storeDirectory, "locks", "public-issuance-admission.lock"),
      description: "public verification issuance admission",
    },
    async () => {
      await Promise.all([
        mkdir(budgetsDirectory, { recursive: true, mode: 0o700 }),
        mkdir(eventDirectory(), { recursive: true, mode: 0o700 }),
      ]);
      await pruneExpiredBudgets(budgetsDirectory, day);
      await assertStorageHeadroom(storeDirectory, limits);

      const filePath = budgetPath(storeDirectory, day);
      const budget = await readBudget(filePath, day);
      if (budget.count >= limits.dailyLimit) {
        throw new PublicIssuanceAdmissionError("DAILY_BUDGET_EXHAUSTED");
      }

      await writeBudget(filePath, { ...budget, count: budget.count + 1 });
    },
  );
}
